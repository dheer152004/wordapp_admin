import axios from 'axios';

const configuredApiOrigin = process.env.REACT_APP_API_BASE?.trim().replace(/\/+$/, '');
const API_ORIGIN = configuredApiOrigin
  ? (/^https?:\/\//i.test(configuredApiOrigin) ? configuredApiOrigin : `https://${configuredApiOrigin}`)
  : '';
export const API_BASE = `${API_ORIGIN}/api`;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let accessToken = null;
let refreshPromise = null;

export const setAccessToken = (token) => {
  accessToken = token;
};

export const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE}/auth/refresh`, null, { withCredentials: true })
      .then(({ data }) => {
        if (!data?.token) {
          throw new Error('Refresh response did not include an access token');
        }
        setAccessToken(data.token);
        return data.token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

const createIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

api.interceptors.request.use(
  (config) => {
    if (config.method?.toLowerCase() === 'post') {
      config.headers = config.headers || {};
      config.headers['Idempotency-Key'] = config.headers['Idempotency-Key'] || createIdempotencyKey();
    }

    if (accessToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const request = error.config;
      const isAuthEndpoint = /\/auth\/(refresh|logout)(?:\?|$)/.test(request?.url || '');

      if (request && !request._retry && !isAuthEndpoint) {
        request._retry = true;
        try {
          const token = await refreshAccessToken();
          request.headers = request.headers || {};
          request.headers.Authorization = `Bearer ${token}`;
          return api(request);
        } catch (refreshError) {
          setAccessToken(null);
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      if (request?._retry) {
        setAccessToken(null);
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
