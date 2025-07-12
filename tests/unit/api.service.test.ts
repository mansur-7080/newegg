import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { apiService } from '../../frontend/web-app/src/services/api';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('should login successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            user: {
              id: 'user123',
              email: 'test@example.com',
              firstName: 'John',
              lastName: 'Doe',
            },
            tokens: {
              accessToken: 'access_token_123',
              refreshToken: 'refresh_token_123',
            },
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await apiService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe('test@example.com');
      expect(result.data?.tokens.accessToken).toBe('access_token_123');
    });

    it('should handle login error', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password',
            },
          },
        },
      };

      mockedAxios.post.mockRejectedValue(mockError);

      await expect(
        apiService.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow();
    });

    it('should register successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            user: {
              id: 'user123',
              email: 'new@example.com',
              firstName: 'Jane',
              lastName: 'Doe',
            },
            tokens: {
              accessToken: 'access_token_123',
              refreshToken: 'refresh_token_123',
            },
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await apiService.register({
        email: 'new@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe('new@example.com');
    });
  });

  describe('Products', () => {
    it('should get products successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            products: [
              {
                id: 'prod1',
                name: 'Test Product',
                price: 100,
                description: 'Test description',
              },
            ],
            total: 1,
            page: 1,
            totalPages: 1,
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await apiService.getProducts(1, 10);

      expect(result.success).toBe(true);
      expect(result.data?.products).toHaveLength(1);
      expect(result.data?.products[0].name).toBe('Test Product');
    });

    it('should get product by ID', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            product: {
              id: 'prod1',
              name: 'Test Product',
              price: 100,
              description: 'Test description',
            },
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await apiService.getProduct('prod1');

      expect(result.success).toBe(true);
      expect(result.data?.product.id).toBe('prod1');
    });

    it('should search products', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            products: [
              {
                id: 'prod1',
                name: 'Search Result',
                price: 100,
              },
            ],
            total: 1,
            page: 1,
            totalPages: 1,
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await apiService.searchProducts('test');

      expect(result.success).toBe(true);
      expect(result.data?.products).toHaveLength(1);
    });
  });

  describe('Cart', () => {
    it('should get cart successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            cart: {
              id: 'cart123',
              items: [
                {
                  id: 'item1',
                  productId: 'prod1',
                  quantity: 2,
                  price: 100,
                },
              ],
              total: 200,
            },
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await apiService.getCart();

      expect(result.success).toBe(true);
      expect(result.data?.cart.items).toHaveLength(1);
    });

    it('should add item to cart', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            cart: {
              id: 'cart123',
              items: [
                {
                  id: 'item1',
                  productId: 'prod1',
                  quantity: 1,
                  price: 100,
                },
              ],
              total: 100,
            },
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await apiService.addToCart('prod1', 1);

      expect(result.success).toBe(true);
      expect(result.data?.cart.items).toHaveLength(1);
    });

    it('should update cart item', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            cart: {
              id: 'cart123',
              items: [
                {
                  id: 'item1',
                  productId: 'prod1',
                  quantity: 3,
                  price: 100,
                },
              ],
              total: 300,
            },
          },
        },
      };

      mockedAxios.put.mockResolvedValue(mockResponse);

      const result = await apiService.updateCartItem('prod1', 3);

      expect(result.success).toBe(true);
      expect(result.data?.cart.items[0].quantity).toBe(3);
    });

    it('should remove item from cart', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            cart: {
              id: 'cart123',
              items: [],
              total: 0,
            },
          },
        },
      };

      mockedAxios.delete.mockResolvedValue(mockResponse);

      const result = await apiService.removeFromCart('prod1');

      expect(result.success).toBe(true);
      expect(result.data?.cart.items).toHaveLength(0);
    });
  });

  describe('User Profile', () => {
    it('should get user profile', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            user: {
              id: 'user123',
              email: 'test@example.com',
              firstName: 'John',
              lastName: 'Doe',
            },
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await apiService.getProfile();

      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe('test@example.com');
    });

    it('should update user profile', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            user: {
              id: 'user123',
              email: 'test@example.com',
              firstName: 'John Updated',
              lastName: 'Doe',
            },
          },
        },
      };

      mockedAxios.put.mockResolvedValue(mockResponse);

      const result = await apiService.updateProfile({
        firstName: 'John Updated',
      });

      expect(result.success).toBe(true);
      expect(result.data?.user.firstName).toBe('John Updated');
    });
  });

  describe('Categories and Brands', () => {
    it('should get categories', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            categories: ['Electronics', 'Clothing', 'Books'],
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await apiService.getCategories();

      expect(result.success).toBe(true);
      expect(result.data?.categories).toHaveLength(3);
    });

    it('should get brands', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            brands: ['Apple', 'Samsung', 'Sony'],
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await apiService.getBrands();

      expect(result.success).toBe(true);
      expect(result.data?.brands).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(apiService.getProducts()).rejects.toThrow('Network error');
    });

    it('should handle 401 errors and refresh token', async () => {
      // Mock localStorage to return a refresh token
      const mockLocalStorage = {
        getItem: vi.fn((key) => {
          if (key === 'refreshToken') return 'refresh_token_123';
          return null;
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });

      // First call returns 401
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 401 },
        config: { _retry: false },
      });

      // Refresh token call succeeds
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          data: {
            tokens: {
              accessToken: 'new_access_token',
              refreshToken: 'new_refresh_token',
            },
          },
        },
      });

      // Second call succeeds
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: { products: [] },
        },
      });

      const result = await apiService.getProducts();

      expect(result.success).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('accessToken', 'new_access_token');
    });
  });
});