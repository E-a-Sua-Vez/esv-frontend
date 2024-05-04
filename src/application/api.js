import axios from 'axios';
import { globalStore } from '../stores';
import { getCurrentUser } from './firebase';

const backendURL = import.meta.env.VITE_BACKEND_URL;
const eventURL = import.meta.env.VITE_EVENT_URL;
const queryURL = import.meta.env.VITE_QUERY_URL;

const BACKEND_CONFIG = {
  timeout: 30000,
  baseURL: backendURL,
  contentType: 'application/json'
};

const CONFIG_EVENT = {
  timeout: 30000,
  baseURL: eventURL,
  contentType: 'application/json'
};

const CONFIG_QUERY = {
  timeout: 30000,
  baseURL: queryURL,
  contentType: 'application/json'
};

const requestBackend = axios.create(BACKEND_CONFIG);
const requestEvent = axios.create(CONFIG_EVENT);
const requestQuery = axios.create(CONFIG_QUERY);

const authHeader = async () => {
  const environment = import.meta.env.VITE_NODE_ENV || 'local';
  const store = globalStore();
  let tokenToSend = '';
  const actualToken = await getCurrentUser();
  const currentUser = await store.getCurrentUser;
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

const getHeaders =  async () => ({ headers: await authHeader() });

export { requestBackend, requestEvent, requestQuery, getHeaders };