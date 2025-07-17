/**
 * Cache Service
 * Professional Redis caching implementation
 */

import Redis from 'ioredis';
import { logger } from '@ultramarket/shared/logging/logger';

export class CacheService {
  private static instance: CacheService;
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('connect', () => {
      logger.info('Redis cache connected successfully');
    });

    this.redis.on('error', (error) => {
      logger.error('Redis cache connection error', { error });
    });

    this.redis.on('close', () => {
      logger.warn('Redis cache connection closed');
    });
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Set a key-value pair in cache
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      
      if (ttl) {
        await this.redis.setex(key, ttl, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }

      logger.debug('Cache set successfully', { key, ttl });
    } catch (error) {
      logger.error('Error setting cache', { error, key, ttl });
    }
  }

  /**
   * Get a value from cache
   */
  async get(key: string): Promise<any> {
    try {
      const value = await this.redis.get(key);
      
      if (value === null) {
        return null;
      }

      return JSON.parse(value);
    } catch (error) {
      logger.error('Error getting from cache', { error, key });
      return null;
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      logger.debug('Cache delete', { key, deleted: result > 0 });
      return result > 0;
    } catch (error) {
      logger.error('Error deleting from cache', { error, key });
      return false;
    }
  }

  /**
   * Delete multiple keys from cache
   */
  async deleteMany(keys: string[]): Promise<number> {
    try {
      if (keys.length === 0) return 0;
      
      const result = await this.redis.del(...keys);
      logger.debug('Cache delete many', { keys, deleted: result });
      return result;
    } catch (error) {
      logger.error('Error deleting many from cache', { error, keys });
      return 0;
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(...keys);
      logger.debug('Cache delete pattern', { pattern, keysFound: keys.length, deleted: result });
      return result;
    } catch (error) {
      logger.error('Error deleting pattern from cache', { error, pattern });
      return 0;
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Error checking cache existence', { error, key });
      return false;
    }
  }

  /**
   * Set expiration time for a key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      logger.error('Error setting cache expiration', { error, key, ttl });
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      logger.error('Error getting cache TTL', { error, key });
      return -1;
    }
  }

  /**
   * Increment a counter in cache
   */
  async increment(key: string, value: number = 1): Promise<number> {
    try {
      const result = await this.redis.incrby(key, value);
      logger.debug('Cache increment', { key, value, result });
      return result;
    } catch (error) {
      logger.error('Error incrementing cache', { error, key, value });
      return 0;
    }
  }

  /**
   * Decrement a counter in cache
   */
  async decrement(key: string, value: number = 1): Promise<number> {
    try {
      const result = await this.redis.decrby(key, value);
      logger.debug('Cache decrement', { key, value, result });
      return result;
    } catch (error) {
      logger.error('Error decrementing cache', { error, key, value });
      return 0;
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async setMany(keyValuePairs: Record<string, any>, ttl?: number): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();

      Object.entries(keyValuePairs).forEach(([key, value]) => {
        const serializedValue = JSON.stringify(value);
        
        if (ttl) {
          pipeline.setex(key, ttl, serializedValue);
        } else {
          pipeline.set(key, serializedValue);
        }
      });

      await pipeline.exec();
      logger.debug('Cache set many', { count: Object.keys(keyValuePairs).length, ttl });
    } catch (error) {
      logger.error('Error setting many in cache', { error, count: Object.keys(keyValuePairs).length, ttl });
    }
  }

  /**
   * Get multiple values from cache
   */
  async getMany(keys: string[]): Promise<Record<string, any>> {
    try {
      if (keys.length === 0) return {};

      const values = await this.redis.mget(...keys);
      const result: Record<string, any> = {};

      keys.forEach((key, index) => {
        const value = values[index];
        if (value !== null) {
          try {
            result[key] = JSON.parse(value);
          } catch (parseError) {
            logger.warn('Error parsing cached value', { key, parseError });
          }
        }
      });

      return result;
    } catch (error) {
      logger.error('Error getting many from cache', { error, keys });
      return {};
    }
  }

  /**
   * Add item to a list (left push)
   */
  async listPush(key: string, value: any): Promise<number> {
    try {
      const serializedValue = JSON.stringify(value);
      const result = await this.redis.lpush(key, serializedValue);
      return result;
    } catch (error) {
      logger.error('Error pushing to cache list', { error, key });
      return 0;
    }
  }

  /**
   * Remove and get item from list (left pop)
   */
  async listPop(key: string): Promise<any> {
    try {
      const value = await this.redis.lpop(key);
      
      if (value === null) {
        return null;
      }

      return JSON.parse(value);
    } catch (error) {
      logger.error('Error popping from cache list', { error, key });
      return null;
    }
  }

  /**
   * Get list length
   */
  async listLength(key: string): Promise<number> {
    try {
      return await this.redis.llen(key);
    } catch (error) {
      logger.error('Error getting cache list length', { error, key });
      return 0;
    }
  }

  /**
   * Get range of items from list
   */
  async listRange(key: string, start: number = 0, end: number = -1): Promise<any[]> {
    try {
      const values = await this.redis.lrange(key, start, end);
      return values.map(value => {
        try {
          return JSON.parse(value);
        } catch (parseError) {
          logger.warn('Error parsing list item', { key, parseError });
          return null;
        }
      }).filter(item => item !== null);
    } catch (error) {
      logger.error('Error getting cache list range', { error, key, start, end });
      return [];
    }
  }

  /**
   * Add item to a set
   */
  async setAdd(key: string, value: any): Promise<number> {
    try {
      const serializedValue = JSON.stringify(value);
      return await this.redis.sadd(key, serializedValue);
    } catch (error) {
      logger.error('Error adding to cache set', { error, key });
      return 0;
    }
  }

  /**
   * Remove item from set
   */
  async setRemove(key: string, value: any): Promise<number> {
    try {
      const serializedValue = JSON.stringify(value);
      return await this.redis.srem(key, serializedValue);
    } catch (error) {
      logger.error('Error removing from cache set', { error, key });
      return 0;
    }
  }

  /**
   * Check if item exists in set
   */
  async setContains(key: string, value: any): Promise<boolean> {
    try {
      const serializedValue = JSON.stringify(value);
      const result = await this.redis.sismember(key, serializedValue);
      return result === 1;
    } catch (error) {
      logger.error('Error checking cache set membership', { error, key });
      return false;
    }
  }

  /**
   * Get all members of a set
   */
  async setMembers(key: string): Promise<any[]> {
    try {
      const values = await this.redis.smembers(key);
      return values.map(value => {
        try {
          return JSON.parse(value);
        } catch (parseError) {
          logger.warn('Error parsing set member', { key, parseError });
          return null;
        }
      }).filter(item => item !== null);
    } catch (error) {
      logger.error('Error getting cache set members', { error, key });
      return [];
    }
  }

  /**
   * Set hash field
   */
  async hashSet(key: string, field: string, value: any): Promise<number> {
    try {
      const serializedValue = JSON.stringify(value);
      return await this.redis.hset(key, field, serializedValue);
    } catch (error) {
      logger.error('Error setting cache hash field', { error, key, field });
      return 0;
    }
  }

  /**
   * Get hash field
   */
  async hashGet(key: string, field: string): Promise<any> {
    try {
      const value = await this.redis.hget(key, field);
      
      if (value === null) {
        return null;
      }

      return JSON.parse(value);
    } catch (error) {
      logger.error('Error getting cache hash field', { error, key, field });
      return null;
    }
  }

  /**
   * Get all hash fields and values
   */
  async hashGetAll(key: string): Promise<Record<string, any>> {
    try {
      const hash = await this.redis.hgetall(key);
      const result: Record<string, any> = {};

      Object.entries(hash).forEach(([field, value]) => {
        try {
          result[field] = JSON.parse(value);
        } catch (parseError) {
          logger.warn('Error parsing hash field', { key, field, parseError });
        }
      });

      return result;
    } catch (error) {
      logger.error('Error getting cache hash all', { error, key });
      return {};
    }
  }

  /**
   * Delete hash field
   */
  async hashDelete(key: string, field: string): Promise<number> {
    try {
      return await this.redis.hdel(key, field);
    } catch (error) {
      logger.error('Error deleting cache hash field', { error, key, field });
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        memory: info,
        keyspace: keyspace,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error getting cache stats', { error });
      return null;
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      await this.redis.flushdb();
      logger.info('Cache cleared successfully');
    } catch (error) {
      logger.error('Error clearing cache', { error });
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    try {
      await this.redis.quit();
      logger.info('Cache connection closed');
    } catch (error) {
      logger.error('Error closing cache connection', { error });
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; latency?: number; error?: string }> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export default CacheService.getInstance();