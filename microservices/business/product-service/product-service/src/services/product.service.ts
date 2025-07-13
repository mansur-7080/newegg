import { Product, Category, Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { logger } from '../shared';
import { 
  CreateProductDto,
  UpdateProductDto,
  ProductQueryParams,
  ProductStatus,
  ProductWithCategory,
  PaginatedProducts
} from '../models/product.model';

const prisma = new PrismaClient();

// Initialize Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

export class ProductService {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly PRODUCT_CACHE_PREFIX = 'product:';
  private readonly PRODUCTS_CACHE_PREFIX = 'products:';
  private readonly CATEGORY_CACHE_PREFIX = 'category:';

  /**
   * Get all products with pagination and filtering
   */
  async getProducts(queryParams: ProductQueryParams): Promise<PaginatedProducts> {
    try {
      // Generate cache key based on query parameters
      const cacheKey = this.generateProductsCacheKey(queryParams);
      
      // Try to get from cache first
      const cachedData = await this.getFromCache(cacheKey);
      if (cachedData) {
        logger.info('Products retrieved from cache', { cacheKey });
        return JSON.parse(cachedData);
      }

      const { page = 1, limit = 20, search, category, brand, minPrice, maxPrice, status, isActive, isFeatured, sortBy = 'createdAt', sortOrder = 'desc', tags } = queryParams;

      // Build where clause
      const where: Prisma.ProductWhereInput = {
        isActive: isActive !== undefined ? isActive : true,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(category && { categoryId: category }),
        ...(brand && { brand: { contains: brand, mode: 'insensitive' } }),
        ...(minPrice && { price: { gte: minPrice } }),
        ...(maxPrice && { price: { lte: maxPrice } }),
        ...(status && { status }),
        ...(isFeatured !== undefined && { isFeatured }),
        ...(tags && tags.length > 0 && {
          tags: {
            hasSome: tags,
          },
        }),
      };

      // Build order by clause
      const orderBy: Prisma.ProductOrderByWithRelationInput = {
        [sortBy]: sortOrder,
      };

      // Execute query with pagination
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            category: true,
            images: true,
            reviews: {
              select: {
                rating: true,
              },
            },
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy,
        }),
        prisma.product.count({ where }),
      ]);

      // Calculate average rating for each product
      const productsWithRating = products.map(product => {
        const avgRating = product.reviews.length > 0
          ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
          : 0;

        return {
          ...product,
          averageRating: Math.round(avgRating * 10) / 10,
          reviewCount: product.reviews.length,
          reviews: undefined, // Remove reviews from response
        };
      });

      const result: PaginatedProducts = {
        items: productsWithRating,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      };

      // Cache the result
      await this.setCache(cacheKey, JSON.stringify(result), this.CACHE_TTL);

      logger.info('Products retrieved from database', {
        count: productsWithRating.length,
        page,
        total,
        cacheKey,
      });

      return result;
    } catch (error) {
      logger.error('Error retrieving products:', error);
      throw error;
    }
  }

  /**
   * Get a single product by ID
   */
  async getProductById(id: string): Promise<ProductWithCategory> {
    try {
      // Try to get from cache first
      const cacheKey = `${this.PRODUCT_CACHE_PREFIX}${id}`;
      const cachedData = await this.getFromCache(cacheKey);
      
      if (cachedData) {
        logger.info('Product retrieved from cache', { id, cacheKey });
        return JSON.parse(cachedData);
      }

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          category: true,
          images: true,
          reviews: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 10, // Limit to latest 10 reviews
          },
        },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Calculate average rating
      const avgRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
        : 0;

      const result = {
        ...product,
        averageRating: Math.round(avgRating * 10) / 10,
        reviewCount: product.reviews.length,
      };

      // Cache the result
      await this.setCache(cacheKey, JSON.stringify(result), this.CACHE_TTL);

      logger.info('Product retrieved from database', { id, cacheKey });
      return result;
    } catch (error) {
      logger.error('Error retrieving product:', error);
      throw error;
    }
  }

  /**
   * Get a single product by slug
   */
  async getProductBySlug(slug: string): Promise<ProductWithCategory> {
    try {
      // Try to get from cache first
      const cacheKey = `${this.PRODUCT_CACHE_PREFIX}slug:${slug}`;
      const cachedData = await this.getFromCache(cacheKey);
      
      if (cachedData) {
        logger.info('Product retrieved from cache', { slug, cacheKey });
        return JSON.parse(cachedData);
      }

      const product = await prisma.product.findUnique({
        where: { slug },
        include: {
          category: true,
          images: true,
          reviews: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 10,
          },
        },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Calculate average rating
      const avgRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
        : 0;

      const result = {
        ...product,
        averageRating: Math.round(avgRating * 10) / 10,
        reviewCount: product.reviews.length,
      };

      // Cache the result
      await this.setCache(cacheKey, JSON.stringify(result), this.CACHE_TTL);

      logger.info('Product retrieved from database', { slug, cacheKey });
      return result;
    } catch (error) {
      logger.error('Error retrieving product by slug:', error);
      throw error;
    }
  }

  /**
   * Create a new product
   */
  async createProduct(productData: CreateProductDto, userId: string): Promise<Product> {
    try {
      const product = await prisma.product.create({
        data: {
          ...productData,
          createdBy: userId,
          updatedBy: userId,
        },
        include: {
          category: true,
        },
      });

      // Invalidate related caches
      await this.invalidateProductCaches();

      logger.info('Product created successfully', { id: product.id, userId });
      return product;
    } catch (error) {
      logger.error('Error creating product:', error);
      throw error;
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(id: string, productData: UpdateProductDto, userId: string): Promise<Product> {
    try {
      const product = await prisma.product.update({
        where: { id },
        data: {
          ...productData,
          updatedBy: userId,
          updatedAt: new Date(),
        },
        include: {
          category: true,
        },
      });

      // Invalidate related caches
      await this.invalidateProductCaches(id);

      logger.info('Product updated successfully', { id, userId });
      return product;
    } catch (error) {
      logger.error('Error updating product:', error);
      throw error;
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: string, userId: string): Promise<void> {
    try {
      await prisma.product.update({
        where: { id },
        data: {
          isActive: false,
          updatedBy: userId,
          updatedAt: new Date(),
        },
      });

      // Invalidate related caches
      await this.invalidateProductCaches(id);

      logger.info('Product deleted successfully', { id, userId });
    } catch (error) {
      logger.error('Error deleting product:', error);
      throw error;
    }
  }

  /**
   * Generate cache key for products query
   */
  private generateProductsCacheKey(queryParams: ProductQueryParams): string {
    const params = new URLSearchParams();
    
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, String(value));
        }
      }
    });

    return `${this.PRODUCTS_CACHE_PREFIX}${params.toString()}`;
  }

  /**
   * Get data from cache
   */
  private async getFromCache(key: string): Promise<string | null> {
    try {
      return await redis.get(key);
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * Set data in cache
   */
  private async setCache(key: string, value: string, ttl: number): Promise<void> {
    try {
      await redis.setex(key, ttl, value);
    } catch (error) {
      logger.error('Redis set error:', error);
    }
  }

  /**
   * Invalidate product caches
   */
  private async invalidateProductCaches(productId?: string): Promise<void> {
    try {
      const keys = await redis.keys(`${this.PRODUCT_CACHE_PREFIX}*`);
      const productKeys = await redis.keys(`${this.PRODUCTS_CACHE_PREFIX}*`);
      
      if (productId) {
        // Invalidate specific product cache
        await redis.del(`${this.PRODUCT_CACHE_PREFIX}${productId}`);
        await redis.del(`${this.PRODUCT_CACHE_PREFIX}slug:*`);
      } else {
        // Invalidate all product caches
        if (keys.length > 0) {
          await redis.del(...keys);
        }
        if (productKeys.length > 0) {
          await redis.del(...productKeys);
        }
      }

      logger.info('Product caches invalidated', { productId });
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
  }
}
