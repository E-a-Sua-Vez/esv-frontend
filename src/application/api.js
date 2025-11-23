import axios from 'axios';
import { globalStore } from '../stores';
import { getCurrentUser } from './firebase';
import { handleApiError } from './errorHandler';

const backendURL = import.meta.env.VITE_BACKEND_URL;
const eventURL = import.meta.env.VITE_EVENT_URL;
const queryURL = import.meta.env.VITE_QUERY_URL;

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

// Add error interceptor (non-breaking - only handles errors)
requestBackend.interceptors.response.use(
  response => response, // Success - no change to existing behavior
  error => {
    // Only handle errors, don't change success flow
    const errorInfo = handleApiError(error, 'Backend API');

    // Log for debugging (can be removed in production)
    if (import.meta.env.DEV) {
      console.error('API Error:', errorInfo);
    }

    // Return error for component to handle (maintains current behavior)
    return Promise.reject(error);
  }
);

export { requestBackend, requestEvent, requestQuery, getHeaders };
