/**
 * Cache Middleware
 * Professional caching middleware for product microservice
 */

import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../../services/cache.service';

const cacheService = new CacheService();

export const cacheMiddleware = (duration: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;
    
    try {
      const cached = await cacheService.get(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.json(JSON.parse(cached));
        return;
      }
    } catch (error) {
      // Cache miss or error, continue
    }

    res.setHeader('X-Cache', 'MISS');
    
    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(data: any) {
      if (res.statusCode === 200) {
        cacheService.set(key, JSON.stringify(data), duration).catch(() => {
          // Ignore cache errors
        });
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

export const invalidateCache = (pattern: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Store original methods
    const originalJson = res.json;
    const originalEnd = res.end;

    // Override response methods to invalidate cache after successful response
    const invalidateCacheAfterResponse = () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheService.deletePattern(pattern).catch(() => {
          // Ignore cache errors
        });
      }
    };

    res.json = function(data: any) {
      invalidateCacheAfterResponse();
      return originalJson.call(this, data);
    };

    res.end = function(chunk?: any, encoding?: any, cb?: any) {
      invalidateCacheAfterResponse();
      return originalEnd.call(this, chunk, encoding, cb);
    };

    next();
  };
};