import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type { Product, User, ApiResponse, PaginatedResponse } from '../types';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string = 'http://localhost:8000/api';

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Products
  async getProducts(page: number = 1, limit: number = 20): Promise<PaginatedResponse<Product>> {
    try {
      const response = await this.api.get<PaginatedResponse<Product>>('/products', {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      return this.getMockProducts(page, limit);
    }
  }

  async getProductById(id: string): Promise<Product> {
    try {
      const response = await this.api.get<ApiResponse<Product>>(`/products/${id}`);
      return response.data.data;
    } catch (error) {
      return this.getMockProduct(id);
    }
  }

  async searchProducts(query: string): Promise<Product[]> {
    try {
      const response = await this.api.get<ApiResponse<Product[]>>(`/products/search`, {
        params: { q: query }
      });
      return response.data.data;
    } catch (error) {
      return this.getMockProducts(1, 10).data.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase())
      );
    }
  }

  // Auth
  async login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      const response = await this.api.post<ApiResponse<{ user: User; token: string }>>('/auth/login', {
        email,
        password
      });
      return response.data;
    } catch (error) {
      // Mock login
      return {
        success: true,
        data: {
          user: {
            id: '1',
            name: 'John Doe',
            email: email,
          },
          token: 'mock-token-123'
        }
      };
    }
  }

  async register(name: string, email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      const response = await this.api.post<ApiResponse<{ user: User; token: string }>>('/auth/register', {
        name,
        email,
        password
      });
      return response.data;
    } catch (error) {
      // Mock register
      return {
        success: true,
        data: {
          user: {
            id: '1',
            name: name,
            email: email,
          },
          token: 'mock-token-123'
        }
      };
    }
  }

  // Mock data methods
  private getMockProducts(page: number, limit: number): PaginatedResponse<Product> {
    const mockProducts: Product[] = [
      {
        id: '1',
        name: 'iPhone 15 Pro Max 256GB',
        price: 15000000,
        originalPrice: 16000000,
        image: 'https://via.placeholder.com/300x200?text=iPhone+15',
        description: 'Apple iPhone 15 Pro Max - eng yangi flagman smartfon.',
        category: 'smartphones',
        brand: 'Apple',
        rating: 4.8,
        reviewCount: 245,
        inStock: true,
        specifications: {
          'Ekran': '6.7 inch Super Retina XDR',
          'Protsessor': 'A17 Pro',
          'Xotira': '256GB',
          'Kamera': '48MP Pro'
        }
      },
      {
        id: '2',
        name: 'Samsung Galaxy S24 Ultra',
        price: 14500000,
        image: 'https://via.placeholder.com/300x200?text=Galaxy+S24',
        description: 'Samsung Galaxy S24 Ultra - S Pen bilan professional smartfon.',
        category: 'smartphones',
        brand: 'Samsung',
        rating: 4.7,
        reviewCount: 189,
        inStock: true,
        specifications: {
          'Ekran': '6.8 inch Dynamic AMOLED',
          'Protsessor': 'Snapdragon 8 Gen 3',
          'Xotira': '256GB',
          'Kamera': '200MP'
        }
      },
      {
        id: '3',
        name: 'MacBook Air M3 13-inch',
        price: 18000000,
        image: 'https://via.placeholder.com/300x200?text=MacBook+Air',
        description: 'Apple MacBook Air M3 - yangi avlod ultrabook.',
        category: 'laptops',
        brand: 'Apple',
        rating: 4.9,
        reviewCount: 156,
        inStock: true,
        specifications: {
          'Protsessor': 'Apple M3',
          'RAM': '8GB',
          'SSD': '256GB',
          'Ekran': '13.3 inch Retina'
        }
      }
    ];

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedData = mockProducts.slice(start, end);

    return {
      data: paginatedData,
      total: mockProducts.length,
      page,
      limit,
      totalPages: Math.ceil(mockProducts.length / limit)
    };
  }

  private getMockProduct(id: string): Product {
    const products = this.getMockProducts(1, 10).data;
    return products.find(p => p.id === id) || products[0];
  }
}

export const apiService = new ApiService();
export default apiService;