/**
 * Admin Panel API Service
 * Professional API client for admin panel
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { message } from 'antd';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const API_TIMEOUT = 30000; // 30 seconds

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // Handle 401 errors (token expired)
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('adminRefreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
          localStorage.setItem('adminToken', accessToken);
          localStorage.setItem('adminRefreshToken', newRefreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout admin
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminRefreshToken');
        window.location.href = '/auth/login';
      }
    }

    // Show error message
    if (error.response?.data?.message) {
      message.error(error.response.data.message);
    } else {
      message.error('Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
    }

    return Promise.reject(error);
  }
);

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  isEmailVerified: boolean;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserFilters {
  role?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Product Types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  salePrice?: number;
  imageUrl?: string;
  category: string;
  brand: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  sku: string;
  tags?: string[];
  specifications?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  rating?: number;
  tags?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Order Types
export interface Order {
  id: string;
  userId: string;
  user: User;
  items: OrderItem[];
  total: number;
  status: string;
  paymentStatus: string;
  shippingAddress: Address;
  billingAddress: Address;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number;
  total: number;
}

export interface Address {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
}

export interface OrderFilters {
  status?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Analytics Types
export interface AnalyticsData {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  monthlyRevenue: ChartData[];
  topProducts: Product[];
  recentOrders: Order[];
}

export interface ChartData {
  date: string;
  value: number;
}

// API Service Class
class AdminApiService {
  // Auth endpoints
  async login(credentials: { email: string; password: string }): Promise<ApiResponse<{ user: User; tokens: { accessToken: string; refreshToken: string } }>> {
    const response = await apiClient.post('/api/auth/login', credentials);
    return response.data;
  }

  async logout(): Promise<ApiResponse> {
    const refreshToken = localStorage.getItem('adminRefreshToken');
    const response = await apiClient.post('/api/auth/logout', { refreshToken });
    return response.data;
  }

  async refreshToken(): Promise<ApiResponse<{ tokens: { accessToken: string; refreshToken: string } }>> {
    const refreshToken = localStorage.getItem('adminRefreshToken');
    const response = await apiClient.post('/api/auth/refresh', { refreshToken });
    return response.data;
  }

  // User management endpoints
  async getUsers(
    page: number = 1,
    limit: number = 20,
    filters?: UserFilters
  ): Promise<ApiResponse<PaginatedResponse<User>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const response = await apiClient.get(`/api/admin/users?${params}`);
    return response.data;
  }

  async getUser(id: string): Promise<ApiResponse<{ user: User }>> {
    const response = await apiClient.get(`/api/admin/users/${id}`);
    return response.data;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<ApiResponse<{ user: User }>> {
    const response = await apiClient.put(`/api/admin/users/${id}`, userData);
    return response.data;
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    const response = await apiClient.delete(`/api/admin/users/${id}`);
    return response.data;
  }

  async banUser(id: string): Promise<ApiResponse> {
    const response = await apiClient.post(`/api/admin/users/${id}/ban`);
    return response.data;
  }

  async unbanUser(id: string): Promise<ApiResponse> {
    const response = await apiClient.post(`/api/admin/users/${id}/unban`);
    return response.data;
  }

  // Product management endpoints
  async getProducts(
    page: number = 1,
    limit: number = 20,
    filters?: ProductFilters
  ): Promise<ApiResponse<PaginatedResponse<Product>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const response = await apiClient.get(`/api/admin/products?${params}`);
    return response.data;
  }

  async getProduct(id: string): Promise<ApiResponse<{ product: Product }>> {
    const response = await apiClient.get(`/api/admin/products/${id}`);
    return response.data;
  }

  async createProduct(productData: Partial<Product>): Promise<ApiResponse<{ product: Product }>> {
    const response = await apiClient.post('/api/admin/products', productData);
    return response.data;
  }

  async updateProduct(id: string, productData: Partial<Product>): Promise<ApiResponse<{ product: Product }>> {
    const response = await apiClient.put(`/api/admin/products/${id}`, productData);
    return response.data;
  }

  async deleteProduct(id: string): Promise<ApiResponse> {
    const response = await apiClient.delete(`/api/admin/products/${id}`);
    return response.data;
  }

  // Order management endpoints
  async getOrders(
    page: number = 1,
    limit: number = 20,
    filters?: OrderFilters
  ): Promise<ApiResponse<PaginatedResponse<Order>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const response = await apiClient.get(`/api/admin/orders?${params}`);
    return response.data;
  }

  async getOrder(id: string): Promise<ApiResponse<{ order: Order }>> {
    const response = await apiClient.get(`/api/admin/orders/${id}`);
    return response.data;
  }

  async updateOrderStatus(id: string, status: string): Promise<ApiResponse<{ order: Order }>> {
    const response = await apiClient.put(`/api/admin/orders/${id}/status`, { status });
    return response.data;
  }

  // Analytics endpoints
  async getAnalytics(): Promise<ApiResponse<AnalyticsData>> {
    const response = await apiClient.get('/api/admin/analytics');
    return response.data;
  }

  async getRevenueChart(period: string = 'month'): Promise<ApiResponse<ChartData[]>> {
    const response = await apiClient.get(`/api/admin/analytics/revenue?period=${period}`);
    return response.data;
  }

  // File upload
  async uploadFile(file: File): Promise<ApiResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/api/admin/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // System health check
  async healthCheck(): Promise<ApiResponse> {
    const response = await apiClient.get('/api/admin/health');
    return response.data;
  }
}

// Export singleton instance
export const adminApiService = new AdminApiService();
export default adminApiService;