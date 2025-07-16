/**
 * UltraMarket Cache Service
 * Professional caching service for product data
 */

import { logger } from '@ultramarket/shared/logging/logger';
import { IProduct } from '../models/Product';

// Simple in-memory cache for development/testing
// In production, this should be replaced with Redis
class MemoryCache {
  private cache = new Map<string, { data: any; expiry: number }>();

  set(key: string, value: any, ttlSeconds = 3600): void {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { data: value, expiry });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

const cache = new MemoryCache();

/**
 * Cache a product
 */
export async function cacheProduct(product: IProduct): Promise<void> {
  try {
    const productId = product._id?.toString() || product.id;
    const cacheKey = `product:${productId}`;
    
    // Cache for 1 hour
    cache.set(cacheKey, product, 3600);
    
    // Also cache by slug if available
    if (product.slug) {
      cache.set(`product:slug:${product.slug}`, product, 3600);
    }

    logger.debug('Product cached successfully', {
      productId,
      slug: product.slug,
    });
  } catch (error) {
    logger.error('Error caching product', {
      error: error.message,
      productId: product._id?.toString() || product.id,
    });
  }
}

/**
 * Get cached product by ID
 */
export async function getCachedProduct(id: string): Promise<IProduct | null> {
  try {
    const cacheKey = `product:${id}`;
    const cachedProduct = cache.get(cacheKey);

    if (cachedProduct) {
      logger.debug('Product found in cache', { productId: id });
      return cachedProduct;
    }

    logger.debug('Product not found in cache', { productId: id });
    return null;
  } catch (error) {
    logger.error('Error getting cached product', {
      error: error.message,
      productId: id,
    });
    return null;
  }
}

/**
 * Get cached product by slug
 */
export async function getCachedProductBySlug(slug: string): Promise<IProduct | null> {
  try {
    const cacheKey = `product:slug:${slug}`;
    const cachedProduct = cache.get(cacheKey);

    if (cachedProduct) {
      logger.debug('Product found in cache by slug', { slug });
      return cachedProduct;
    }

    logger.debug('Product not found in cache by slug', { slug });
    return null;
  } catch (error) {
    logger.error('Error getting cached product by slug', {
      error: error.message,
      slug,
    });
    return null;
  }
}

/**
 * Invalidate product cache
 */
export async function invalidateProductCache(id: string, slug?: string): Promise<void> {
  try {
    // Remove by ID
    cache.delete(`product:${id}`);
    
    // Remove by slug if provided
    if (slug) {
      cache.delete(`product:slug:${slug}`);
    }

    logger.debug('Product cache invalidated', { productId: id, slug });
  } catch (error) {
    logger.error('Error invalidating product cache', {
      error: error.message,
      productId: id,
      slug,
    });
  }
}

/**
 * Cache product list
 */
export async function cacheProductList(
  cacheKey: string,
  products: IProduct[],
  ttlSeconds = 600
): Promise<void> {
  try {
    cache.set(cacheKey, products, ttlSeconds);
    logger.debug('Product list cached', { cacheKey, count: products.length });
  } catch (error) {
    logger.error('Error caching product list', {
      error: error.message,
      cacheKey,
    });
  }
}

/**
 * Get cached product list
 */
export async function getCachedProductList(cacheKey: string): Promise<IProduct[] | null> {
  try {
    const cachedList = cache.get(cacheKey);
    if (cachedList) {
      logger.debug('Product list found in cache', { cacheKey });
      return cachedList;
    }
    return null;
  } catch (error) {
    logger.error('Error getting cached product list', {
      error: error.message,
      cacheKey,
    });
    return null;
  }
}

/**
 * Invalidate all product-related cache
 */
export async function invalidateAllProductCache(): Promise<void> {
  try {
    cache.deletePattern('product:*');
    logger.info('All product cache invalidated');
  } catch (error) {
    logger.error('Error invalidating all product cache', {
      error: error.message,
    });
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  size: number;
  hitRate?: number;
}> {
  return {
    size: cache.size(),
  };
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  try {
    cache.clear();
    logger.info('All cache cleared');
  } catch (error) {
    logger.error('Error clearing cache', { error: error.message });
  }
}

export default {
  cacheProduct,
  getCachedProduct,
  getCachedProductBySlug,
  invalidateProductCache,
  cacheProductList,
  getCachedProductList,
  invalidateAllProductCache,
  getCacheStats,
  clearAllCache,
};