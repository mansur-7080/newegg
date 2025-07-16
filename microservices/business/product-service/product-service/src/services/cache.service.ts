import Redis from 'ioredis';
import NodeCache from 'node-cache';
import { logger } from '../utils/logger';

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  prefix?: string;
}

export class CacheService {
  private static instance: CacheService;
  private redis: Redis | null = null;
  private memoryCache: NodeCache;
  private isConnected: boolean = false;

  private constructor() {
    // Initialize in-memory cache with 1 hour default TTL
    this.memoryCache = new NodeCache({
      stdTTL: 3600,
      checkperiod: 300,
      useClones: false,
      deleteOnExpire: true,
    });

    // Set up memory cache events
    this.memoryCache.on('expired', (key, value) => {
      logger.debug('Memory cache key expired', { key });
    });

    this.memoryCache.on('flush', () => {
      logger.info('Memory cache flushed');
    });
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  public async connect(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true;
          }
          return false;
        },
      });

      // Set up Redis event handlers
      this.redis.on('connect', () => {
        logger.info('Redis connection established');
        this.isConnected = true;
      });

      this.redis.on('error', (error) => {
        logger.error('Redis error', { error });
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      await this.redis.connect();
      logger.info('✅ Cache service connected');
    } catch (error) {
      logger.warn('Redis connection failed, using memory cache only', { error });
      this.isConnected = false;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.isConnected = false;
    }
    this.memoryCache.flushAll();
    logger.info('✅ Cache service disconnected');
  }

  /**
   * Get value from cache (Redis first, then memory)
   */
  public async get<T>(key: string): Promise<T | null> {
    const prefixedKey = this.getPrefixedKey(key);

    // Try memory cache first
    const memoryValue = this.memoryCache.get<T>(prefixedKey);
    if (memoryValue !== undefined) {
      logger.debug('Cache hit (memory)', { key: prefixedKey });
      return memoryValue;
    }

    // Try Redis if connected
    if (this.isConnected && this.redis) {
      try {
        const redisValue = await this.redis.get(prefixedKey);
        if (redisValue) {
          const parsed = JSON.parse(redisValue) as T;
          // Store in memory cache for faster access
          this.memoryCache.set(prefixedKey, parsed);
          logger.debug('Cache hit (Redis)', { key: prefixedKey });
          return parsed;
        }
      } catch (error) {
        logger.error('Redis get error', { error, key: prefixedKey });
      }
    }

    logger.debug('Cache miss', { key: prefixedKey });
    return null;
  }

  /**
   * Set value in cache (both Redis and memory)
   */
  public async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const prefixedKey = this.getPrefixedKey(key, options?.prefix);
    const ttl = options?.ttl || parseInt(process.env.REDIS_TTL || '3600');

    // Store in memory cache
    this.memoryCache.set(prefixedKey, value, ttl);

    // Store in Redis if connected
    if (this.isConnected && this.redis) {
      try {
        const serialized = JSON.stringify(value);
        await this.redis.setex(prefixedKey, ttl, serialized);

        // Handle tags if provided
        if (options?.tags && options.tags.length > 0) {
          await this.addToTags(prefixedKey, options.tags);
        }

        logger.debug('Cache set', { key: prefixedKey, ttl });
      } catch (error) {
        logger.error('Redis set error', { error, key: prefixedKey });
      }
    }
  }

  /**
   * Delete value from cache
   */
  public async delete(key: string): Promise<void> {
    const prefixedKey = this.getPrefixedKey(key);

    // Delete from memory cache
    this.memoryCache.del(prefixedKey);

    // Delete from Redis if connected
    if (this.isConnected && this.redis) {
      try {
        await this.redis.del(prefixedKey);
        logger.debug('Cache delete', { key: prefixedKey });
      } catch (error) {
        logger.error('Redis delete error', { error, key: prefixedKey });
      }
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  public async deletePattern(pattern: string): Promise<void> {
    const prefixedPattern = this.getPrefixedKey(pattern);

    // Delete from memory cache
    const memoryKeys = this.memoryCache.keys();
    const matchingKeys = memoryKeys.filter(key => key.includes(prefixedPattern));
    this.memoryCache.del(matchingKeys);

    // Delete from Redis if connected
    if (this.isConnected && this.redis) {
      try {
        const keys = await this.redis.keys(prefixedPattern + '*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
          logger.debug('Cache pattern delete', { pattern: prefixedPattern, count: keys.length });
        }
      } catch (error) {
        logger.error('Redis pattern delete error', { error, pattern: prefixedPattern });
      }
    }
  }

  /**
   * Invalidate cache by tags
   */
  public async invalidateByTags(tags: string[]): Promise<void> {
    if (!this.isConnected || !this.redis) {
      return;
    }

    try {
      const keysToDelete: string[] = [];

      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        const keys = await this.redis.smembers(tagKey);
        keysToDelete.push(...keys);
      }

      if (keysToDelete.length > 0) {
        // Delete from both caches
        const uniqueKeys = [...new Set(keysToDelete)];
        this.memoryCache.del(uniqueKeys);
        await this.redis.del(...uniqueKeys);

        // Clean up tag sets
        await this.redis.del(...tags.map(tag => `tag:${tag}`));

        logger.debug('Cache invalidated by tags', { tags, count: uniqueKeys.length });
      }
    } catch (error) {
      logger.error('Tag invalidation error', { error, tags });
    }
  }

  /**
   * Flush all cache
   */
  public async flush(): Promise<void> {
    this.memoryCache.flushAll();

    if (this.isConnected && this.redis) {
      try {
        await this.redis.flushdb();
        logger.info('Cache flushed');
      } catch (error) {
        logger.error('Redis flush error', { error });
      }
    }
  }

  /**
   * Get cache statistics
   */
  public getStats() {
    const stats = this.memoryCache.getStats();
    return {
      memory: {
        keys: this.memoryCache.keys().length,
        hits: stats.hits,
        misses: stats.misses,
        ksize: stats.ksize,
        vsize: stats.vsize,
      },
      redis: {
        connected: this.isConnected,
      },
    };
  }

  /**
   * Wrap a function with caching
   */
  public async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn();
    await this.set(key, result, options);
    return result;
  }

  private getPrefixedKey(key: string, prefix?: string): string {
    const servicePrefix = process.env.SERVICE_NAME || 'product-service';
    const customPrefix = prefix || '';
    return `${servicePrefix}:${customPrefix}${key}`;
  }

  private async addToTags(key: string, tags: string[]): Promise<void> {
    if (!this.isConnected || !this.redis) {
      return;
    }

    try {
      const pipeline = this.redis.pipeline();
      for (const tag of tags) {
        pipeline.sadd(`tag:${tag}`, key);
      }
      await pipeline.exec();
    } catch (error) {
      logger.error('Add to tags error', { error, key, tags });
    }
  }
}