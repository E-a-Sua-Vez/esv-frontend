import axios from 'axios';
import { globalStore } from '../stores';
import { getCurrentUser } from './firebase';
import { handleApiError } from './errorHandler';
import { signOut } from './services/auth';
import { USER_TYPES } from '../shared/constants';

const backendURL = import.meta.env.VITE_BACKEND_URL;
const eventURL = import.meta.env.VITE_EVENT_URL;
const queryURL = import.meta.env.VITE_QUERY_URL;

// HTTPS enforcement in production
const validateHttps = url => {
  if (!url) return;
  const environment = import.meta.env.VITE_NODE_ENV || 'local';
  if (environment === 'prod' || environment === 'production') {
    if (url.startsWith('http://') && !url.includes('localhost')) {
      console.error(`[Security] HTTPS required in production. Blocking HTTP request to: ${url}`);
      throw new Error('HTTPS required in production environment');
    }
  }
};

// Validate all URLs
validateHttps(backendURL);
validateHttps(eventURL);
validateHttps(queryURL);

const BACKEND_CONFIG = {
  timeout: 30000,
  baseURL: backendURL,
  contentType: 'application/json',
};

const CONFIG_EVENT = {
  timeout: 30000,
  baseURL: eventURL,
  contentType: 'application/json',
};

const CONFIG_QUERY = {
  timeout: 30000,
  baseURL: queryURL,
  contentType: 'application/json',
};

const requestBackend = axios.create(BACKEND_CONFIG);
const requestEvent = axios.create(CONFIG_EVENT);
const requestQuery = axios.create(CONFIG_QUERY);

// Request interceptor: Automatically inject auth headers
const setupRequestInterceptor = instance => {
  instance.interceptors.request.use(
    async config => {
      const headers = await authHeader();
      config.headers = { ...config.headers, ...headers };
      return config;
    },
    error => Promise.reject(error)
  );
};

// Setup request interceptors for all instances
setupRequestInterceptor(requestBackend);
setupRequestInterceptor(requestEvent);
setupRequestInterceptor(requestQuery);

const authHeader = async () => {
  const environment = import.meta.env.VITE_NODE_ENV || 'local';
  const store = globalStore();
  let tokenToSend = '';
  const actualToken = await getCurrentUser();
  const currentUser = store.getCurrentUser;
  const { active, token } = currentUser || {};
  if (environment !== 'local' && active && token) {
    if (actualToken !== undefined && token !== actualToken) {
      tokenToSend = actualToken;
    } else {
      tokenToSend = token;
    }
    return { Authorization: `Bearer ${tokenToSend}` };
  }
  return {};
};

const getHeaders = async () => ({ headers: await authHeader() });

// Token refresh mechanism
let isRefreshing = false;
let failedQueue = [];
let isLoggingOut = false; // Prevent multiple logout attempts

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const refreshToken = async () => {
  try {
    const newToken = await getCurrentUser();
    if (newToken) {
      processQueue(null, newToken);
      return newToken;
    }
    throw new Error('Failed to refresh token');
  } catch (error) {
    processQueue(error, null);
    throw error;
  }
};

// Response interceptor: Handle token refresh and errors
const setupResponseInterceptor = (instance, apiName) => {
  instance.interceptors.response.use(
    response => response, // Success - no change to existing behavior
    async error => {
      const originalRequest = error.config;

      // Handle 401 Unauthorized - Token expired or invalid
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // If already refreshing, queue this request
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return instance(originalRequest);
            })
            .catch(err => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const newToken = await refreshToken();
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            isRefreshing = false;
            return instance(originalRequest);
          }
        } catch (refreshError) {
          isRefreshing = false;
          // If refresh fails, trigger automatic logout
          const errorInfo = handleApiError(error, apiName);
          if (errorInfo.shouldLogout && !isLoggingOut) {
            isLoggingOut = true;
            console.warn('[API] Token refresh failed, automatically logging out user');

            // Trigger logout asynchronously to avoid blocking the error response
            const store = globalStore();
            const currentUser = store.getCurrentUser;
            const currentUserType = store.getCurrentUserType;

            // Use setTimeout to avoid blocking the current error handling
            setTimeout(async () => {
              try {
                await signOut(currentUser?.email, currentUserType);
                await store.resetSession();

                // Redirect to appropriate login page based on user type
                // Use dynamic import to avoid circular dependencies
                try {
                  const routerModule = await import('../router');
                  const router = routerModule.default;
                  if (currentUserType === USER_TYPES.MASTER) {
                    router.push({ name: 'master-login', replace: true });
                  } else if (currentUserType === USER_TYPES.BUSINESS) {
                    router.push({ name: 'business-login', replace: true });
                  } else if (currentUserType === USER_TYPES.COLLABORATOR) {
                    // For collaborators, redirect to root or specific login
                    router.push({ name: 'root', replace: true });
                  } else {
                    // Default: redirect to root
                    router.push({ name: 'root', replace: true });
                  }
                } catch (routerError) {
                  // Fallback: use window.location if router import fails
                  console.warn('[API] Router import failed, using window.location:', routerError);
                  if (currentUserType === USER_TYPES.MASTER) {
                    window.location.href = '/interno/master/login';
                  } else if (currentUserType === USER_TYPES.BUSINESS) {
                    window.location.href = '/interno/business/login';
                  } else {
                    window.location.href = '/';
                  }
                }
              } catch (logoutError) {
                console.error('[API] Error during automatic logout:', logoutError);
                // Fallback: force page reload to login
                window.location.href = '/';
              } finally {
                isLoggingOut = false;
              }
            }, 100);
          }
          return Promise.reject(error);
        }
      }

      // Suppress 404 errors from Event API - these are expected when resources don't exist yet
      // Event API is used for optional features like lead transitions/history
      // Check this BEFORE calling handleApiError to prevent logging
      if (apiName === 'Event API' && error.response?.status === 404) {
        // Silently fail - don't log or reject, just return empty response
        // This prevents console errors for expected 404s
        return Promise.resolve({ data: { data: [] } });
      }

      // Suppress network errors for silent requests (e.g., pre-validation commerce loading)
      // These are expected when backend is not available and will be handled gracefully
      if (
        originalRequest?._silent &&
        (error.code === 'ERR_NETWORK' || error.message === 'Network Error')
      ) {
        // Silently fail - don't log, just reject so caller can handle it
        return Promise.reject(error);
      }

      // Handle other errors
      const errorInfo = handleApiError(error, apiName);

      // Log for debugging (can be removed in production)
      if (import.meta.env.DEV) {
        console.error(`[${apiName}] Error:`, errorInfo);
      }

      // Return error for component to handle (maintains current behavior)
      return Promise.reject(error);
    }
  );
};

// Setup response interceptors for all instances
setupResponseInterceptor(requestBackend, 'Backend API');
setupResponseInterceptor(requestEvent, 'Event API');
setupResponseInterceptor(requestQuery, 'Query API');

export { requestBackend, requestEvent, requestQuery, getHeaders };
