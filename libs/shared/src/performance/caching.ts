import Redis from 'ioredis';
import { logger } from '../logger';

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  keyPrefix?: string;
  ttl?: number;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  compress?: boolean;
}

export class CacheManager {
  private redis: Redis;
  private defaultTTL: number;
  private keyPrefix: string;

  constructor(config: CacheConfig) {
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      keyPrefix: config.keyPrefix || 'ultramarket:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.defaultTTL = config.ttl || 3600; // 1 hour default
    this.keyPrefix = config.keyPrefix || 'ultramarket:';

    this.redis.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;

      return JSON.parse(value);
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    try {
      const ttl = options?.ttl || this.defaultTTL;
      const serializedValue = JSON.stringify(value);

      await this.redis.setex(key, ttl, serializedValue);

      // Add tags for cache invalidation
      if (options?.tags) {
        await this.addTags(key, options.tags);
      }

      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result > 0;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // Execute function and cache result
      const result = await fetchFunction();
      await this.set(key, result, options);
      return result;
    } catch (error) {
      logger.error('Cache getOrSet error:', error);
      // If cache fails, still execute the function
      return await fetchFunction();
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;

      const result = await this.redis.del(...keys);
      return result;
    } catch (error) {
      logger.error('Cache invalidatePattern error:', error);
      return 0;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      let totalDeleted = 0;

      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        const keys = await this.redis.smembers(tagKey);

        if (keys.length > 0) {
          const deleted = await this.redis.del(...keys);
          totalDeleted += deleted;

          // Remove the tag set
          await this.redis.del(tagKey);
        }
      }

      return totalDeleted;
    } catch (error) {
      logger.error('Cache invalidateByTags error:', error);
      return 0;
    }
  }

  /**
   * Add tags to a cache key for invalidation
   */
  private async addTags(key: string, tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        await this.redis.sadd(tagKey, key);
      }
    } catch (error) {
      logger.error('Cache addTags error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    hits: number;
    misses: number;
    keys: number;
    memory: string;
  }> {
    try {
      const info = await this.redis.info('stats');
      const keyspace = await this.redis.info('keyspace');

      const hits = this.extractStatValue(info, 'keyspace_hits');
      const misses = this.extractStatValue(info, 'keyspace_misses');
      const memory = this.extractStatValue(info, 'used_memory_human');

      // Count keys with our prefix
      const keys = await this.redis.keys(`${this.keyPrefix}*`);

      return {
        hits: parseInt(hits) || 0,
        misses: parseInt(misses) || 0,
        keys: keys.length,
        memory: memory || '0B',
      };
    } catch (error) {
      logger.error('Cache getStats error:', error);
      return { hits: 0, misses: 0, keys: 0, memory: '0B' };
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<boolean> {
    try {
      await this.redis.flushdb();
      return true;
    } catch (error) {
      logger.error('Cache clear error:', error);
      return false;
    }
  }

  /**
   * Close connection
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      logger.error('Cache disconnect error:', error);
    }
  }

  private extractStatValue(info: string, key: string): string {
    const match = info.match(new RegExp(`${key}:([^\\r\\n]+)`));
    return match ? match[1] : '0';
  }
}

// Cache decorators
export function Cacheable(options?: CacheOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;

      // This would need to be injected or accessed from a global cache instance
      // For now, this is a placeholder for the decorator pattern
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

// Multi-level cache implementation
export class MultiLevelCache {
  private l1Cache: Map<string, { value: any; expires: number }>;
  private l2Cache: CacheManager;
  private l1TTL: number;

  constructor(l2Cache: CacheManager, l1TTL: number = 60) {
    this.l1Cache = new Map();
    this.l2Cache = l2Cache;
    this.l1TTL = l1TTL * 1000; // Convert to milliseconds
  }

  async get<T>(key: string): Promise<T | null> {
    // Check L1 cache first (in-memory)
    const l1Entry = this.l1Cache.get(key);
    if (l1Entry && l1Entry.expires > Date.now()) {
      return l1Entry.value;
    }

    // Check L2 cache (Redis)
    const l2Value = await this.l2Cache.get<T>(key);
    if (l2Value) {
      // Store in L1 cache
      this.l1Cache.set(key, {
        value: l2Value,
        expires: Date.now() + this.l1TTL,
      });
      return l2Value;
    }

    return null;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    // Set in L1 cache
    this.l1Cache.set(key, {
      value,
      expires: Date.now() + this.l1TTL,
    });

    // Set in L2 cache
    return await this.l2Cache.set(key, value, options);
  }

  async delete(key: string): Promise<boolean> {
    // Delete from L1 cache
    this.l1Cache.delete(key);

    // Delete from L2 cache
    return await this.l2Cache.delete(key);
  }

  // Clean expired L1 cache entries
  cleanupL1(): void {
    const now = Date.now();
    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.expires <= now) {
        this.l1Cache.delete(key);
      }
    }
  }
}

// Cache warming utility
export class CacheWarmer {
  private cache: CacheManager;
  private warmupTasks: Map<string, () => Promise<any>>;

  constructor(cache: CacheManager) {
    this.cache = cache;
    this.warmupTasks = new Map();
  }

  addWarmupTask(key: string, task: () => Promise<any>): void {
    this.warmupTasks.set(key, task);
  }

  async warmup(): Promise<void> {
    logger.info('Starting cache warmup...');

    const promises = Array.from(this.warmupTasks.entries()).map(async ([key, task]) => {
      try {
        const value = await task();
        await this.cache.set(key, value);
        logger.info(`Cache warmed up for key: ${key}`);
      } catch (error) {
        logger.error(`Cache warmup failed for key ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
    logger.info('Cache warmup completed');
  }
}

// Export default cache instance
export const cacheManager = new CacheManager({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'ultramarket:',
  ttl: parseInt(process.env.CACHE_TTL || '3600'),
});
