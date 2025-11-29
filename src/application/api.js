import axios from 'axios';
import { globalStore } from '../stores';
import { getCurrentUser } from './firebase';
import { handleApiError } from './errorHandler';

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
          // If refresh fails, handle as normal error
          const errorInfo = handleApiError(error, apiName);
          if (errorInfo.shouldLogout) {
            // Could trigger logout here if needed
            console.warn('[API] Token refresh failed, user may need to re-authenticate');
          }
          return Promise.reject(error);
        }
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
