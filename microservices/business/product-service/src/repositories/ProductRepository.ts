import { PrismaClient, Prisma } from '@prisma/client';
import { CacheManager } from '../shared/cache';
import { Logger } from '../shared/logger';
import { 
  ProductWithRelations, 
  CreateProductInput, 
  UpdateProductInput,
  ProductFilters,
  ProductSearchOptions,
  ProductListResponse,
  ProductNotFoundError,
  InvalidSkuError
} from '../types/product.types';

/**
 * Professional Product Repository - Real Production Implementation
 * Handles all database operations for products with caching
 */
export class ProductRepository {
  private database: PrismaClient;
  private cache: CacheManager;
  private logger: Logger;
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly CACHE_PREFIX = 'product:';

  constructor(database: PrismaClient, cache: CacheManager) {
    this.database = database;
    this.cache = cache;
    this.logger = new Logger('ProductRepository');
  }

  /**
   * Get products with advanced filtering and pagination
   */
  async getProducts(filters: ProductFilters, options: ProductSearchOptions): Promise<ProductListResponse> {
    try {
      const page = options.page || 1;
      const limit = Math.min(options.limit || 20, 100); // Max 100 items per page
      const skip = (page - 1) * limit;

      // Build cache key
      const cacheKey = `${this.CACHE_PREFIX}list:${JSON.stringify({ filters, options })}`;
      
      // Try cache first
      const cached = await this.cache.get<ProductListResponse>(cacheKey);
      if (cached) {
        this.logger.debug('Products fetched from cache', { cacheKey });
        return cached;
      }

      // Build where clause
      const where: Prisma.ProductWhereInput = this.buildWhereClause(filters);

      // Build include clause
      const include = this.buildIncludeClause(options.include);

      // Build order by clause
      const orderBy = this.buildOrderByClause(options.sortBy, options.sortOrder);

      // Execute queries
      const [products, total] = await Promise.all([
        this.database.product.findMany({
          where,
          include,
          orderBy,
          skip,
          take: limit,
        }),
        this.database.product.count({ where })
      ]);

      const pages = Math.ceil(total / limit);
      const result: ProductListResponse = {
        data: products as ProductWithRelations[],
        products: products as ProductWithRelations[], // Backward compatibility
        total,
        page,
        limit,
        pages,
        hasNextPage: page < pages,
        hasPrevPage: page > 1
      };

      // Cache the result
      await this.cache.setWithTags(cacheKey, result, ['products', 'product-list'], this.CACHE_TTL);
      
      this.logger.info('Products fetched from database', { total, page, limit });
      return result;

    } catch (error) {
      this.logger.error('Error fetching products', { filters, options, error });
      throw error;
    }
  }

  /**
   * Get product by ID with caching
   */
  async getProductById(id: string): Promise<ProductWithRelations | null> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${id}`;
      
      // Try cache first
      const cached = await this.cache.get<ProductWithRelations>(cacheKey);
      if (cached) {
        this.logger.debug('Product fetched from cache', { id });
        return cached;
      }

      const product = await this.database.product.findUnique({
        where: { id },
        include: {
          category: true,
          brand: true,
          vendor: true,
          images: { orderBy: { sortOrder: 'asc' } },
          variants: { where: { isActive: true } },
          reviews: { 
            where: { isApproved: true },
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!product) {
        return null;
      }

      const productWithRelations = product as ProductWithRelations;
      
      // Cache the result
      await this.cache.setWithTags(cacheKey, productWithRelations, ['products', `product:${id}`], this.CACHE_TTL);
      
      this.logger.debug('Product fetched from database', { id });
      return productWithRelations;

    } catch (error) {
      this.logger.error('Error fetching product by ID', { id, error });
      throw error;
    }
  }

  /**
   * Create new product
   */
  async createProduct(input: CreateProductInput): Promise<ProductWithRelations> {
    try {
      // Check if SKU already exists
      const existingProduct = await this.database.product.findUnique({
        where: { sku: input.sku }
      });

      if (existingProduct) {
        throw new InvalidSkuError(input.sku);
      }

      // Generate slug from name
      const slug = this.generateSlug(input.name);

      const product = await this.database.product.create({
        data: {
          name: input.name,
          sku: input.sku,
          slug,
          description: input.description,
          shortDescription: input.shortDescription,
          categoryId: input.categoryId,
          brandId: input.brandId,
          vendorId: input.vendorId,
          price: input.price,
          compareAtPrice: input.compareAtPrice,
          costPrice: input.costPrice,
          currency: input.currency || 'USD',
          stockQuantity: input.stockQuantity || 0,
          lowStockThreshold: input.lowStockThreshold,
          trackInventory: input.trackInventory || true,
          allowBackorder: input.allowBackorder || false,
          status: input.status || 'DRAFT',
          visibility: input.visibility || 'VISIBLE',
          seoTitle: input.seoTitle,
          seoDescription: input.seoDescription,
          tags: input.tags || [],
          weight: input.weight,
          dimensions: input.dimensions as any, // Cast to any for JSON field
          specifications: input.specifications as any, // Cast to any for JSON field
          publishedAt: input.status === 'ACTIVE' ? new Date() : null
        },
        include: {
          category: true,
          brand: true,
          vendor: true,
          images: { orderBy: { sortOrder: 'asc' } },
          variants: true,
          reviews: true
        }
      });

      const productWithRelations = product as ProductWithRelations;

      // Invalidate related caches
      await this.cache.invalidateByTag('products');
      await this.cache.invalidateByTag('product-list');
      
      this.logger.info('Product created', { id: product.id, sku: product.sku });
      return productWithRelations;

    } catch (error) {
      this.logger.error('Error creating product', { input, error });
      throw error;
    }
  }

  /**
   * Update existing product
   */
  async updateProduct(id: string, input: UpdateProductInput): Promise<ProductWithRelations> {
    try {
      // Check if product exists
      const existingProduct = await this.database.product.findUnique({
        where: { id }
      });

      if (!existingProduct) {
        throw new ProductNotFoundError(id);
      }

      // If status changed to ACTIVE and publishedAt is null, set it
      const updateData: any = { ...input };
      if (input.status === 'ACTIVE' && !existingProduct.publishedAt) {
        updateData.publishedAt = new Date();
      }

      const product = await this.database.product.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          brand: true,
          vendor: true,
          images: { orderBy: { sortOrder: 'asc' } },
          variants: true,
          reviews: true
        }
      });

      const productWithRelations = product as ProductWithRelations;

      // Invalidate caches
      await this.cache.delete(`${this.CACHE_PREFIX}${id}`);
      await this.cache.invalidateByTag('products');
      await this.cache.invalidateByTag('product-list');
      await this.cache.invalidateByTag(`product:${id}`);
      
      this.logger.info('Product updated', { id });
      return productWithRelations;

    } catch (error) {
      this.logger.error('Error updating product', { id, input, error });
      throw error;
    }
  }

  /**
   * Delete product (soft delete by setting status to ARCHIVED)
   */
  async deleteProduct(id: string): Promise<void> {
    try {
      const existingProduct = await this.database.product.findUnique({
        where: { id }
      });

      if (!existingProduct) {
        throw new ProductNotFoundError(id);
      }

      await this.database.product.update({
        where: { id },
        data: { 
          status: 'ARCHIVED',
          visibility: 'HIDDEN'
        }
      });

      // Invalidate caches
      await this.cache.delete(`${this.CACHE_PREFIX}${id}`);
      await this.cache.invalidateByTag('products');
      await this.cache.invalidateByTag('product-list');
      await this.cache.invalidateByTag(`product:${id}`);
      
      this.logger.info('Product deleted (archived)', { id });

    } catch (error) {
      this.logger.error('Error deleting product', { id, error });
      throw error;
    }
  }

  /**
   * Search products with full-text search
   */
  async searchProducts(query: string, options: ProductSearchOptions): Promise<ProductListResponse> {
    try {
      const filters: ProductFilters = {
        search: query
      };
      
      return this.getProducts(filters, options);

    } catch (error) {
      this.logger.error('Error searching products', { query, options, error });
      throw error;
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(categoryId: string, options: ProductSearchOptions): Promise<ProductListResponse> {
    const filters: ProductFilters = { categoryId };
    return this.getProducts(filters, options);
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(options: ProductSearchOptions): Promise<ProductListResponse> {
    try {
      const products = await this.database.product.findMany({
        where: {
          trackInventory: true,
          lowStockThreshold: { not: null },
          OR: [
            {
              stockQuantity: {
                lte: this.database.product.fields.lowStockThreshold
              }
            }
          ]
        },
        include: {
          category: true,
          brand: true,
          vendor: true,
          images: { orderBy: { sortOrder: 'asc' } },
          variants: true,
          reviews: true
        },
        orderBy: { stockQuantity: 'asc' }
      });

      return {
        data: products as ProductWithRelations[],
        products: products as ProductWithRelations[],
        total: products.length,
        page: 1,
        limit: products.length,
        pages: 1,
        hasNextPage: false,
        hasPrevPage: false
      };

    } catch (error) {
      this.logger.error('Error fetching low stock products', { error });
      throw error;
    }
  }

  // Private helper methods

  private buildWhereClause(filters: ProductFilters): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.brandId) {
      where.brandId = filters.brandId;
    }

    if (filters.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.visibility) {
      where.visibility = filters.visibility;
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
      where.stockQuantity = { gt: 0 };
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags
      };
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { tags: { hasSome: [filters.search] } }
      ];
    }

    return where;
  }

  private buildIncludeClause(include?: ProductSearchOptions['include']): Prisma.ProductInclude {
    return {
      category: include?.category !== false,
      brand: include?.brand !== false,
      vendor: include?.vendor !== false,
      images: include?.images !== false ? { orderBy: { sortOrder: 'asc' } } : false,
      variants: include?.variants !== false ? { where: { isActive: true } } : false,
      reviews: include?.reviews !== false ? { 
        where: { isApproved: true },
        orderBy: { createdAt: 'desc' },
        take: 5
      } : false
    };
  }

  private buildOrderByClause(sortBy?: string, sortOrder?: 'asc' | 'desc'): Prisma.ProductOrderByWithRelationInput {
    const order = sortOrder || 'desc';
    
    switch (sortBy) {
      case 'name':
        return { name: order };
      case 'price':
        return { price: order };
      case 'stockQuantity':
        return { stockQuantity: order };
      case 'updatedAt':
        return { updatedAt: order };
      case 'createdAt':
      default:
        return { createdAt: order };
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }
}