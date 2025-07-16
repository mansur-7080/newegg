/**
 * Product Service - Prisma Based
 * Professional business logic layer with validation and caching
 */

import { ProductRepository } from '../repositories/product.repository';
import { AdvancedCacheService } from '../utils/advanced-cache.service';
import { logger } from '../utils/logger';
import {
  ProductWithRelations,
  CreateProductInput,
  UpdateProductInput,
  ProductFilters,
  PaginationOptions,
  ProductQueryResult,
  ProductStatistics,
  ProductStatus,
  PRODUCT_CONSTRAINTS,
} from '../models/product.model';

export class ProductService {
  private repository: ProductRepository;
  private cache: AdvancedCacheService;

  constructor() {
    this.repository = new ProductRepository();
    this.cache = new AdvancedCacheService();
  }

  /**
   * Create a new product
   */
  async createProduct(data: CreateProductInput, userId?: string): Promise<ProductWithRelations> {
    // Validate input
    this.validateProductInput(data);

    // Check if SKU already exists
    const skuExists = await this.repository.skuExists(data.sku);
    if (skuExists) {
      throw new Error(`Product with SKU "${data.sku}" already exists`);
    }

    // Generate slug if not provided
    if (!data.slug) {
      data.slug = this.generateSlug(data.name);
    }

    // Set vendor ID if provided
    if (userId) {
      data.vendorId = userId;
    }

    // Set default values
    const productData: CreateProductInput = {
      ...data,
      currency: data.currency || 'USD',
      status: data.status || ProductStatus.DRAFT,
      isActive: data.isActive !== undefined ? data.isActive : true,
    };

    try {
      const product = await this.repository.create(productData);

      // Invalidate related caches
      await this.invalidateProductCaches(product.categoryId);

      logger.info('Product created successfully', {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        vendorId: userId,
      });

      return product;
    } catch (error) {
      logger.error('Failed to create product', { error, data });
      throw new Error(`Failed to create product: ${error.message}`);
    }
  }

  /**
   * Get product by ID with caching
   */
  async getProductById(id: string): Promise<ProductWithRelations | null> {
    const cacheKey = `product:${id}`;

    try {
      // Try to get from cache first
      const cached = await this.cache.get<ProductWithRelations>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from database
      const product = await this.repository.findById(id);
      if (product) {
        // Cache for 1 hour
        await this.cache.set(cacheKey, product, 3600, [`product:${id}`, 'products']);
      }

      return product;
    } catch (error) {
      logger.error('Failed to get product by ID', { error, id });
      throw new Error(`Failed to get product: ${error.message}`);
    }
  }

  /**
   * Get product by slug with caching
   */
  async getProductBySlug(slug: string): Promise<ProductWithRelations | null> {
    const cacheKey = `product:slug:${slug}`;

    try {
      // Try to get from cache first
      const cached = await this.cache.get<ProductWithRelations>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from database
      const product = await this.repository.findBySlug(slug);
      if (product) {
        // Cache for 1 hour
        await this.cache.set(cacheKey, product, 3600, [`product:${product.id}`, 'products']);
      }

      return product;
    } catch (error) {
      logger.error('Failed to get product by slug', { error, slug });
      throw new Error(`Failed to get product: ${error.message}`);
    }
  }

  /**
   * Get products with filtering and pagination
   */
  async getProducts(
    filters: ProductFilters,
    pagination: PaginationOptions
  ): Promise<ProductQueryResult> {
    const cacheKey = `products:${JSON.stringify({ filters, pagination })}`;

    try {
      // Try to get from cache first
      const cached = await this.cache.get<ProductQueryResult>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from database
      const result = await this.repository.findMany(filters, pagination);

      // Cache for 15 minutes
      await this.cache.set(cacheKey, result, 900, ['products']);

      return result;
    } catch (error) {
      logger.error('Failed to get products', { error, filters, pagination });
      throw new Error(`Failed to get products: ${error.message}`);
    }
  }

  /**
   * Update product
   */
  async updateProduct(
    id: string,
    data: UpdateProductInput,
    userId?: string
  ): Promise<ProductWithRelations> {
    // Validate input
    this.validateProductUpdateInput(data);

    // Check if product exists
    const existingProduct = await this.repository.findById(id);
    if (!existingProduct) {
      throw new Error(`Product with ID "${id}" not found`);
    }

    // Check ownership if vendor
    if (userId && existingProduct.vendorId && existingProduct.vendorId !== userId) {
      throw new Error('You can only update your own products');
    }

    // Check SKU uniqueness if being updated
    if (data.sku && data.sku !== existingProduct.sku) {
      const skuExists = await this.repository.skuExists(data.sku, id);
      if (skuExists) {
        throw new Error(`Product with SKU "${data.sku}" already exists`);
      }
    }

    try {
      const updatedProduct = await this.repository.update(id, data);

      // Invalidate caches
      await this.invalidateProductCaches(updatedProduct.categoryId, id);

      logger.info('Product updated successfully', {
        productId: id,
        updatedFields: Object.keys(data),
        userId,
      });

      return updatedProduct;
    } catch (error) {
      logger.error('Failed to update product', { error, id, data });
      throw new Error(`Failed to update product: ${error.message}`);
    }
  }

  /**
   * Delete product (soft delete)
   */
  async deleteProduct(id: string, userId?: string): Promise<void> {
    // Check if product exists
    const existingProduct = await this.repository.findById(id);
    if (!existingProduct) {
      throw new Error(`Product with ID "${id}" not found`);
    }

    // Check ownership if vendor
    if (userId && existingProduct.vendorId && existingProduct.vendorId !== userId) {
      throw new Error('You can only delete your own products');
    }

    try {
      await this.repository.delete(id);

      // Invalidate caches
      await this.invalidateProductCaches(existingProduct.categoryId, id);

      logger.info('Product deleted successfully', { productId: id, userId });
    } catch (error) {
      logger.error('Failed to delete product', { error, id });
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  }

  /**
   * Search products
   */
  async searchProducts(query: string, limit: number = 20): Promise<ProductWithRelations[]> {
    if (!query.trim()) {
      return [];
    }

    const cacheKey = `search:${query}:${limit}`;

    try {
      // Try to get from cache first
      const cached = await this.cache.get<ProductWithRelations[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Search in database
      const products = await this.repository.search(query, limit);

      // Cache for 10 minutes
      await this.cache.set(cacheKey, products, 600, ['search', 'products']);

      return products;
    } catch (error) {
      logger.error('Failed to search products', { error, query });
      throw new Error(`Failed to search products: ${error.message}`);
    }
  }

  /**
   * Get product statistics
   */
  async getProductStatistics(): Promise<ProductStatistics> {
    const cacheKey = 'product:statistics';

    try {
      // Try to get from cache first
      const cached = await this.cache.get<ProductStatistics>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from database
      const stats = await this.repository.getStatistics();

      // Cache for 30 minutes
      await this.cache.set(cacheKey, stats, 1800, ['statistics']);

      return stats;
    } catch (error) {
      logger.error('Failed to get product statistics', { error });
      throw new Error(`Failed to get product statistics: ${error.message}`);
    }
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit: number = 10): Promise<ProductWithRelations[]> {
    const filters: ProductFilters = {
      isFeatured: true,
      isActive: true,
      status: ProductStatus.ACTIVE,
    };

    const pagination: PaginationOptions = {
      page: 1,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    try {
      const result = await this.getProducts(filters, pagination);
      return result.data;
    } catch (error) {
      logger.error('Failed to get featured products', { error });
      throw new Error(`Failed to get featured products: ${error.message}`);
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(
    categoryId: string,
    pagination: PaginationOptions
  ): Promise<ProductQueryResult> {
    const filters: ProductFilters = {
      categoryId,
      isActive: true,
      status: ProductStatus.ACTIVE,
    };

    try {
      return await this.getProducts(filters, pagination);
    } catch (error) {
      logger.error('Failed to get products by category', { error, categoryId });
      throw new Error(`Failed to get products by category: ${error.message}`);
    }
  }

  /**
   * Bulk update products
   */
  async bulkUpdateProducts(
    ids: string[],
    data: Partial<UpdateProductInput>,
    userId?: string
  ): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    // Validate each product ownership if vendor
    if (userId) {
      for (const id of ids) {
        const product = await this.repository.findById(id);
        if (product && product.vendorId && product.vendorId !== userId) {
          throw new Error(`You can only update your own products (Product ID: ${id})`);
        }
      }
    }

    try {
      const count = await this.repository.bulkUpdate(ids, data);

      // Invalidate caches
      await this.cache.deleteByTag('products');

      logger.info('Products bulk updated successfully', { count, productIds: ids, userId });

      return count;
    } catch (error) {
      logger.error('Failed to bulk update products', { error, ids, data });
      throw new Error(`Failed to bulk update products: ${error.message}`);
    }
  }

  /**
   * Validate product input
   */
  private validateProductInput(data: CreateProductInput): void {
    const errors: string[] = [];

    // Name validation
    if (!data.name || data.name.trim().length < PRODUCT_CONSTRAINTS.NAME.MIN_LENGTH) {
      errors.push(`Name must be at least ${PRODUCT_CONSTRAINTS.NAME.MIN_LENGTH} characters`);
    }
    if (data.name && data.name.length > PRODUCT_CONSTRAINTS.NAME.MAX_LENGTH) {
      errors.push(`Name must not exceed ${PRODUCT_CONSTRAINTS.NAME.MAX_LENGTH} characters`);
    }

    // SKU validation
    if (!data.sku || data.sku.trim().length < PRODUCT_CONSTRAINTS.SKU.MIN_LENGTH) {
      errors.push(`SKU must be at least ${PRODUCT_CONSTRAINTS.SKU.MIN_LENGTH} characters`);
    }
    if (data.sku && data.sku.length > PRODUCT_CONSTRAINTS.SKU.MAX_LENGTH) {
      errors.push(`SKU must not exceed ${PRODUCT_CONSTRAINTS.SKU.MAX_LENGTH} characters`);
    }

    // Price validation
    if (!data.price || data.price < PRODUCT_CONSTRAINTS.PRICE.MIN) {
      errors.push(`Price must be at least ${PRODUCT_CONSTRAINTS.PRICE.MIN}`);
    }
    if (data.price && data.price > PRODUCT_CONSTRAINTS.PRICE.MAX) {
      errors.push(`Price must not exceed ${PRODUCT_CONSTRAINTS.PRICE.MAX}`);
    }

    // Description validation
    if (data.description && data.description.length > PRODUCT_CONSTRAINTS.DESCRIPTION.MAX_LENGTH) {
      errors.push(`Description must not exceed ${PRODUCT_CONSTRAINTS.DESCRIPTION.MAX_LENGTH} characters`);
    }

    // Tags validation
    if (data.tags) {
      if (data.tags.length > PRODUCT_CONSTRAINTS.TAGS.MAX_COUNT) {
        errors.push(`Maximum ${PRODUCT_CONSTRAINTS.TAGS.MAX_COUNT} tags allowed`);
      }
      for (const tag of data.tags) {
        if (tag.length > PRODUCT_CONSTRAINTS.TAGS.MAX_LENGTH_PER_TAG) {
          errors.push(`Tag "${tag}" exceeds maximum length of ${PRODUCT_CONSTRAINTS.TAGS.MAX_LENGTH_PER_TAG} characters`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate product update input
   */
  private validateProductUpdateInput(data: UpdateProductInput): void {
    const errors: string[] = [];

    // Name validation
    if (data.name !== undefined) {
      if (data.name.trim().length < PRODUCT_CONSTRAINTS.NAME.MIN_LENGTH) {
        errors.push(`Name must be at least ${PRODUCT_CONSTRAINTS.NAME.MIN_LENGTH} characters`);
      }
      if (data.name.length > PRODUCT_CONSTRAINTS.NAME.MAX_LENGTH) {
        errors.push(`Name must not exceed ${PRODUCT_CONSTRAINTS.NAME.MAX_LENGTH} characters`);
      }
    }

    // Price validation
    if (data.price !== undefined) {
      if (data.price < PRODUCT_CONSTRAINTS.PRICE.MIN) {
        errors.push(`Price must be at least ${PRODUCT_CONSTRAINTS.PRICE.MIN}`);
      }
      if (data.price > PRODUCT_CONSTRAINTS.PRICE.MAX) {
        errors.push(`Price must not exceed ${PRODUCT_CONSTRAINTS.PRICE.MAX}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Generate slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /**
   * Invalidate product-related caches
   */
  private async invalidateProductCaches(categoryId?: string, productId?: string): Promise<void> {
    const tags = ['products', 'search', 'statistics'];
    
    if (productId) {
      tags.push(`product:${productId}`);
    }
    
    if (categoryId) {
      tags.push(`category:${categoryId}`);
    }

    await this.cache.deleteByTags(tags);
  }
}
