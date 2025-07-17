import { ProductService } from '../services/productService';
import { ProductRepository } from '../repositories/product-repository';
import { CategoryRepository } from '../repositories/category-repository';
import { AppError } from '../shared';
import { Prisma, PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import db from '../lib/database';
import { Types } from 'mongoose';

// Mock models first
jest.mock('../models/Product');
jest.mock('../models/Category');
jest.mock('../models/Review');

// Mock mongoose
jest.mock('mongoose', () => {
  const mockProductInstance = {
    save: jest.fn().mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      name: 'Test Product',
    }),
    _id: '507f1f77bcf86cd799439011',
  };

  const MockProduct = jest.fn().mockImplementation(() => mockProductInstance);
  MockProduct.find = jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({
      skip: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
  });
  MockProduct.findById = jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(null),
  });
  MockProduct.findByIdAndUpdate = jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(null),
  });
  MockProduct.findByIdAndDelete = jest.fn().mockResolvedValue(null);
  MockProduct.countDocuments = jest.fn().mockResolvedValue(0);
  MockProduct.create = jest.fn().mockResolvedValue({});
  MockProduct.findOne = jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(null),
  });

  return {
    Schema: jest.fn().mockImplementation(() => ({
      index: jest.fn(),
      pre: jest.fn(),
      virtual: jest.fn(() => ({ get: jest.fn() })),
      Types: {
        ObjectId: jest.fn(),
      },
    })),
    model: jest.fn().mockReturnValue(MockProduct),
    connect: jest.fn().mockResolvedValue(undefined),
    connection: {
      readyState: 1,
    },
    Types: {
      ObjectId: jest.fn().mockImplementation((id) => ({
        toString: () => id || '507f1f77bcf86cd799439011',
      })),
    },
    default: {
      Schema: jest.fn().mockImplementation(() => ({
        index: jest.fn(),
        pre: jest.fn(),
        virtual: jest.fn(() => ({ get: jest.fn() })),
        Types: {
          ObjectId: jest.fn(),
        },
      })),
      model: jest.fn().mockReturnValue(MockProduct),
      Types: {
        ObjectId: jest.fn().mockImplementation((id) => ({
          toString: () => id || '507f1f77bcf86cd799439011',
        })),
      },
    },
  };
});

// Test constants with valid ObjectIds
const VALID_PRODUCT_ID = new Types.ObjectId().toString();
const VALID_CATEGORY_ID = new Types.ObjectId().toString();
const VALID_USER_ID = new Types.ObjectId().toString();
const NON_EXISTENT_ID = new Types.ObjectId().toString();
const INVALID_CATEGORY_ID = new Types.ObjectId().toString();
const ANOTHER_USER_ID = new Types.ObjectId().toString();
const SECOND_PRODUCT_ID = new Types.ObjectId().toString();
const SECOND_CATEGORY_ID = new Types.ObjectId().toString();

// Mock repositories
jest.mock('../repositories/product-repository');
jest.mock('../repositories/category-repository');

// Mock database client
jest.mock('../lib/database', () => ({
  executeWithTransaction: jest.fn(),
  prisma: {
    product: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// Mock decimal
jest.mock('@prisma/client', () => {
  const originalModule = jest.requireActual('@prisma/client');
  return {
    ...originalModule,
    Prisma: {
      ...originalModule.Prisma,
      Decimal: class {
        private value: number;
        constructor(value: number) {
          this.value = value;
        }
        toString(): string {
          return String(this.value);
        }
      },
    },
  };
});

describe('ProductService', () => {
  let productService: ProductService;
  let mockProductRepository: jest.Mocked<ProductRepository>;
  let mockCategoryRepository: jest.Mocked<CategoryRepository>;
  let mockDbClient: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockProductRepository = new ProductRepository() as jest.Mocked<ProductRepository>;
    mockCategoryRepository = new CategoryRepository() as jest.Mocked<CategoryRepository>;

    // Mock database transaction
    const mockTransaction = jest.fn().mockImplementation(async (callback) => {
      return await callback({ product: { create: jest.fn() } });
    });

    (db.executeWithTransaction as jest.Mock) = mockTransaction;

    // Create the service with mocked repositories
    productService = new ProductService();
    (productService as any).productRepository = mockProductRepository;
    (productService as any).categoryRepository = mockCategoryRepository;
  });

  describe('getProducts', () => {
    it('should return products with pagination', async () => {
      // Mock data
      const mockProducts = [
        {
          id: VALID_PRODUCT_ID,
          name: 'Product 1',
          slug: 'product-1',
          price: new Prisma.Decimal(100),
          category: { id: VALID_CATEGORY_ID, name: 'Category 1', slug: 'category-1' },
        },
        {
          id: SECOND_PRODUCT_ID,
          name: 'Product 2',
          slug: 'product-2',
          price: new Prisma.Decimal(200),
          category: { id: SECOND_CATEGORY_ID, name: 'Category 2', slug: 'category-2' },
        },
      ];

      // Setup mocks
      mockProductRepository.findMany.mockResolvedValue(mockProducts as any);
      mockProductRepository.count.mockResolvedValue(2);

      // Call the service
      const result = await productService.getProducts({
        page: 1,
        limit: 10,
        filters: {},
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      // Assert results
      expect(result.items.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);

      // Check repository calls
      expect(mockProductRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should apply search filters correctly', async () => {
      // Setup mocks
      mockProductRepository.findMany.mockResolvedValue([]);
      mockProductRepository.count.mockResolvedValue(0);

      // Call with search parameters
      await productService.getProducts({
        page: 1,
        limit: 10,
        filters: {
          search: 'test',
          minPrice: 10,
          maxPrice: 100,
          category: 'category-id',
          brand: 'test-brand',
        },
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      // Verify search filters are applied
      expect(mockProductRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
            categoryId: 'category-id',
            brand: 'test-brand',
            price: { gte: 10, lte: 100 },
            isActive: true,
          }),
        })
      );
    });
  });

  describe('getProductById', () => {
    it('should return a product when found', async () => {
      // Mock data
      const mockProduct = {
        id: VALID_PRODUCT_ID,
        name: 'Test Product',
        slug: 'test-product',
        price: new Prisma.Decimal(100),
        category: { id: VALID_CATEGORY_ID, name: 'Category 1', slug: 'category-1' },
      };

      // Setup mocks
      mockProductRepository.findUnique.mockResolvedValue(mockProduct as any);

      // Call the service
      const result = await productService.getProductById(VALID_PRODUCT_ID);

      // Assert results
      expect(result).toBeDefined();
      expect(result.id).toBe(VALID_PRODUCT_ID);
      expect(result.name).toBe('Test Product');
      expect(result.price).toBe(100);

      // Check repository call
      expect(mockProductRepository.findUnique).toHaveBeenCalledWith({
        where: { id: VALID_PRODUCT_ID },
        include: expect.objectContaining({
          category: expect.any(Object),
        }),
      });
    });

    it('should throw error when product not found', async () => {
      // Setup mock to return null (not found)
      mockProductRepository.findUnique.mockResolvedValue(null);

      // Assert that it throws
      await expect(productService.getProductById(NON_EXISTENT_ID)).rejects.toThrow(
        new AppError(404, 'Product not found')
      );
    });
  });

  describe('createProduct', () => {
    it('should create a product successfully', async () => {
      // Mock data
      const mockProductData = {
        name: 'New Product',
        categoryId: VALID_CATEGORY_ID,
        price: 299.99,
        sku: 'TEST123',
      };

      const mockCreatedProduct = {
        id: VALID_PRODUCT_ID,
        name: 'New Product',
        slug: 'new-product',
        price: new Prisma.Decimal(299.99),
        sku: 'TEST123',
        category: { id: VALID_CATEGORY_ID, name: 'Category 1', slug: 'category-1' },
      };

      // Setup mocks
      mockCategoryRepository.findUnique.mockResolvedValue({
        id: VALID_CATEGORY_ID,
        name: 'Category 1',
      } as any);
      mockProductRepository.findUnique.mockResolvedValue(null); // No existing product with slug

      // Mock transaction
      (db.executeWithTransaction as jest.Mock).mockImplementation(async (callback) => {
        return mockCreatedProduct;
      });

      // Call the service
      const result = await productService.createProduct(mockProductData as any, VALID_USER_ID);

      // Assert results
      expect(result).toBeDefined();
      expect(result.id).toBe(VALID_PRODUCT_ID);
      expect(result.name).toBe('New Product');
      expect(result.price).toBe(299.99);

      // Verify category was checked
      expect(mockCategoryRepository.findUnique).toHaveBeenCalledWith({
        where: { id: VALID_CATEGORY_ID },
      });
    });

    it('should throw error when category not found', async () => {
      // Setup mock to return null (category not found)
      mockCategoryRepository.findUnique.mockResolvedValue(null);

      // Call and assert
      await expect(
        productService.createProduct(
          { name: 'Test', categoryId: INVALID_CATEGORY_ID, price: 100, sku: 'TEST' } as any,
          VALID_USER_ID
        )
      ).rejects.toThrow(new AppError(400, 'Category not found'));
    });
  });

  describe('updateProduct', () => {
    it('should update a product successfully', async () => {
      // Mock data
      const mockProduct = {
        id: VALID_PRODUCT_ID,
        name: 'Existing Product',
        slug: 'existing-product',
        price: new Prisma.Decimal(100),
        vendorId: VALID_USER_ID,
      };

      const updateData = {
        name: 'Updated Product',
        price: 150,
      };

      const updatedProduct = {
        id: VALID_PRODUCT_ID,
        name: 'Updated Product',
        slug: 'existing-product',
        price: new Prisma.Decimal(150),
        vendorId: VALID_USER_ID,
        category: { id: VALID_CATEGORY_ID, name: 'Category 1', slug: 'category-1' },
      };

      // Setup mocks
      mockProductRepository.findUnique.mockResolvedValue(mockProduct as any);
      mockProductRepository.update.mockResolvedValue(updatedProduct as any);

      // Call the service
      const result = await productService.updateProduct(VALID_PRODUCT_ID, updateData as any, VALID_USER_ID);

      // Assert results
      expect(result).toBeDefined();
      expect(result.id).toBe(VALID_PRODUCT_ID);
      expect(result.name).toBe('Updated Product');
      expect(result.price).toBe(150);

      // Check repository calls
      expect(mockProductRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: VALID_PRODUCT_ID },
          data: expect.objectContaining({
            name: 'Updated Product',
          }),
        })
      );
    });

    it('should throw error when product not found', async () => {
      // Setup mock
      mockProductRepository.findUnique.mockResolvedValue(null);

      // Call and assert
      await expect(
        productService.updateProduct(NON_EXISTENT_ID, { name: 'Updated' }, VALID_USER_ID)
      ).rejects.toThrow(new AppError(404, 'Product not found'));
    });

    it('should throw error when user does not have permission', async () => {
      // Mock data - product owned by another user
      const mockProduct = {
        id: VALID_PRODUCT_ID,
        name: 'Existing Product',
        vendorId: ANOTHER_USER_ID,
      };

      // Setup mock
      mockProductRepository.findUnique.mockResolvedValue(mockProduct as any);

      // Call and assert
      await expect(
        productService.updateProduct(VALID_PRODUCT_ID, { name: 'Updated' }, VALID_USER_ID)
      ).rejects.toThrow(new AppError(403, 'You can only update your own products'));
    });
  });

  describe('deleteProduct', () => {
    it('should delete a product successfully', async () => {
      // Mock data
      const mockProduct = {
        id: VALID_PRODUCT_ID,
        name: 'Product to delete',
        vendorId: VALID_USER_ID,
      };

      const updatedProduct = {
        id: VALID_PRODUCT_ID,
        isActive: false,
        status: 'ARCHIVED',
      };

      // Setup mocks
      mockProductRepository.findUnique.mockResolvedValue(mockProduct as any);
      mockProductRepository.update.mockResolvedValue(updatedProduct as any);

      // Call the service
      await productService.deleteProduct(VALID_PRODUCT_ID, VALID_USER_ID);

      // Check repository calls
      expect(mockProductRepository.update).toHaveBeenCalledWith({
        where: { id: VALID_PRODUCT_ID },
        data: expect.objectContaining({
          isActive: false,
        }),
      });
    });

    it('should throw error when product not found', async () => {
      // Setup mock
      mockProductRepository.findUnique.mockResolvedValue(null);

      // Call and assert
      await expect(productService.deleteProduct(NON_EXISTENT_ID, VALID_USER_ID)).rejects.toThrow(
        new AppError(404, 'Product not found')
      );
    });
  });
});
