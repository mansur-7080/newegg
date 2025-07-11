/**
 * UltraMarket Unified Cache Manager
 * Provides consistent caching strategy across all microservices
 */

import { logger } from '../logging/logger';
import Redis from 'ioredis';

// Cache configuration
interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  maxRetries: number;
  retryDelay: number;
  ttl: number;
}

// Cache entry interface
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
}

// Cache statistics
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
}

// Cache key patterns for different data types
export const CACHE_KEYS = {
  // User data
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  USER_PREFERENCES: (userId: string) => `user:preferences:${userId}`,
  USER_SESSIONS: (userId: string) => `user:sessions:${userId}`,
  
  // Product data
  PRODUCT_DETAILS: (productId: string) => `product:details:${productId}`,
  PRODUCT_LIST: (categoryId: string, page: number) => `product:list:${categoryId}:${page}`,
  PRODUCT_SEARCH: (query: string, filters: string) => `product:search:${query}:${filters}`,
  
  // Order data
  ORDER_DETAILS: (orderId: string) => `order:details:${orderId}`,
  USER_ORDERS: (userId: string, page: number) => `user:orders:${userId}:${page}`,
  
  // Category data
  CATEGORY_TREE: () => 'category:tree',
  CATEGORY_PRODUCTS: (categoryId: string) => `category:products:${categoryId}`,
  
  // System data
  API_RESPONSES: (endpoint: string, params: string) => `api:response:${endpoint}:${params}`,
  CONFIGURATION: (service: string) => `config:${service}`,
  
  // Rate limiting
  RATE_LIMIT: (identifier: string, window: string) => `rate:limit:${identifier}:${window}`,
  
  // Session data
  SESSION: (sessionId: string) => `session:${sessionId}`,
  
  // Analytics
  ANALYTICS: (type: string, date: string) => `analytics:${type}:${date}`,
  
  // Search results
  SEARCH_RESULTS: (query: string, filters: string) => `search:results:${query}:${filters}`,
  
  // Recommendations
  RECOMMENDATIONS: (userId: string, type: string) => `recommendations:${userId}:${type}`,
  
  // Inventory
  INVENTORY_STATUS: (productId: string) => `inventory:status:${productId}`,
  STOCK_LEVELS: (productId: string) => `stock:levels:${productId}`,
  
  // Payment
  PAYMENT_INTENT: (paymentId: string) => `payment:intent:${paymentId}`,
  TRANSACTION_STATUS: (transactionId: string) => `transaction:status:${transactionId}`
} as const;

// Cache TTL values (in seconds)
export const CACHE_TTL = {
  // Short-lived data (1-5 minutes)
  SHORT: 60,
  MEDIUM_SHORT: 300,
  
  // Medium-lived data (10-30 minutes)
  MEDIUM: 600,
  MEDIUM_LONG: 1800,
  
  // Long-lived data (1-6 hours)
  LONG: 3600,
  VERY_LONG: 21600,
  
  // Static data (1-7 days)
  STATIC: 86400,
  VERY_STATIC: 604800,
  
  // Session data
  SESSION: 1800, // 30 minutes
  USER_SESSION: 3600, // 1 hour
  
  // API responses
  API_RESPONSE: 300, // 5 minutes
  API_RESPONSE_LONG: 1800, // 30 minutes
  
  // Product data
  PRODUCT_DETAILS: 3600, // 1 hour
  PRODUCT_LIST: 1800, // 30 minutes
  PRODUCT_SEARCH: 900, // 15 minutes
  
  // User data
  USER_PROFILE: 1800, // 30 minutes
  USER_PREFERENCES: 3600, // 1 hour
  
  // Order data
  ORDER_DETAILS: 1800, // 30 minutes
  USER_ORDERS: 900, // 15 minutes
  
  // Category data
  CATEGORY_TREE: 7200, // 2 hours
  CATEGORY_PRODUCTS: 3600, // 1 hour
  
  // System data
  CONFIGURATION: 3600, // 1 hour
  
  // Rate limiting
  RATE_LIMIT: 60, // 1 minute
  
  // Analytics
  ANALYTICS: 3600, // 1 hour
  
  // Search results
  SEARCH_RESULTS: 1800, // 30 minutes
  
  // Recommendations
  RECOMMENDATIONS: 3600, // 1 hour
  
  // Inventory
  INVENTORY_STATUS: 300, // 5 minutes
  STOCK_LEVELS: 600, // 10 minutes
  
  // Payment
  PAYMENT_INTENT: 1800, // 30 minutes
  TRANSACTION_STATUS: 3600 // 1 hour
} as const;

class UnifiedCacheManager {
  private redis: Redis;
  private config: CacheConfig;
  private stats: CacheStats;
  private version: string;
  private isConnected: boolean = false;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'ultramarket:',
      maxRetries: 3,
      retryDelay: 1000,
      ttl: parseInt(process.env.REDIS_TTL || '3600'),
      ...config
    };

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };

    this.version = process.env.APP_VERSION || '1.0.0';
    this.initializeRedis();
  }

  private initializeRedis(): void {
    try {
      this.redis = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        keyPrefix: this.config.keyPrefix,
        maxRetriesPerRequest: this.config.maxRetries,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        enableReadyCheck: true
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis cache connected successfully');
      });

      this.redis.on('error', (error) => {
        this.isConnected = false;
        this.stats.errors++;
        logger.error('Redis cache error', { error: error.message });
      });

      this.redis.on('ready', () => {
        this.isConnected = true;
        logger.info('Redis cache ready');
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis cache connection closed');
      });

    } catch (error) {
      logger.error('Failed to initialize Redis cache', { error: error.message });
      throw error;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      logger.warn('Cache not connected, returning null');
      return null;
    }

    try {
      const cached = await this.redis.get(key);
      
      if (!cached) {
        this.stats.misses++;
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);
      
      // Check if entry is expired
      if (Date.now() - entry.timestamp > entry.ttl * 1000) {
        await this.delete(key);
        this.stats.misses++;
        return null;
      }

      // Check version compatibility
      if (entry.version !== this.version) {
        await this.delete(key);
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return entry.data;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache get error', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, data: T, ttl: number = this.config.ttl): Promise<boolean> {
    if (!this.isConnected) {
      logger.warn('Cache not connected, skipping set');
      return false;
    }

    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        version: this.version
      };

      await this.redis.setex(key, ttl, JSON.stringify(entry));
      this.stats.sets++;
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache set error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.redis.del(key);
      this.stats.deletes++;
      return result > 0;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache delete error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete multiple keys
   */
  async deleteMultiple(keys: string[]): Promise<number> {
    if (!this.isConnected || keys.length === 0) {
      return 0;
    }

    try {
      const result = await this.redis.del(...keys);
      this.stats.deletes += result;
      return result;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache delete multiple error', { keys, error: error.message });
      return 0;
    }
  }

  /**
   * Clear cache by pattern
   */
  async clearPattern(pattern: string): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(...keys);
      this.stats.deletes += result;
      logger.info('Cache pattern cleared', { pattern, deletedCount: result });
      return result;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache clear pattern error', { pattern, error: error.message });
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      logger.error('Cache health check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get cache info
   */
  async getInfo(): Promise<any> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const info = await this.redis.info();
      return info;
    } catch (error) {
      logger.error('Cache info error', { error: error.message });
      return null;
    }
  }

  /**
   * Close cache connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.isConnected = false;
      logger.info('Cache connection closed');
    }
  }

  /**
   * Cache decorator for methods
   */
  static cache<T>(
    keyGenerator: (...args: any[]) => string,
    ttl: number = CACHE_TTL.MEDIUM
  ) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const method = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const cacheKey = keyGenerator(...args);
        const cached = await cacheManager.get<T>(cacheKey);
        
        if (cached !== null) {
          return cached;
        }

        const result = await method.apply(this, args);
        await cacheManager.set(cacheKey, result, ttl);
        return result;
      };
    };
  }
}

// Global cache manager instance
export const cacheManager = new UnifiedCacheManager();

// Export cache utilities
export const cacheUtils = {
  /**
   * Generate cache key with namespace
   */
  generateKey: (namespace: string, ...parts: string[]): string => {
    return `${namespace}:${parts.join(':')}`;
  },

  /**
   * Generate cache key with hash
   */
  generateHashKey: (prefix: string, data: any): string => {
    const hash = require('crypto').createHash('md5').update(JSON.stringify(data)).digest('hex');
    return `${prefix}:${hash}`;
  },

  /**
   * Invalidate cache by pattern
   */
  invalidatePattern: async (pattern: string): Promise<number> => {
    return await cacheManager.clearPattern(pattern);
  },

  /**
   * Invalidate user-related cache
   */
  invalidateUserCache: async (userId: string): Promise<number> => {
    const patterns = [
      `user:profile:${userId}`,
      `user:preferences:${userId}`,
      `user:sessions:${userId}`,
      `user:orders:${userId}:*`,
      `recommendations:${userId}:*`
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await cacheManager.clearPattern(pattern);
    }

    return totalDeleted;
  },

  /**
   * Invalidate product-related cache
   */
  invalidateProductCache: async (productId: string): Promise<number> => {
    const patterns = [
      `product:details:${productId}`,
      `inventory:status:${productId}`,
      `stock:levels:${productId}`,
      'product:list:*',
      'product:search:*',
      'category:products:*'
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await cacheManager.clearPattern(pattern);
    }

    return totalDeleted;
  },

  /**
   * Invalidate order-related cache
   */
  invalidateOrderCache: async (orderId: string, userId?: string): Promise<number> => {
    const patterns = [
      `order:details:${orderId}`,
      'user:orders:*'
    ];

    if (userId) {
      patterns.push(`user:orders:${userId}:*`);
    }

    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await cacheManager.clearPattern(pattern);
    }

    return totalDeleted;
  }
};

export default cacheManager;
