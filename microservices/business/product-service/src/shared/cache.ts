import Redis from 'ioredis';
import { Logger } from './logger';

/**
 * Professional Production Cache Manager
 * Real Redis-based caching implementation
 */

export class CacheManager {
  private redis: Redis;
  private logger: Logger;
  private readonly defaultTTL = 3600; // 1 hour

  constructor() {
    this.logger = new Logger('CacheManager');
    
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.redis.on('connect', () => {
      this.logger.info('Redis connected');
    });

    this.redis.on('error', (error: Error) => {
      this.logger.error('Redis connection error', { error });
    });

    this.redis.on('close', () => {
      this.logger.warn('Redis connection closed');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error('Cache get error', { key, error });
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await this.redis.setex(key, ttl, serializedValue);
      this.logger.debug('Cache set', { key, ttl });
    } catch (error) {
      this.logger.error('Cache set error', { key, error });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.logger.debug('Cache delete', { key });
    } catch (error) {
      this.logger.error('Cache delete error', { key, error });
    }
  }

  async clear(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.logger.info('Cache cleared');
    } catch (error) {
      this.logger.error('Cache clear error', { error });
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.error('Cache exists check error', { key, error });
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug('Cache pattern invalidated', { pattern, keysCount: keys.length });
      }
    } catch (error) {
      this.logger.error('Cache pattern invalidation error', { pattern, error });
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.info('Redis disconnected');
    } catch (error) {
      this.logger.error('Redis disconnect error', { error });
    }
  }

  // Tag-based cache invalidation
  async setWithTags(key: string, value: any, tags: string[], ttl: number = this.defaultTTL): Promise<void> {
    try {
      // Set the main key
      await this.set(key, value, ttl);
      
      // Associate with tags
      for (const tag of tags) {
        await this.redis.sadd(`tag:${tag}`, key);
        await this.redis.expire(`tag:${tag}`, ttl + 60); // Tags live slightly longer
      }
    } catch (error) {
      this.logger.error('Cache set with tags error', { key, tags, error });
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    try {
      const keys = await this.redis.smembers(`tag:${tag}`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        await this.redis.del(`tag:${tag}`);
        this.logger.debug('Cache invalidated by tag', { tag, keysCount: keys.length });
      }
    } catch (error) {
      this.logger.error('Cache tag invalidation error', { tag, error });
    }
  }
}