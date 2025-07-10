import Redis from 'ioredis';
import { logger } from './logger';

// Redis client configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000
};

// Create Redis client
export const redis = new Redis(redisConfig);

// Redis event handlers
redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

redis.on('reconnecting', () => {
  logger.info('Redis reconnecting...');
});

// Cache utilities
export class CacheService {
  private client: Redis;
  private defaultTTL: number;

  constructor(client: Redis = redis, defaultTTL: number = 3600) {
    this.client = client;
    this.defaultTTL = defaultTTL;
  }

  // Set cache with TTL
  async set<T>(key: string, value: T, ttl: number = this.defaultTTL): Promise<void> {
    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      await this.client.setex(key, ttl, serializedValue);
      logger.debug(`Cache set: ${key}`);
    } catch (error) {
      logger.error('Cache set error:', error);
      throw error;
    }
  }

  // Get cache value
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  // Delete cache
  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
      logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      logger.error('Cache delete error:', error);
      throw error;
    }
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  // Set cache with expiration
  async setex<T>(key: string, value: T, ttl: number): Promise<void> {
    await this.set(key, value, ttl);
  }

  // Increment counter
  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error('Cache incr error:', error);
      throw error;
    }
  }

  // Decrement counter
  async decr(key: string): Promise<number> {
    try {
      return await this.client.decr(key);
    } catch (error) {
      logger.error('Cache decr error:', error);
      throw error;
    }
  }

  // Set hash field
  async hset<T>(key: string, field: string, value: T): Promise<void> {
    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      await this.client.hset(key, field, serializedValue);
    } catch (error) {
      logger.error('Cache hset error:', error);
      throw error;
    }
  }

  // Get hash field
  async hget<T>(key: string, field: string): Promise<T | null> {
    try {
      const value = await this.client.hget(key, field);
      if (!value) return null;
      
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      logger.error('Cache hget error:', error);
      return null;
    }
  }

  // Get all hash fields
  async hgetall<T>(key: string): Promise<Record<string, T> | null> {
    try {
      const hash = await this.client.hgetall(key);
      if (!hash || Object.keys(hash).length === 0) return null;
      
      const result: Record<string, T> = {};
      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value) as T;
        } catch {
          result[field] = value as T;
        }
      }
      return result;
    } catch (error) {
      logger.error('Cache hgetall error:', error);
      return null;
    }
  }

  // Delete hash field
  async hdel(key: string, field: string): Promise<void> {
    try {
      await this.client.hdel(key, field);
    } catch (error) {
      logger.error('Cache hdel error:', error);
      throw error;
    }
  }

  // Set multiple values
  async mset<T>(keyValuePairs: Record<string, T>, ttl: number = this.defaultTTL): Promise<void> {
    try {
      const pipeline = this.client.pipeline();
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
        pipeline.setex(key, ttl, serializedValue);
      }
      
      await pipeline.exec();
      logger.debug(`Cache mset: ${Object.keys(keyValuePairs).length} keys`);
    } catch (error) {
      logger.error('Cache mset error:', error);
      throw error;
    }
  }

  // Get multiple values
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.client.mget(...keys);
      return values.map(value => {
        if (!value) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as T;
        }
      });
    } catch (error) {
      logger.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  // Clear all cache (use with caution)
  async flushall(): Promise<void> {
    try {
      await this.client.flushall();
      logger.warn('Cache flushed all');
    } catch (error) {
      logger.error('Cache flushall error:', error);
      throw error;
    }
  }

  // Get cache statistics
  async getStats(): Promise<Record<string, unknown>> {
    try {
      const info = await this.client.info();
      const stats: Record<string, unknown> = {};
      
      info.split('\r\n').forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      });
      
      return stats;
    } catch (error) {
      logger.error('Cache stats error:', error);
      return {};
    }
  }
}

// Session management
export class SessionService extends CacheService {
  private sessionPrefix = 'session:';
  private sessionTTL = 86400; // 24 hours

  constructor() {
    super(redis, 86400);
  }

  // Create session
  async createSession<T>(userId: string, sessionData: T): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const key = `${this.sessionPrefix}${sessionId}`;
    
    await this.set(key, {
      userId,
      ...sessionData,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString()
    }, this.sessionTTL);
    
    return sessionId;
  }

  // Get session
  async getSession<T>(sessionId: string): Promise<T | null> {
    const key = `${this.sessionPrefix}${sessionId}`;
    const session = await this.get<T>(key);
    
    if (session) {
      // Update last accessed time
      (session as any).lastAccessed = new Date().toISOString();
      await this.set(key, session, this.sessionTTL);
    }
    
    return session;
  }

  // Delete session
  async deleteSession(sessionId: string): Promise<void> {
    const key = `${this.sessionPrefix}${sessionId}`;
    await this.delete(key);
  }

  // Get user sessions
  async getUserSessions<T>(userId: string): Promise<T[]> {
    const pattern = `${this.sessionPrefix}*`;
    const keys = await redis.keys(pattern);
    const sessions: T[] = [];
    
    for (const key of keys) {
      const session = await this.get<T>(key);
      if (session && (session as any).userId === userId) {
        sessions.push(session);
      }
    }
    
    return sessions;
  }
}

// API response caching
export class ResponseCacheService extends CacheService {
  private cachePrefix = 'api:';
  private defaultCacheTTL = 300; // 5 minutes

  constructor() {
    super(redis, 300);
  }

  // Cache API response
  async cacheResponse<T>(endpoint: string, params: Record<string, unknown>, response: T, ttl: number = this.defaultCacheTTL): Promise<void> {
    const cacheKey = this.generateCacheKey(endpoint, params);
    await this.set(cacheKey, {
      response,
      cachedAt: new Date().toISOString(),
      ttl
    }, ttl);
  }

  // Get cached response
  async getCachedResponse<T>(endpoint: string, params: Record<string, unknown>): Promise<T | null> {
    const cacheKey = this.generateCacheKey(endpoint, params);
    const cached = await this.get<{ response: T }>(cacheKey);
    return cached?.response || null;
  }

  // Invalidate cache by pattern
  async invalidateCache(pattern: string): Promise<void> {
    const keys = await redis.keys(`${this.cachePrefix}${pattern}`);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info(`Invalidated ${keys.length} cache entries for pattern: ${pattern}`);
    }
  }

  private generateCacheKey(endpoint: string, params: Record<string, unknown>): string {
    const paramsString = JSON.stringify(params);
    const hash = require('crypto').createHash('md5').update(paramsString).digest('hex');
    return `${this.cachePrefix}${endpoint}:${hash}`;
  }
}

// Rate limiting
export class RateLimitService extends CacheService {
  private rateLimitPrefix = 'rate_limit:';

  constructor() {
    super(redis, 60);
  }

  // Check rate limit
  async checkRateLimit(identifier: string, limit: number, windowMs: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const key = `${this.rateLimitPrefix}${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Remove expired entries
    await redis.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests
    const count = await redis.zcard(key);
    
    if (count >= limit) {
      const oldestEntry = await redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetTime = oldestEntry.length > 0 ? parseInt(oldestEntry[1]) + windowMs : now + windowMs;
      
      return {
        allowed: false,
        remaining: 0,
        resetTime
      };
    }
    
    // Add current request
    await redis.zadd(key, now, now.toString());
    await redis.expire(key, Math.ceil(windowMs / 1000));
    
    return {
      allowed: true,
      remaining: limit - count - 1,
      resetTime: now + windowMs
    };
  }
}

// Export default instances
export const cacheService = new CacheService();
export const sessionService = new SessionService();
export const responseCacheService = new ResponseCacheService();
export const rateLimitService = new RateLimitService(); 