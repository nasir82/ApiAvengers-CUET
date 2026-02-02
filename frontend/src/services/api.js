import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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

