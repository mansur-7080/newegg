import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { AdvancedCacheService } from '../utils/advanced-cache.service';
import { RedisService } from '../utils/redis.service';

const prisma = new PrismaClient();

export interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  slug: string;
  category: string;
  brand: string | null;
  price: number;
  originalPrice: number | null;
  discount: number | null;
  stock: number;
  images: any;
  specifications: any;
  tags: any;
  vendorId: string | null;
  isFeatured: boolean;
  isActive: boolean;
  isDeleted: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ProductFilters {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isFeatured?: boolean;
  tags?: string[];
  search?: string;
  vendorId?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductQueryOptions extends PaginationOptions {
  filters?: ProductFilters;
  includeDeleted?: boolean;
}

export interface BulkStockUpdate {
  productId: string;
  newStock: number;
}

export class ProductService {
  private readonly DEFAULT_CACHE_TTL = 3600; // 1 hour
  private readonly PRODUCT_CACHE_PREFIX = 'product:';
  private readonly PRODUCTS_LIST_CACHE_PREFIX = 'products:list:';
  private cacheService: AdvancedCacheService;
  private redisService: RedisService;

  constructor() {
    this.cacheService = new AdvancedCacheService();
    this.redisService = new RedisService();
  }

  /**
   * Create a new product
   */
  async createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    try {
      // Validate required fields
      const validationErrors = this.validateProduct(productData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Check if SKU already exists
      const existingProduct = await prisma.product.findUnique({
        where: { sku: productData.sku },
      });

      if (existingProduct) {
        throw new Error(`Product with SKU ${productData.sku} already exists`);
      }

      // Generate slug if not provided
      const slug = productData.slug || this.generateSlug(productData.name);

      // Create product
      const product = await prisma.product.create({
        data: {
          ...productData,
          slug,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Invalidate cache
      await this.invalidateProductCaches(product.category);

      // Index in search engine
      await this.indexProductInSearch(product);

      logger.info('Product created successfully', {
        productId: product.id,
        sku: product.sku,
        name: product.name,
      });

      return product;
    } catch (error) {
      logger.error('Failed to create product', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sku: productData.sku,
      });
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(productId: string, includeDeleted = false): Promise<Product | null> {
    try {
      // Check cache first
      const cacheKey = `${this.PRODUCT_CACHE_PREFIX}${productId}`;
      const cachedProduct = await this.cacheService.get<Product>(cacheKey);
      
      if (cachedProduct) {
        logger.debug('Product retrieved from cache', { productId });
        return cachedProduct;
      }

      // Get from database
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          variants: true,
          images: true,
          reviews: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
          inventory: true,
        },
      });

      if (!product) {
        return null;
      }

      // Check if deleted
      if (product.isDeleted && !includeDeleted) {
        return null;
      }

      // Cache the result
      await this.cacheService.set(cacheKey, product, this.DEFAULT_CACHE_TTL);

      logger.debug('Product retrieved from database', { productId });
      return product;
    } catch (error) {
      logger.error('Failed to get product by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId,
      });
      throw error;
    }
  }

  /**
   * Get product by SKU
   */
  async getProductBySku(sku: string): Promise<Product | null> {
    try {
      const product = await prisma.product.findUnique({
        where: { sku },
        include: {
          variants: true,
          images: true,
          inventory: true,
        },
      });

      if (!product || product.isDeleted) {
        return null;
      }

      return product;
    } catch (error) {
      logger.error('Failed to get product by SKU', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sku,
      });
      throw error;
    }
  }

  /**
   * Get products with filtering and pagination
   */
  async getProducts(options: ProductQueryOptions = {}): Promise<{
    products: Product[];
    total: number;
    pages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        filters = {},
        includeDeleted = false,
      } = options;

      // Check cache first
      const cacheKey = this.buildListCacheKey(options);
      const cachedResult = await this.cacheService.get<{
        products: Product[];
        total: number;
        pages: number;
      }>(cacheKey);

      if (cachedResult) {
        logger.debug('Products retrieved from cache', { options });
        return cachedResult;
      }

      // Build where clause
      const where: any = {};

      if (!includeDeleted) {
        where.isDeleted = false;
      }

      if (filters.category) {
        where.category = filters.category;
      }

      if (filters.brand) {
        where.brand = filters.brand;
      }

      if (filters.minPrice || filters.maxPrice) {
        where.price = {};
        if (filters.minPrice) {
          where.price.gte = filters.minPrice;
        }
        if (filters.maxPrice) {
          where.price.lte = filters.maxPrice;
        }
      }

      if (filters.inStock) {
        where.inventory = {
          some: {
            quantity: {
              gt: 0,
            },
          },
        };
      }

      if (filters.isFeatured) {
        where.isFeatured = true;
      }

      if (filters.tags && filters.tags.length > 0) {
        where.tags = {
          hasSome: filters.tags,
        };
      }

      if (filters.vendorId) {
        where.vendorId = filters.vendorId;
      }

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { sku: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Get total count
      const total = await prisma.product.count({ where });

      // Get products
      const products = await prisma.product.findMany({
        where,
        include: {
          variants: true,
          images: true,
          inventory: true,
          reviews: {
            take: 3,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      });

      const pages = Math.ceil(total / limit);

      const result = {
        products,
        total,
        pages,
      };

      // Cache the result
      await this.cacheService.set(cacheKey, result, this.DEFAULT_CACHE_TTL);

      logger.debug('Products retrieved from database', {
        count: products.length,
        total,
        page,
        limit,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get products', {
        error: error instanceof Error ? error.message : 'Unknown error',
        options,
      });
      throw error;
    }
  }

  /**
   * Update product
   */
  async updateProduct(productId: string, updateData: Partial<Product>): Promise<Product> {
    try {
      // Get existing product
      const existingProduct = await this.getProductById(productId);
      if (!existingProduct) {
        throw new Error('Product not found');
      }

      // Validate update data
      const validationErrors = this.validateProductUpdate(updateData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Check SKU uniqueness if being updated
      if (updateData.sku && updateData.sku !== existingProduct.sku) {
        const existingBySku = await prisma.product.findUnique({
          where: { sku: updateData.sku },
        });

        if (existingBySku) {
          throw new Error(`Product with SKU ${updateData.sku} already exists`);
        }
      }

      // Update slug if name is being updated
      if (updateData.name && updateData.name !== existingProduct.name) {
        updateData.slug = this.generateSlug(updateData.name);
      }

      // Update product
      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
        include: {
          variants: true,
          images: true,
          inventory: true,
        },
      });

      // Invalidate cache
      await this.invalidateProductCaches(updatedProduct.category);
      await this.cacheService.del(`${this.PRODUCT_CACHE_PREFIX}${productId}`);

      // Update search index
      await this.indexProductInSearch(updatedProduct);

      logger.info('Product updated successfully', {
        productId,
        changes: Object.keys(updateData),
      });

      return updatedProduct;
    } catch (error) {
      logger.error('Failed to update product', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId,
      });
      throw error;
    }
  }

  /**
   * Soft delete product
   */
  async deleteProduct(productId: string): Promise<void> {
    try {
      const product = await this.getProductById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Soft delete
      await prisma.product.update({
        where: { id: productId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Invalidate cache
      await this.invalidateProductCaches(product.category);
      await this.cacheService.del(`${this.PRODUCT_CACHE_PREFIX}${productId}`);

      // Remove from search index
      await this.removeProductFromSearch(productId);

      logger.info('Product soft deleted', { productId });
    } catch (error) {
      logger.error('Failed to delete product', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId,
      });
      throw error;
    }
  }

  /**
   * Permanently delete product
   */
  async permanentlyDeleteProduct(productId: string): Promise<void> {
    try {
      const product = await this.getProductById(productId, true);
      if (!product) {
        throw new Error('Product not found');
      }

      // Delete related records first
      await prisma.productVariant.deleteMany({
        where: { productId },
      });

      await prisma.productImage.deleteMany({
        where: { productId },
      });

      await prisma.inventory.deleteMany({
        where: { productId },
      });

      await prisma.review.deleteMany({
        where: { productId },
      });

      // Delete product
      await prisma.product.delete({
        where: { id: productId },
      });

      // Invalidate cache
      await this.invalidateProductCaches(product.category);
      await this.cacheService.del(`${this.PRODUCT_CACHE_PREFIX}${productId}`);

      // Remove from search index
      await this.removeProductFromSearch(productId);

      logger.info('Product permanently deleted', { productId });
    } catch (error) {
      logger.error('Failed to permanently delete product', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId,
      });
      throw error;
    }
  }

  /**
   * Bulk update stock
   */
  async bulkUpdateStock(updates: BulkStockUpdate[]): Promise<void> {
    try {
      const updatePromises = updates.map(async (update) => {
        // Update inventory
        await prisma.inventory.updateMany({
          where: { productId: update.productId },
          data: {
            quantity: update.newStock,
            updatedAt: new Date(),
          },
        });

        // Invalidate product cache
        await this.cacheService.del(`${this.PRODUCT_CACHE_PREFIX}${update.productId}`);
      });

      await Promise.all(updatePromises);

      // Invalidate list caches
      await this.invalidateProductCaches();

      logger.info('Bulk stock update completed', {
        count: updates.length,
      });
    } catch (error) {
      logger.error('Failed to bulk update stock', {
        error: error instanceof Error ? error.message : 'Unknown error',
        count: updates.length,
      });
      throw error;
    }
  }

  /**
   * Search products
   */
  async searchProducts(query: string, options: PaginationOptions = {}): Promise<{
    products: Product[];
    total: number;
    pages: number;
  }> {
    try {
      const { page = 1, limit = 20 } = options;

      // Use full-text search
      const products = await prisma.product.findMany({
        where: {
          isDeleted: false,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { sku: { contains: query, mode: 'insensitive' } },
            { tags: { hasSome: query.split(' ') } },
          ],
        },
        include: {
          variants: true,
          images: true,
          inventory: true,
        },
        orderBy: [
          { isFeatured: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      });

      const total = await prisma.product.count({
        where: {
          isDeleted: false,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { sku: { contains: query, mode: 'insensitive' } },
            { tags: { hasSome: query.split(' ') } },
          ],
        },
      });

      const pages = Math.ceil(total / limit);

      logger.debug('Product search completed', {
        query,
        count: products.length,
        total,
      });

      return {
        products,
        total,
        pages,
      };
    } catch (error) {
      logger.error('Failed to search products', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query,
      });
      throw error;
    }
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit = 10): Promise<Product[]> {
    try {
      const cacheKey = `${this.PRODUCTS_LIST_CACHE_PREFIX}featured:${limit}`;
      const cached = await this.cacheService.get<Product[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const products = await prisma.product.findMany({
        where: {
          isFeatured: true,
          isDeleted: false,
          isActive: true,
        },
        include: {
          variants: true,
          images: true,
          inventory: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      await this.cacheService.set(cacheKey, products, this.DEFAULT_CACHE_TTL);

      return products;
    } catch (error) {
      logger.error('Failed to get featured products', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(threshold = 10): Promise<Product[]> {
    try {
      const products = await prisma.product.findMany({
        where: {
          isDeleted: false,
          inventory: {
            some: {
              quantity: {
                lte: threshold,
              },
            },
          },
        },
        include: {
          inventory: true,
          variants: true,
        },
        orderBy: { updatedAt: 'desc' },
      });

      return products;
    } catch (error) {
      logger.error('Failed to get low stock products', {
        error: error instanceof Error ? error.message : 'Unknown error',
        threshold,
      });
      throw error;
    }
  }

  /**
   * Validate product data
   */
  private validateProduct(product: any): string[] {
    const errors: string[] = [];

    if (!product.name || product.name.trim().length === 0) {
      errors.push('Product name is required');
    }

    if (!product.sku || product.sku.trim().length === 0) {
      errors.push('Product SKU is required');
    }

    if (!product.category || product.category.trim().length === 0) {
      errors.push('Product category is required');
    }

    if (!product.price || product.price <= 0) {
      errors.push('Product price must be greater than 0');
    }

    if (product.originalPrice && product.originalPrice <= 0) {
      errors.push('Original price must be greater than 0');
    }

    if (product.discount && (product.discount < 0 || product.discount > 100)) {
      errors.push('Discount must be between 0 and 100');
    }

    return errors;
  }

  /**
   * Validate product update data
   */
  private validateProductUpdate(product: any): string[] {
    const errors: string[] = [];

    if (product.name !== undefined && (!product.name || product.name.trim().length === 0)) {
      errors.push('Product name cannot be empty');
    }

    if (product.sku !== undefined && (!product.sku || product.sku.trim().length === 0)) {
      errors.push('Product SKU cannot be empty');
    }

    if (product.price !== undefined && product.price <= 0) {
      errors.push('Product price must be greater than 0');
    }

    if (product.originalPrice !== undefined && product.originalPrice <= 0) {
      errors.push('Original price must be greater than 0');
    }

    if (product.discount !== undefined && (product.discount < 0 || product.discount > 100)) {
      errors.push('Discount must be between 0 and 100');
    }

    return errors;
  }

  /**
   * Generate slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Build cache key for product list
   */
  private buildListCacheKey(options: ProductQueryOptions): string {
    const key = `${this.PRODUCTS_LIST_CACHE_PREFIX}${JSON.stringify(options)}`;
    return key;
  }

  /**
   * Invalidate product caches
   */
  private async invalidateProductCaches(category?: string): Promise<void> {
    try {
      // Invalidate list caches
      await this.cacheService.delByPattern(`${this.PRODUCTS_LIST_CACHE_PREFIX}*`);

      // Invalidate category-specific caches if category provided
      if (category) {
        await this.cacheService.delByPattern(`*category:${category}*`);
      }
    } catch (error) {
      logger.error('Failed to invalidate product caches', {
        error: error instanceof Error ? error.message : 'Unknown error',
        category,
      });
    }
  }

  /**
   * Index product in search engine
   */
  private async indexProductInSearch(product: Product): Promise<void> {
    try {
      // Index in Elasticsearch or search service
      await this.redisService.publish('product:index', {
        productId: product.id,
        action: 'index',
        data: product,
      });

      logger.debug('Product indexed in search', {
        productId: product.id,
      });
    } catch (error) {
      logger.error('Failed to index product in search', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId: product.id,
      });
    }
  }

  /**
   * Remove product from search index
   */
  private async removeProductFromSearch(productId: string): Promise<void> {
    try {
      await this.redisService.publish('product:index', {
        productId,
        action: 'remove',
      });

      logger.debug('Product removed from search index', {
        productId,
      });
    } catch (error) {
      logger.error('Failed to remove product from search index', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId,
      });
    }
  }
}
