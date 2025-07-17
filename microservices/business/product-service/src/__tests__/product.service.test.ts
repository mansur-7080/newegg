import { ProductService } from '../services/productService';
import ProductDatabase from '../database/ProductDatabase';
import { IProduct } from '../models/Product';
import { logger } from '../shared';

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

// Mock the database
jest.mock('../database/ProductDatabase');

// Mock the shared module
jest.mock('../shared', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ProductService', () => {
  let productService: ProductService;
  let mockDatabase: jest.Mocked<ProductDatabase>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create service instance
    productService = new ProductService();

    // Get the mocked database instance
    mockDatabase = ProductDatabase as jest.Mocked<typeof ProductDatabase>;
    
    // Ensure all database methods are mocked
    if (!mockDatabase.getAllProducts) {
      mockDatabase.getAllProducts = jest.fn();
    }
    if (!mockDatabase.getProductById) {
      mockDatabase.getProductById = jest.fn();
    }
    if (!mockDatabase.updateProduct) {
      mockDatabase.updateProduct = jest.fn();
    }
    if (!mockDatabase.deleteProduct) {
      mockDatabase.deleteProduct = jest.fn();
    }
    if (!mockDatabase.createProduct) {
      mockDatabase.createProduct = jest.fn();
    }
  });

  describe('createProduct', () => {
    it('should create a product successfully', async () => {
      const mockProductData: Partial<IProduct> = {
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        brand: 'Test Brand',
        category: 'Electronics',
        quantity: 10,
        tags: ['test'],
        specifications: { color: 'red' },
        images: ['https://example.com/image.jpg'],
      };

      const mockCreatedProduct = {
        _id: '507f1f77bcf86cd799439011',
        ...mockProductData,
        sku: 'TETEST123456',
        rating: { average: 0, count: 0 },
        isActive: true,
        isFeatured: false,
        inStock: true,
        minQuantity: 5,
        reviews: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDatabase.getAllProducts.mockResolvedValue({
        products: [],
        total: 0,
      });

      mockDatabase.createProduct.mockResolvedValue(mockCreatedProduct as any);

      const result = await productService.createProduct(mockProductData);

      expect(mockDatabase.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: mockProductData.name,
          description: mockProductData.description,
          price: mockProductData.price,
          brand: mockProductData.brand,
          category: mockProductData.category,
          quantity: mockProductData.quantity,
          isActive: true,
          isFeatured: false,
          inStock: true,
          rating: { average: 0, count: 0 },
        })
      );

      expect(result).toBeDefined();
      expect(result.name).toBe(mockProductData.name);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Created product'));
    });

    it('should throw error if SKU already exists', async () => {
      const mockProductData: Partial<IProduct> = {
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        brand: 'Test Brand',
        category: 'Electronics',
        quantity: 10,
        sku: 'EXISTING-SKU',
        tags: ['test'],
        specifications: { color: 'red' },
        images: ['https://example.com/image.jpg'],
      };

      const existingProduct = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Existing Product',
        description: 'Existing Description',
        price: 199.99,
        brand: 'Existing Brand',
        category: 'Electronics',
        quantity: 5,
        sku: 'EXISTING-SKU',
        tags: ['existing'],
        specifications: { color: 'blue' },
        images: ['https://example.com/existing.jpg'],
        rating: { average: 0, count: 0 },
        isActive: true,
        isFeatured: false,
        inStock: true,
        minQuantity: 5,
        reviews: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDatabase.getAllProducts.mockResolvedValue({
        products: [existingProduct as any],
        total: 1,
      });

      await expect(productService.createProduct(mockProductData)).rejects.toThrow(
        'Product with this SKU already exists'
      );
    });
  });

  describe('getProductById', () => {
    it('should get product by ID successfully', async () => {
      const mockProduct = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        brand: 'Test Brand',
        category: 'Electronics',
        quantity: 10,
        sku: 'TEST-SKU',
        tags: ['test'],
        specifications: { color: 'red' },
        images: ['https://example.com/image.jpg'],
        rating: { average: 0, count: 0 },
        isActive: true,
        isFeatured: false,
        inStock: true,
        minQuantity: 5,
        reviews: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDatabase.getProductById.mockResolvedValue(mockProduct as any);

      const result = await productService.getProductById('507f1f77bcf86cd799439011');

      expect(mockDatabase.getProductById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toBeDefined();
      expect(result.name).toBe(mockProduct.name);
    });

    it('should throw error if product not found', async () => {
      mockDatabase.getProductById.mockResolvedValue(null);

      await expect(productService.getProductById('nonexistent')).rejects.toThrow(
        'Product not found'
      );
    });
  });

  describe('updateProduct', () => {
    it('should update product successfully', async () => {
      const mockExistingProduct = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        brand: 'Test Brand',
        category: 'Electronics',
        quantity: 10,
        sku: 'TEST-SKU',
        tags: ['test'],
        specifications: { color: 'red' },
        images: ['https://example.com/image.jpg'],
        rating: { average: 0, count: 0 },
        isActive: true,
        isFeatured: false,
        inStock: true,
        minQuantity: 5,
        reviews: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updates = {
        name: 'Updated Product',
        price: 149.99,
      };

      const mockUpdatedProduct = {
        ...mockExistingProduct,
        ...updates,
      };

      mockDatabase.getProductById.mockResolvedValue(mockExistingProduct as any);
      mockDatabase.updateProduct.mockResolvedValue(mockUpdatedProduct as any);

      const result = await productService.updateProduct('507f1f77bcf86cd799439011', updates);

      expect(mockDatabase.updateProduct).toHaveBeenCalledWith('507f1f77bcf86cd799439011', updates);
      expect(result.name).toBe(updates.name);
      expect(result.price).toBe(updates.price);
    });
  });

  describe('searchProducts', () => {
    it('should search products successfully', async () => {
      const mockProducts = [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'Test Product 1',
          description: 'Test Description 1',
          price: 99.99,
          brand: 'Test Brand',
          category: 'Electronics',
          quantity: 10,
          sku: 'TEST-SKU-1',
          tags: ['test'],
          specifications: {},
          images: [],
          rating: { average: 0, count: 0 },
          isActive: true,
          isFeatured: false,
          inStock: true,
          minQuantity: 5,
          reviews: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: '507f1f77bcf86cd799439012',
          name: 'Test Product 2',
          description: 'Test Description 2',
          price: 149.99,
          brand: 'Test Brand',
          category: 'Electronics',
          quantity: 5,
          sku: 'TEST-SKU-2',
          tags: ['test'],
          specifications: {},
          images: [],
          rating: { average: 0, count: 0 },
          isActive: true,
          isFeatured: false,
          inStock: true,
          minQuantity: 5,
          reviews: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDatabase.getAllProducts.mockResolvedValue({
        products: mockProducts as any,
        total: 2,
      });

      const searchOptions = {
        filters: { category: 'Electronics' },
        page: 1,
        limit: 10,
      };

      const result = await productService.searchProducts(searchOptions);

      expect(mockDatabase.getAllProducts).toHaveBeenCalledWith(
        searchOptions.filters,
        searchOptions.page,
        searchOptions.limit
      );
      expect(result.products).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.pages).toBe(1);
      expect(result.currentPage).toBe(1);
    });
  });

  describe('deleteProduct', () => {
    it('should delete product successfully', async () => {
      mockDatabase.deleteProduct.mockResolvedValue(true);

      await productService.deleteProduct('507f1f77bcf86cd799439011');

      expect(mockDatabase.deleteProduct).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Deleted product'));
    });

    it('should throw error if product not found', async () => {
      mockDatabase.deleteProduct.mockResolvedValue(false);

      await expect(productService.deleteProduct('nonexistent')).rejects.toThrow(
        'Product not found'
      );
    });
  });

  describe('getFeaturedProducts', () => {
    it('should get featured products successfully', async () => {
      const mockFeaturedProducts = [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'Featured Product',
          description: 'Featured Description',
          price: 99.99,
          brand: 'Test Brand',
          category: 'Electronics',
          quantity: 10,
          sku: 'FEATURED-SKU',
          tags: ['featured'],
          specifications: {},
          images: [],
          rating: { average: 4.5, count: 10 },
          isActive: true,
          isFeatured: true,
          inStock: true,
          minQuantity: 5,
          reviews: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDatabase.getAllProducts.mockResolvedValue({
        products: mockFeaturedProducts as any,
        total: 1,
      });

      const result = await productService.getFeaturedProducts(5);

      expect(mockDatabase.getAllProducts).toHaveBeenCalledWith(
        { isFeatured: true, isActive: true },
        1,
        5
      );
      expect(result).toHaveLength(1);
      expect(result[0].isFeatured).toBe(true);
    });
  });
});
