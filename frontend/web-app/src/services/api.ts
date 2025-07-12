import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_TIMEOUT = 30000; // 30 seconds

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
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
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
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
  meta?: {
    timestamp: string;
    request_id: string;
    version: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Product Types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
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

// User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isEmailVerified: boolean;
  profileImage?: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

// Cart Types
export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number;
  total: number;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

// API Service Class
class ApiService {
  // Auth endpoints
  async login(credentials: LoginRequest): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  }

  async register(
    userData: RegisterRequest
  ): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  }

  async logout(): Promise<ApiResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await apiClient.post('/auth/logout', { refreshToken });
    return response.data;
  }

  async refreshToken(): Promise<ApiResponse<{ tokens: AuthTokens }>> {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  }

  async verifyToken(): Promise<ApiResponse<{ user: User }>> {
    const response = await apiClient.post('/auth/verify');
    return response.data;
  }

  // Product endpoints
  async getProducts(
    page: number = 1,
    limit: number = 12,
    filters?: ProductFilters
  ): Promise<
    ApiResponse<{ products: Product[]; total: number; page: number; totalPages: number }>
  > {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters && Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      )),
    });

    const response = await apiClient.get(`/products?${params}`);
    return response.data;
  }

  async getProduct(id: string): Promise<ApiResponse<{ product: Product }>> {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  }

  async searchProducts(
    query: string,
    page: number = 1,
    limit: number = 12,
    filters?: ProductFilters
  ): Promise<
    ApiResponse<{ products: Product[]; total: number; page: number; totalPages: number }>
  > {
    const params = new URLSearchParams({
      query,
      page: page.toString(),
      limit: limit.toString(),
      ...(filters && Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      )),
    });

    const response = await apiClient.get(`/search/products?${params}`);
    return response.data;
  }

  // Cart endpoints
  async getCart(): Promise<ApiResponse<{ cart: Cart }>> {
    const response = await apiClient.get('/cart');
    return response.data;
  }

  async addToCart(productId: string, quantity: number = 1): Promise<ApiResponse<{ cart: Cart }>> {
    const response = await apiClient.post('/cart/items', { productId, quantity });
    return response.data;
  }

  async updateCartItem(productId: string, quantity: number): Promise<ApiResponse<{ cart: Cart }>> {
    const response = await apiClient.put(`/cart/items/${productId}`, { quantity });
    return response.data;
  }

  async removeFromCart(productId: string): Promise<ApiResponse<{ cart: Cart }>> {
    const response = await apiClient.delete(`/cart/items/${productId}`);
    return response.data;
  }

  async clearCart(): Promise<ApiResponse> {
    const response = await apiClient.delete('/cart');
    return response.data;
  }

  // User endpoints
  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    const response = await apiClient.get('/auth/me');
    return response.data;
  }

  async updateProfile(userData: Partial<User>): Promise<ApiResponse<{ user: User }>> {
    const response = await apiClient.put('/auth/me', userData);
    return response.data;
  }

  // Category endpoints
  async getCategories(): Promise<ApiResponse<{ categories: string[] }>> {
    const response = await apiClient.get('/categories');
    return response.data;
  }

  async getBrands(): Promise<ApiResponse<{ brands: string[] }>> {
    const response = await apiClient.get('/brands');
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    const response = await apiClient.get('/health');
    return response.data;
  }

  // Additional endpoints for recommended and popular products
  async getRecommendedProducts(): Promise<ApiResponse<Product[]>> {
    const response = await apiClient.get('/products/recommended');
    return response.data;
  }

  async getPopularInCategory(category: string): Promise<ApiResponse<Product[]>> {
    const response = await apiClient.get(`/products/popular?category=${category}`);
    return response.data;
  }
}

export const apiService = new ApiService();
