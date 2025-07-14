/**
 * Redis Cache Service for Product Management
 * Professional caching strategy for UltraMarket
 */

import Redis from 'ioredis';
import { logger } from '@ultramarket/shared/logging/logger';

// Initialize Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  db: parseInt(process.env.REDIS_PRODUCT_DB || '1'), // Separate DB for products
});

// Cache key prefixes
const CACHE_KEYS = {
  PRODUCT: 'product:',
  PRODUCTS_LIST: 'products:list:',
  PRODUCT_CATEGORIES: 'products:categories',
  PRODUCT_BRANDS: 'products:brands:',
  PRODUCT_SEARCH: 'products:search:',
  PRODUCT_STATS: 'products:stats:',
} as const;

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
  PRODUCT: 3600, // 1 hour
  PRODUCTS_LIST: 1800, // 30 minutes
  CATEGORIES: 7200, // 2 hours
  BRANDS: 7200, // 2 hours
  SEARCH: 900, // 15 minutes
  STATS: 1800, // 30 minutes
} as const;

/**
 * Cache a single product
 */
export async function cacheProduct(product: any): Promise<void> {
  try {
    const key = `${CACHE_KEYS.PRODUCT}${product.id}`;
    await redis.setex(key, CACHE_TTL.PRODUCT, JSON.stringify(product));
    
    logger.debug('Product cached successfully', {
      productId: product.id,
      key,
      ttl: CACHE_TTL.PRODUCT,
    });
  } catch (error) {
    logger.warn('Failed to cache product', {
      productId: product.id,
      error: error.message,
    });
  }
}

/**
 * Get cached product by ID
 */
export async function getCachedProduct(productId: string): Promise<any | null> {
  try {
    const key = `${CACHE_KEYS.PRODUCT}${productId}`;
    const cached = await redis.get(key);
    
    if (cached) {
      logger.debug('Product retrieved from cache', {
        productId,
        key,
      });
      return JSON.parse(cached);
    }
    
    return null;
  } catch (error) {
    logger.warn('Failed to get cached product', {
      productId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Cache products list with filters
 */
export async function cacheProductsList(
  filterHash: string,
  data: any
): Promise<void> {
  try {
    const key = `${CACHE_KEYS.PRODUCTS_LIST}${filterHash}`;
    await redis.setex(key, CACHE_TTL.PRODUCTS_LIST, JSON.stringify(data));
    
    logger.debug('Products list cached successfully', {
      filterHash,
      key,
      count: data.data?.length || 0,
      ttl: CACHE_TTL.PRODUCTS_LIST,
    });
  } catch (error) {
    logger.warn('Failed to cache products list', {
      filterHash,
      error: error.message,
    });
  }
}

/**
 * Get cached products list
 */
export async function getCachedProductsList(filterHash: string): Promise<any | null> {
  try {
    const key = `${CACHE_KEYS.PRODUCTS_LIST}${filterHash}`;
    const cached = await redis.get(key);
    
    if (cached) {
      logger.debug('Products list retrieved from cache', {
        filterHash,
        key,
      });
      return JSON.parse(cached);
    }
    
    return null;
  } catch (error) {
    logger.warn('Failed to get cached products list', {
      filterHash,
      error: error.message,
    });
    return null;
  }
}

/**
 * Cache product categories
 */
export async function cacheProductCategories(categories: any[]): Promise<void> {
  try {
    const key = CACHE_KEYS.PRODUCT_CATEGORIES;
    await redis.setex(key, CACHE_TTL.CATEGORIES, JSON.stringify(categories));
    
    logger.debug('Product categories cached successfully', {
      count: categories.length,
      key,
      ttl: CACHE_TTL.CATEGORIES,
    });
  } catch (error) {
    logger.warn('Failed to cache product categories', {
      error: error.message,
    });
  }
}

/**
 * Get cached product categories
 */
export async function getCachedProductCategories(): Promise<any[] | null> {
  try {
    const key = CACHE_KEYS.PRODUCT_CATEGORIES;
    const cached = await redis.get(key);
    
    if (cached) {
      logger.debug('Product categories retrieved from cache', { key });
      return JSON.parse(cached);
    }
    
    return null;
  } catch (error) {
    logger.warn('Failed to get cached product categories', {
      error: error.message,
    });
    return null;
  }
}

/**
 * Cache product brands for a category
 */
export async function cacheProductBrands(
  category: string,
  brands: any[]
): Promise<void> {
  try {
    const key = `${CACHE_KEYS.PRODUCT_BRANDS}${category || 'all'}`;
    await redis.setex(key, CACHE_TTL.BRANDS, JSON.stringify(brands));
    
    logger.debug('Product brands cached successfully', {
      category,
      count: brands.length,
      key,
      ttl: CACHE_TTL.BRANDS,
    });
  } catch (error) {
    logger.warn('Failed to cache product brands', {
      category,
      error: error.message,
    });
  }
}

/**
 * Get cached product brands
 */
export async function getCachedProductBrands(category?: string): Promise<any[] | null> {
  try {
    const key = `${CACHE_KEYS.PRODUCT_BRANDS}${category || 'all'}`;
    const cached = await redis.get(key);
    
    if (cached) {
      logger.debug('Product brands retrieved from cache', {
        category,
        key,
      });
      return JSON.parse(cached);
    }
    
    return null;
  } catch (error) {
    logger.warn('Failed to get cached product brands', {
      category,
      error: error.message,
    });
    return null;
  }
}

/**
 * Cache search results
 */
export async function cacheSearchResults(
  searchHash: string,
  results: any
): Promise<void> {
  try {
    const key = `${CACHE_KEYS.PRODUCT_SEARCH}${searchHash}`;
    await redis.setex(key, CACHE_TTL.SEARCH, JSON.stringify(results));
    
    logger.debug('Search results cached successfully', {
      searchHash,
      key,
      count: results.data?.length || 0,
      ttl: CACHE_TTL.SEARCH,
    });
  } catch (error) {
    logger.warn('Failed to cache search results', {
      searchHash,
      error: error.message,
    });
  }
}

/**
 * Get cached search results
 */
export async function getCachedSearchResults(searchHash: string): Promise<any | null> {
  try {
    const key = `${CACHE_KEYS.PRODUCT_SEARCH}${searchHash}`;
    const cached = await redis.get(key);
    
    if (cached) {
      logger.debug('Search results retrieved from cache', {
        searchHash,
        key,
      });
      return JSON.parse(cached);
    }
    
    return null;
  } catch (error) {
    logger.warn('Failed to get cached search results', {
      searchHash,
      error: error.message,
    });
    return null;
  }
}

/**
 * Cache product statistics
 */
export async function cacheProductStats(
  vendorId: string | null,
  stats: any
): Promise<void> {
  try {
    const key = `${CACHE_KEYS.PRODUCT_STATS}${vendorId || 'all'}`;
    await redis.setex(key, CACHE_TTL.STATS, JSON.stringify(stats));
    
    logger.debug('Product statistics cached successfully', {
      vendorId,
      key,
      ttl: CACHE_TTL.STATS,
    });
  } catch (error) {
    logger.warn('Failed to cache product statistics', {
      vendorId,
      error: error.message,
    });
  }
}

/**
 * Get cached product statistics
 */
export async function getCachedProductStats(vendorId?: string): Promise<any | null> {
  try {
    const key = `${CACHE_KEYS.PRODUCT_STATS}${vendorId || 'all'}`;
    const cached = await redis.get(key);
    
    if (cached) {
      logger.debug('Product statistics retrieved from cache', {
        vendorId,
        key,
      });
      return JSON.parse(cached);
    }
    
    return null;
  } catch (error) {
    logger.warn('Failed to get cached product statistics', {
      vendorId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Invalidate product cache
 */
export async function invalidateProductCache(productId: string): Promise<void> {
  try {
    const productKey = `${CACHE_KEYS.PRODUCT}${productId}`;
    
    // Delete product cache
    await redis.del(productKey);
    
    // Delete related caches
    const pattern1 = `${CACHE_KEYS.PRODUCTS_LIST}*`;
    const pattern2 = `${CACHE_KEYS.PRODUCT_SEARCH}*`;
    const pattern3 = `${CACHE_KEYS.PRODUCT_STATS}*`;
    
    const keys = await redis.keys(pattern1);
    const searchKeys = await redis.keys(pattern2);
    const statsKeys = await redis.keys(pattern3);
    
    const allKeys = [...keys, ...searchKeys, ...statsKeys];
    
    if (allKeys.length > 0) {
      await redis.del(...allKeys);
    }
    
    logger.info('Product cache invalidated successfully', {
      productId,
      invalidatedKeys: allKeys.length + 1,
    });
  } catch (error) {
    logger.warn('Failed to invalidate product cache', {
      productId,
      error: error.message,
    });
  }
}

/**
 * Invalidate all product caches
 */
export async function invalidateAllProductCaches(): Promise<void> {
  try {
    const patterns = [
      `${CACHE_KEYS.PRODUCT}*`,
      `${CACHE_KEYS.PRODUCTS_LIST}*`,
      `${CACHE_KEYS.PRODUCT_CATEGORIES}*`,
      `${CACHE_KEYS.PRODUCT_BRANDS}*`,
      `${CACHE_KEYS.PRODUCT_SEARCH}*`,
      `${CACHE_KEYS.PRODUCT_STATS}*`,
    ];
    
    let totalKeys = 0;
    
    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        totalKeys += keys.length;
      }
    }
    
    logger.info('All product caches invalidated successfully', {
      totalKeys,
    });
  } catch (error) {
    logger.warn('Failed to invalidate all product caches', {
      error: error.message,
    });
  }
}

/**
 * Generate cache key hash from object
 */
export function generateCacheHash(obj: any): string {
  const crypto = require('crypto');
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  products: number;
  lists: number;
  searches: number;
  total: number;
}> {
  try {
    const [productKeys, listKeys, searchKeys] = await Promise.all([
      redis.keys(`${CACHE_KEYS.PRODUCT}*`),
      redis.keys(`${CACHE_KEYS.PRODUCTS_LIST}*`),
      redis.keys(`${CACHE_KEYS.PRODUCT_SEARCH}*`),
    ]);
    
    return {
      products: productKeys.length,
      lists: listKeys.length,
      searches: searchKeys.length,
      total: productKeys.length + listKeys.length + searchKeys.length,
    };
  } catch (error) {
    logger.warn('Failed to get cache statistics', {
      error: error.message,
    });
    return { products: 0, lists: 0, searches: 0, total: 0 };
  }
}