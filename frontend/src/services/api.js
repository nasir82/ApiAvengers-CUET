import axios from 'axios';

// Relative base: the browser calls the frontend's own origin (e.g. http://localhost:3007/api),
// and nginx (prod) / Vite (dev) proxies /api -> API gateway. Same-origin, no CORS, and no
// dependency on a host port. Override with VITE_API_URL only for non-proxied setups.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Campaign APIs
export const campaignAPI = {
  getAll: (params = {}) => api.get('/campaigns', { params }),
  getById: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', data),
};

// Pledge APIs
export const pledgeAPI = {
  create: (data) => api.post('/pledges', data),
  getById: (id) => api.get(`/pledges/${id}`),
  getUserPledges: (userId, params = {}) => api.get(`/pledges/user/${userId}`, { params }),
  // Donation history for unregistered donors, by the reference they used (e.g. email)
  getByReference: (reference) => api.get(`/pledges/reference/${encodeURIComponent(reference)}`),
};

// Payment APIs
export const paymentAPI = {
  create: (data) => api.post('/payments', data),
  getById: (id) => api.get(`/payments/${id}`),
  webhook: (provider, data) => api.post(`/webhooks/${provider}`, data),
};

// User APIs
export const userAPI = {
  register: (data) => api.post('/users/register', data),
  login: (data) => api.post('/users/login', data),
  getById: (id) => api.get(`/users/${id}`),
};

// Notification APIs
export const notificationAPI = {
  getUserNotifications: (userId, params = {}) => api.get(`/notifications/user/${userId}`, { params }),
};

// Admin APIs
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
};

export default api;

