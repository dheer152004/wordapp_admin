import axios from 'axios';

// const API_BASE = 'https://klugbackend-cdfgbdepaebcdggv.centralindia-01.azurewebsites.net/api';
const API_BASE = 'http://localhost:8082/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

const createIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    if (config.method?.toLowerCase() === 'post') {
      config.headers = config.headers || {};
      config.headers['Idempotency-Key'] = config.headers['Idempotency-Key'] || createIdempotencyKey();
    }

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;