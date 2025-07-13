/**
 * Cache Manager
 * Professional caching implementation for UltraMarket
 */

import { createClient, RedisClientType } from 'redis';
import { logger } from '../logging/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  compress?: boolean;
}

export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class CacheManager {
  private redis: RedisClientType;
  private defaultTTL: number = 3600; // 1 hour
  private defaultPrefix: string = 'ultramarket:';

  constructor(redisUrl?: string) {
    this.redis = createClient({
      url: redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.redis.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      logger.info('Connected to Redis cache');
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      logger.info('Disconnected from Redis');
    } catch (error) {
      logger.error('Failed to disconnect from Redis:', error);
    }
  }

  /**
   * Set cache item
   */
  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const { ttl = this.defaultTTL, prefix = this.defaultPrefix } = options;
      const fullKey = `${prefix}${key}`;
      
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };

      await this.redis.setex(fullKey, ttl, JSON.stringify(cacheItem));
      
      logger.debug('Cache item set', { key: fullKey, ttl });
    } catch (error) {
      logger.error('Failed to set cache item:', error);
      throw error;
    }
  }

  /**
   * Get cache item
   */
  async get<T>(key: string, prefix: string = this.defaultPrefix): Promise<T | null> {
    try {
      const fullKey = `${prefix}${key}`;
      const cached = await this.redis.get(fullKey);

      if (!cached) {
        return null;
      }

      const cacheItem: CacheItem<T> = JSON.parse(cached);
      
      // Check if item is expired
      const now = Date.now();
      const age = now - cacheItem.timestamp;
      
      if (age > cacheItem.ttl * 1000) {
        await this.delete(key, prefix);
        return null;
      }

      logger.debug('Cache hit', { key: fullKey });
      return cacheItem.data;
    } catch (error) {
      logger.error('Failed to get cache item:', error);
      return null;
    }
  }

  /**
   * Delete cache item
   */
  async delete(key: string, prefix: string = this.defaultPrefix): Promise<void> {
    try {
      const fullKey = `${prefix}${key}`;
      await this.redis.del(fullKey);
      
      logger.debug('Cache item deleted', { key: fullKey });
    } catch (error) {
      logger.error('Failed to delete cache item:', error);
      throw error;
    }
  }

  /**
   * Clear all cache
   */
  async clear(prefix: string = this.defaultPrefix): Promise<void> {
    try {
      const keys = await this.redis.keys(`${prefix}*`);
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
      
      logger.info('Cache cleared', { prefix, count: keys.length });
    } catch (error) {
      logger.error('Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate: number;
  }> {
    try {
      const info = await this.redis.info('memory');
      const keys = await this.redis.keys(`${this.defaultPrefix}*`);
      
      // Parse memory usage from info
      const memoryMatch = info.match(/used_memory_human:(\S+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : '0B';
      
      return {
        totalKeys: keys.length,
        memoryUsage,
        hitRate: 0, // Would need to implement hit tracking
      };
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsage: '0B',
        hitRate: 0,
      };
    }
  }

  /**
   * Cache decorator for methods
   */
  static cache<T extends any[], R>(
    key: string,
    options: CacheOptions = {}
  ) {
    return function (
      target: any,
      propertyName: string,
      descriptor: PropertyDescriptor
    ) {
      const method = descriptor.value;

      descriptor.value = async function (...args: T): Promise<R> {
        const cacheManager = new CacheManager();
        await cacheManager.connect();

        try {
          // Generate cache key based on method name and arguments
          const cacheKey = `${key}:${propertyName}:${JSON.stringify(args)}`;
          
          // Try to get from cache
          const cached = await cacheManager.get<R>(cacheKey);
          if (cached !== null) {
            return cached;
          }

          // Execute method and cache result
          const result = await method.apply(this, args);
          await cacheManager.set(cacheKey, result, options);
          
          return result;
        } finally {
          await cacheManager.disconnect();
        }
      };
    };
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(keys);
        logger.info('Cache invalidated by pattern', { pattern, count: keys.length });
      }
    } catch (error) {
      logger.error('Failed to invalidate cache pattern:', error);
      throw error;
    }
  }

  /**
   * Set multiple cache items
   */
  async setMultiple<T>(
    items: Array<{ key: string; data: T; options?: CacheOptions }>
  ): Promise<void> {
    try {
      const pipeline = this.redis.multi();
      
      for (const item of items) {
        const { key, data, options = {} } = item;
        const { ttl = this.defaultTTL, prefix = this.defaultPrefix } = options;
        const fullKey = `${prefix}${key}`;
        
        const cacheItem: CacheItem<T> = {
          data,
          timestamp: Date.now(),
          ttl,
        };

        pipeline.setex(fullKey, ttl, JSON.stringify(cacheItem));
      }

      await pipeline.exec();
      logger.debug('Multiple cache items set', { count: items.length });
    } catch (error) {
      logger.error('Failed to set multiple cache items:', error);
      throw error;
    }
  }

  /**
   * Get multiple cache items
   */
  async getMultiple<T>(keys: string[], prefix: string = this.defaultPrefix): Promise<Map<string, T>> {
    try {
      const fullKeys = keys.map(key => `${prefix}${key}`);
      const results = await this.redis.mget(fullKeys);
      
      const cacheMap = new Map<string, T>();
      
      for (let i = 0; i < keys.length; i++) {
        const result = results[i];
        if (result) {
          try {
            const cacheItem: CacheItem<T> = JSON.parse(result);
            
            // Check if item is expired
            const now = Date.now();
            const age = now - cacheItem.timestamp;
            
            if (age <= cacheItem.ttl * 1000) {
              cacheMap.set(keys[i], cacheItem.data);
            } else {
              // Delete expired item
              await this.delete(keys[i], prefix);
            }
          } catch (error) {
            logger.error('Failed to parse cache item:', error);
          }
        }
      }

      return cacheMap;
    } catch (error) {
      logger.error('Failed to get multiple cache items:', error);
      return new Map();
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();
export default cacheManager;
