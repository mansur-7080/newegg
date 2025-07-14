/**
 * Cache Middleware
 * Professional caching for UltraMarket Product Service
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { logger } from '@ultramarket/shared/logging/logger';
import crypto from 'crypto';

// Initialize Redis client for caching
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  db: parseInt(process.env.REDIS_CACHE_DB || '3'), // Separate DB for caching
});

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  ttl: number; // Time to live in seconds
  keyPrefix?: string; // Prefix for cache keys
  skipCache?: (req: Request) => boolean; // Function to skip caching
  keyGenerator?: (req: Request) => string; // Custom key generator
  varyBy?: string[]; // Headers to vary cache by
  tags?: string[]; // Cache tags for invalidation
  compression?: boolean; // Enable compression
  serialize?: (data: any) => string; // Custom serialization
  deserialize?: (data: string) => any; // Custom deserialization
}

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG: CacheConfig = {
  ttl: 300, // 5 minutes
  keyPrefix: 'cache',
  compression: true,
  varyBy: ['accept-language', 'user-agent'],
};

/**
 * Generate cache key from request
 */
const generateCacheKey = (req: Request, config: CacheConfig): string => {
  if (config.keyGenerator) {
    return config.keyGenerator(req);
  }

  const baseKey = `${config.keyPrefix}:${req.method}:${req.path}`;
  
  // Include query parameters
  const queryString = Object.keys(req.query)
    .sort()
    .map(key => `${key}=${req.query[key]}`)
    .join('&');

  // Include vary headers
  const varyHeaders = (config.varyBy || [])
    .map(header => `${header}:${req.get(header) || ''}`)
    .join('|');

  // Include user-specific information if authenticated
  const userInfo = req.user ? `user:${req.user.id}:${req.user.role}` : 'anonymous';

  // Create hash for long keys
  const keyData = `${baseKey}?${queryString}|${varyHeaders}|${userInfo}`;
  const hash = crypto.createHash('md5').update(keyData).digest('hex');

  return `${config.keyPrefix}:${hash}`;
};

/**
 * Compress data for storage
 */
const compressData = (data: string): string => {
  try {
    const zlib = require('zlib');
    return zlib.gzipSync(data).toString('base64');
  } catch (error) {
    logger.warn('Data compression failed', { error: error.message });
    return data;
  }
};

/**
 * Decompress data from storage
 */
const decompressData = (data: string): string => {
  try {
    const zlib = require('zlib');
    return zlib.gunzipSync(Buffer.from(data, 'base64')).toString();
  } catch (error) {
    logger.warn('Data decompression failed', { error: error.message });
    return data;
  }
};

/**
 * Serialize data for caching
 */
const serializeData = (data: any, config: CacheConfig): string => {
  try {
    const serialized = config.serialize ? config.serialize(data) : JSON.stringify(data);
    return config.compression ? compressData(serialized) : serialized;
  } catch (error) {
    logger.error('Data serialization failed', { error: error.message });
    throw error;
  }
};

/**
 * Deserialize data from cache
 */
const deserializeData = (data: string, config: CacheConfig): any => {
  try {
    const decompressed = config.compression ? decompressData(data) : data;
    return config.deserialize ? config.deserialize(decompressed) : JSON.parse(decompressed);
  } catch (error) {
    logger.error('Data deserialization failed', { error: error.message });
    throw error;
  }
};

/**
 * Cache middleware factory
 */
export const cacheMiddleware = (ttlOrConfig: number | CacheConfig) => {
  const config: CacheConfig = typeof ttlOrConfig === 'number' 
    ? { ...DEFAULT_CONFIG, ttl: ttlOrConfig }
    : { ...DEFAULT_CONFIG, ...ttlOrConfig };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Skip cache if function provided
      if (config.skipCache && config.skipCache(req)) {
        return next();
      }

      // Skip caching for authenticated requests with sensitive data
      if (req.user && req.path.includes('admin')) {
        return next();
      }

      const cacheKey = generateCacheKey(req, config);

      // Try to get from cache
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        try {
          const data = deserializeData(cachedData, config);
          
          // Set cache headers
          res.setHeader('X-Cache', 'HIT');
          res.setHeader('X-Cache-Key', cacheKey);
          res.setHeader('Cache-Control', `public, max-age=${config.ttl}`);

          logger.debug('Cache hit', {
            key: cacheKey,
            endpoint: req.path,
            size: cachedData.length,
          });

          return res.json(data);
        } catch (error) {
          logger.warn('Cache deserialization failed, continuing without cache', {
            error: error.message,
            key: cacheKey,
          });
        }
      }

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to cache response
      res.json = function(data: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          setImmediate(async () => {
            try {
              const serialized = serializeData(data, config);
              
              // Set cache with TTL
              await redis.setex(cacheKey, config.ttl, serialized);

              // Set cache tags if provided
              if (config.tags && config.tags.length > 0) {
                const tagPromises = config.tags.map(tag => 
                  redis.sadd(`cache:tag:${tag}`, cacheKey)
                );
                await Promise.all(tagPromises);
              }

              logger.debug('Response cached', {
                key: cacheKey,
                ttl: config.ttl,
                size: serialized.length,
                endpoint: req.path,
                tags: config.tags,
              });
            } catch (error) {
              logger.error('Failed to cache response', {
                error: error.message,
                key: cacheKey,
                endpoint: req.path,
              });
            }
          });
        }

        // Set cache headers
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);
        res.setHeader('Cache-Control', `public, max-age=${config.ttl}`);

        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', {
        error: error.message,
        stack: error.stack,
        endpoint: req.path,
      });

      // Continue without caching
      next();
    }
  };
};

/**
 * Smart cache middleware with automatic invalidation
 */
export const smartCache = (config: CacheConfig & {
  invalidateOn?: string[]; // HTTP methods that should invalidate cache
  invalidatePatterns?: string[]; // URL patterns that should be invalidated
}) => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Handle cache invalidation
      if (config.invalidateOn?.includes(req.method)) {
        const patterns = config.invalidatePatterns || [`${fullConfig.keyPrefix}*`];
        
        for (const pattern of patterns) {
          const keys = await redis.keys(pattern);
          if (keys.length > 0) {
            await redis.del(...keys);
            logger.info('Cache invalidated', {
              pattern,
              keysCount: keys.length,
              method: req.method,
              endpoint: req.path,
            });
          }
        }
      }

      // Use regular cache middleware for GET requests
      if (req.method === 'GET') {
        return cacheMiddleware(fullConfig)(req, res, next);
      }

      next();
    } catch (error) {
      logger.error('Smart cache middleware error', {
        error: error.message,
        endpoint: req.path,
      });
      next();
    }
  };
};

/**
 * Cache by user role
 */
export const roleBasedCache = (config: Record<string, Partial<CacheConfig>>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role || 'anonymous';
    const roleConfig = config[userRole] || config.default || DEFAULT_CONFIG;
    
    const finalConfig = { ...DEFAULT_CONFIG, ...roleConfig };
    
    return cacheMiddleware(finalConfig)(req, res, next);
  };
};

/**
 * Conditional cache middleware
 */
export const conditionalCache = (
  condition: (req: Request) => boolean,
  config: CacheConfig
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (condition(req)) {
      return cacheMiddleware(config)(req, res, next);
    }
    next();
  };
};

/**
 * Cache warming middleware
 */
export const warmCache = async (routes: Array<{
  path: string;
  query?: Record<string, any>;
  headers?: Record<string, string>;
}>) => {
  for (const route of routes) {
    try {
      // This would typically make an internal request to warm the cache
      // Implementation depends on your internal request system
      logger.info('Cache warming initiated', { route: route.path });
    } catch (error) {
      logger.error('Cache warming failed', {
        error: error.message,
        route: route.path,
      });
    }
  }
};

/**
 * Cache invalidation by tags
 */
export const invalidateCacheByTag = async (tag: string): Promise<number> => {
  try {
    // Get all keys with this tag
    const keys = await redis.smembers(`cache:tag:${tag}`);
    
    if (keys.length === 0) {
      return 0;
    }

    // Delete all keys
    await redis.del(...keys);
    
    // Clean up the tag set
    await redis.del(`cache:tag:${tag}`);

    logger.info('Cache invalidated by tag', {
      tag,
      keysCount: keys.length,
    });

    return keys.length;
  } catch (error) {
    logger.error('Cache invalidation by tag failed', {
      error: error.message,
      tag,
    });
    return 0;
  }
};

/**
 * Cache invalidation by pattern
 */
export const invalidateCacheByPattern = async (pattern: string): Promise<number> => {
  try {
    const keys = await redis.keys(pattern);
    
    if (keys.length === 0) {
      return 0;
    }

    await redis.del(...keys);

    logger.info('Cache invalidated by pattern', {
      pattern,
      keysCount: keys.length,
    });

    return keys.length;
  } catch (error) {
    logger.error('Cache invalidation by pattern failed', {
      error: error.message,
      pattern,
    });
    return 0;
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = async (): Promise<{
  totalKeys: number;
  memoryUsage: string;
  hitRate: number;
  missRate: number;
}> => {
  try {
    const info = await redis.info('memory');
    const keyCount = await redis.dbsize();
    
    // Parse memory info
    const memoryUsed = info.match(/used_memory_human:(.+)/)?.[1]?.trim() || 'unknown';

    // These would be tracked separately in a real implementation
    const hitRate = 0; // Placeholder
    const missRate = 0; // Placeholder

    return {
      totalKeys: keyCount,
      memoryUsage: memoryUsed,
      hitRate,
      missRate,
    };
  } catch (error) {
    logger.error('Failed to get cache stats', { error: error.message });
    return {
      totalKeys: 0,
      memoryUsage: 'unknown',
      hitRate: 0,
      missRate: 0,
    };
  }
};

/**
 * Cache health check
 */
export const cacheHealthCheck = async (): Promise<boolean> => {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    logger.error('Cache health check failed', { error: error.message });
    return false;
  }
};

/**
 * Flush all cache
 */
export const flushCache = async (): Promise<void> => {
  try {
    await redis.flushdb();
    logger.info('Cache flushed successfully');
  } catch (error) {
    logger.error('Failed to flush cache', { error: error.message });
    throw error;
  }
};