import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API endpoints
export const apiClient = {
  // Health check
  health: () => api.get('/health'),

  // Products
  getProducts: (params = {}) => api.get('/api/products', { params }),
  getProduct: (id) => api.get(`/api/products/${id}`),
  searchProducts: (query) => api.get('/api/search', { params: { q: query } }),

  // Categories
  getCategories: () => api.get('/api/categories'),

  // Stores
  getStores: () => api.get('/api/stores'),
  getStore: (id) => api.get(`/api/stores/${id}`),

  // Cart
  getCart: () => api.get('/api/cart'),
  addToCart: (productId, quantity = 1) => 
    api.post('/api/cart', { productId, quantity }),

  // Stats
  getStats: () => api.get('/api/stats'),
  getAnalytics: () => api.get('/api/analytics'),
};

export default apiClient;