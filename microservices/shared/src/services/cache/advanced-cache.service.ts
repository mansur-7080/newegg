import Redis from 'ioredis';
import { logger } from '@ultramarket/shared';

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  compress?: boolean;
  version?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
}

export class AdvancedCacheService {
  private redis: Redis;
  private stats: Map<string, CacheStats> = new Map();
  private compressionThreshold = 1024; // 1KB

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      
      // Performance optimizations
      lazyConnect: true,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      keepAlive: 30000,
      family: 4,
      connectTimeout: 10000,
      commandTimeout: 5000,
      enableOfflineQueue: false,
      enableAutoPipelining: true,
      
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('error', (error) => {
      logger.error('Redis cache error:', error);
    });

    this.redis.on('connect', () => {
      logger.info('Advanced cache service connected');
    });
  }

  /**
   * Get value from cache with intelligent fallback
   */
  async get<T>(key: string, fallback?: () => Promise<T>, options?: CacheOptions): Promise<T | null> {
    try {
      const cacheKey = this.buildCacheKey(key, options?.version);
      const cached = await this.redis.get(cacheKey);
      
      this.updateStats(key, !!cached);

      if (cached) {
        const decompressed = this.decompress(cached);
        return JSON.parse(decompressed);
      }

      // Cache miss - execute fallback if provided
      if (fallback) {
        const value = await fallback();
        if (value !== null && value !== undefined) {
          await this.set(key, value, options);
        }
        return value;
      }

      return null;
    } catch (error) {
      logger.error('Cache get error:', { key, error });
      return null;
    }
  }

  /**
   * Set value in cache with intelligent compression
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const cacheKey = this.buildCacheKey(key, options?.version);
      const serialized = JSON.stringify(value);
      const compressed = this.compress(serialized);
      
      const pipeline = this.redis.pipeline();
      
      // Set main value
      pipeline.setex(cacheKey, options?.ttl || 3600, compressed);
      
      // Set tags for invalidation
      if (options?.tags && options.tags.length > 0) {
        for (const tag of options.tags) {
          pipeline.sadd(`tag:${tag}`, cacheKey);
          pipeline.expire(`tag:${tag}`, options.ttl || 3600);
        }
      }

      await pipeline.exec();
      
      logger.debug('Cache set successful', { key, size: compressed.length });
    } catch (error) {
      logger.error('Cache set error:', { key, error });
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      
      for (const tag of tags) {
        const keys = await this.redis.smembers(`tag:${tag}`);
        if (keys.length > 0) {
          pipeline.del(...keys);
          pipeline.del(`tag:${tag}`);
        }
      }

      await pipeline.exec();
      
      logger.info('Cache invalidated by tags', { tags, count: tags.length });
    } catch (error) {
      logger.error('Cache invalidation error:', { tags, error });
    }
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache<T>(
    keys: string[],
    dataProvider: (key: string) => Promise<T>,
    options?: CacheOptions
  ): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      
      for (const key of keys) {
        const value = await dataProvider(key);
        if (value !== null && value !== undefined) {
          const cacheKey = this.buildCacheKey(key, options?.version);
          const serialized = JSON.stringify(value);
          const compressed = this.compress(serialized);
          
          pipeline.setex(cacheKey, options?.ttl || 3600, compressed);
        }
      }

      await pipeline.exec();
      
      logger.info('Cache warming completed', { keys: keys.length });
    } catch (error) {
      logger.error('Cache warming error:', { error });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): Map<string, CacheStats> {
    return new Map(this.stats);
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      await this.redis.flushdb();
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Cache clear error:', { error });
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      logger.error('Cache health check failed:', { error });
      return false;
    }
  }

  /**
   * Private helper methods
   */
  private buildCacheKey(key: string, version?: string): string {
    const prefix = version ? `v${version}:` : '';
    return `cache:${prefix}${key}`;
  }

  private compress(data: string): string {
    if (data.length > this.compressionThreshold) {
      // Simple compression - in production use zlib or similar
      return Buffer.from(data).toString('base64');
    }
    return data;
  }

  private decompress(data: string): string {
    try {
      // Try to decode base64
      return Buffer.from(data, 'base64').toString();
    } catch {
      // If not base64, return as is
      return data;
    }
  }

  private updateStats(key: string, hit: boolean): void {
    const stats = this.stats.get(key) || { hits: 0, misses: 0, totalRequests: 0 };
    
    if (hit) {
      stats.hits++;
    } else {
      stats.misses++;
    }
    
    stats.totalRequests++;
    stats.hitRate = stats.hits / stats.totalRequests;
    
    this.stats.set(key, stats);
  }
}

export const advancedCacheService = new AdvancedCacheService();