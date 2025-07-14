/**
 * Rate Limiting Middleware
 * Professional rate limiting for UltraMarket Product Service
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { logger } from '@ultramarket/shared/logging/logger';

// Initialize Redis client for rate limiting
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  db: parseInt(process.env.REDIS_RATE_LIMIT_DB || '2'), // Separate DB for rate limiting
});

/**
 * Rate limit configuration interface
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  message?: string; // Custom error message
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  store?: 'memory' | 'redis'; // Storage backend
  onLimitReached?: (req: Request, res: Response) => void; // Callback when limit is reached
}

/**
 * Default rate limit configuration
 */
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes
  message: 'Too many requests, please try again later.',
  store: 'redis',
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
};

/**
 * Generate rate limit key
 */
const generateKey = (req: Request, prefix: string = 'rate_limit'): string => {
  // Use user ID if authenticated, otherwise use IP
  const identifier = req.user?.id || req.ip || 'anonymous';
  const endpoint = req.route?.path || req.path;
  return `${prefix}:${identifier}:${endpoint}`;
};

/**
 * Redis-based rate limiting
 */
async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{
  allowed: boolean;
  totalHits: number;
  remainingPoints: number;
  msBeforeNext: number;
  resetTime: Date;
}> {
  try {
    const now = Date.now();
    const window = Math.floor(now / config.windowMs);
    const redisKey = `${key}:${window}`;

    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();
    pipeline.incr(redisKey);
    pipeline.expire(redisKey, Math.ceil(config.windowMs / 1000));
    
    const results = await pipeline.exec();
    const totalHits = results?.[0]?.[1] as number || 0;

    const allowed = totalHits <= config.max;
    const remainingPoints = Math.max(0, config.max - totalHits);
    const resetTime = new Date((window + 1) * config.windowMs);
    const msBeforeNext = resetTime.getTime() - now;

    return {
      allowed,
      totalHits,
      remainingPoints,
      msBeforeNext,
      resetTime,
    };
  } catch (error) {
    logger.error('Rate limit check failed', {
      error: error.message,
      key,
      config,
    });

    // Fail open - allow request if Redis is down
    return {
      allowed: true,
      totalHits: 0,
      remainingPoints: config.max,
      msBeforeNext: 0,
      resetTime: new Date(),
    };
  }
}

/**
 * Memory-based rate limiting (fallback)
 */
const memoryStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimitMemory(
  key: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  totalHits: number;
  remainingPoints: number;
  msBeforeNext: number;
  resetTime: Date;
} {
  const now = Date.now();
  const window = Math.floor(now / config.windowMs);
  const memoryKey = `${key}:${window}`;

  let record = memoryStore.get(memoryKey);

  if (!record || record.resetTime <= now) {
    record = {
      count: 1,
      resetTime: (window + 1) * config.windowMs,
    };
    memoryStore.set(memoryKey, record);

    // Clean up old entries
    for (const [k, v] of memoryStore.entries()) {
      if (v.resetTime <= now) {
        memoryStore.delete(k);
      }
    }
  } else {
    record.count++;
  }

  const allowed = record.count <= config.max;
  const remainingPoints = Math.max(0, config.max - record.count);
  const resetTime = new Date(record.resetTime);
  const msBeforeNext = resetTime.getTime() - now;

  return {
    allowed,
    totalHits: record.count,
    remainingPoints,
    msBeforeNext,
    resetTime,
  };
}

/**
 * Rate limiting middleware factory
 */
export const rateLimit = (config: Partial<RateLimitConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Generate rate limit key
      const key = finalConfig.keyGenerator
        ? finalConfig.keyGenerator(req)
        : generateKey(req, 'rate_limit');

      // Check rate limit
      const result = finalConfig.store === 'redis'
        ? await checkRateLimit(key, finalConfig)
        : checkRateLimitMemory(key, finalConfig);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', finalConfig.max);
      res.setHeader('X-RateLimit-Remaining', result.remainingPoints);
      res.setHeader('X-RateLimit-Reset', result.resetTime.toISOString());
      res.setHeader('X-RateLimit-Window', finalConfig.windowMs);

      if (!result.allowed) {
        // Add retry-after header
        res.setHeader('Retry-After', Math.ceil(result.msBeforeNext / 1000));

        // Log rate limit exceeded
        logger.warn('Rate limit exceeded', {
          key,
          totalHits: result.totalHits,
          limit: finalConfig.max,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.path,
          userId: req.user?.id,
        });

        // Call custom callback if provided
        if (finalConfig.onLimitReached) {
          finalConfig.onLimitReached(req, res);
        }

        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: finalConfig.message,
            retryAfter: Math.ceil(result.msBeforeNext / 1000),
            limit: finalConfig.max,
            remaining: result.remainingPoints,
            resetTime: result.resetTime.toISOString(),
          },
        });
      }

      // Log successful rate limit check (debug level)
      logger.debug('Rate limit check passed', {
        key,
        totalHits: result.totalHits,
        remaining: result.remainingPoints,
        endpoint: req.path,
      });

      next();
    } catch (error) {
      logger.error('Rate limit middleware error', {
        error: error.message,
        stack: error.stack,
        endpoint: req.path,
      });

      // Fail open - continue with request
      next();
    }
  };
};

/**
 * Dynamic rate limiting based on user role
 */
export const dynamicRateLimit = (baseConfig: Partial<RateLimitConfig> = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role || 'anonymous';

    // Different rate limits based on user role
    const roleLimits = {
      anonymous: { max: 10, windowMs: 60 * 1000 }, // 10/min
      CUSTOMER: { max: 50, windowMs: 60 * 1000 }, // 50/min
      VENDOR: { max: 200, windowMs: 60 * 1000 }, // 200/min
      ADMIN: { max: 1000, windowMs: 60 * 1000 }, // 1000/min
      SUPER_ADMIN: { max: 10000, windowMs: 60 * 1000 }, // 10000/min
    };

    const roleLimit = roleLimits[userRole] || roleLimits.anonymous;
    const config = { ...baseConfig, ...roleLimit };

    const rateLimitMiddleware = rateLimit(config);
    return rateLimitMiddleware(req, res, next);
  };
};

/**
 * API endpoint specific rate limiting
 */
export const endpointRateLimit = (limits: Record<string, Partial<RateLimitConfig>>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const endpoint = req.route?.path || req.path;
    const config = limits[endpoint];

    if (!config) {
      return next();
    }

    const rateLimitMiddleware = rateLimit(config);
    return rateLimitMiddleware(req, res, next);
  };
};

/**
 * Sliding window rate limiting
 */
export const slidingWindowRateLimit = (config: Partial<RateLimitConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = finalConfig.keyGenerator
        ? finalConfig.keyGenerator(req)
        : generateKey(req, 'sliding_window');

      const now = Date.now();
      const windowStart = now - finalConfig.windowMs;

      // Use Redis sorted set for sliding window
      const redisKey = `${key}:sliding`;

      // Remove old entries
      await redis.zremrangebyscore(redisKey, 0, windowStart);

      // Count current requests
      const currentCount = await redis.zcard(redisKey);

      if (currentCount >= finalConfig.max) {
        res.setHeader('X-RateLimit-Limit', finalConfig.max);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('Retry-After', Math.ceil(finalConfig.windowMs / 1000));

        logger.warn('Sliding window rate limit exceeded', {
          key,
          currentCount,
          limit: finalConfig.max,
          ip: req.ip,
          endpoint: req.path,
        });

        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: finalConfig.message,
            retryAfter: Math.ceil(finalConfig.windowMs / 1000),
          },
        });
      }

      // Add current request
      await redis.zadd(redisKey, now, `${now}-${Math.random()}`);
      await redis.expire(redisKey, Math.ceil(finalConfig.windowMs / 1000));

      // Set headers
      res.setHeader('X-RateLimit-Limit', finalConfig.max);
      res.setHeader('X-RateLimit-Remaining', finalConfig.max - currentCount - 1);

      next();
    } catch (error) {
      logger.error('Sliding window rate limit error', {
        error: error.message,
        endpoint: req.path,
      });

      // Fail open
      next();
    }
  };
};

/**
 * Burst protection rate limiting
 */
export const burstProtection = (config: {
  burst: number; // Maximum burst requests
  sustained: number; // Sustained rate per minute
  windowMs?: number;
}) => {
  const { burst, sustained, windowMs = 60 * 1000 } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = generateKey(req, 'burst');
      const now = Date.now();

      // Check burst limit (immediate)
      const burstKey = `${key}:burst`;
      const burstCount = await redis.incr(burstKey);
      await redis.expire(burstKey, 10); // 10 second burst window

      if (burstCount > burst) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'BURST_LIMIT_EXCEEDED',
            message: 'Too many requests in a short time. Please slow down.',
            retryAfter: 10,
          },
        });
      }

      // Check sustained limit
      const sustainedResult = await checkRateLimit(key, {
        windowMs,
        max: sustained,
        message: 'Sustained rate limit exceeded',
      });

      if (!sustainedResult.allowed) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'SUSTAINED_LIMIT_EXCEEDED',
            message: 'Sustained rate limit exceeded',
            retryAfter: Math.ceil(sustainedResult.msBeforeNext / 1000),
          },
        });
      }

      next();
    } catch (error) {
      logger.error('Burst protection error', {
        error: error.message,
        endpoint: req.path,
      });

      // Fail open
      next();
    }
  };
};

/**
 * Rate limit status endpoint
 */
export const rateLimitStatus = async (req: Request, res: Response) => {
  try {
    const key = generateKey(req, 'rate_limit');
    const result = await checkRateLimit(key, DEFAULT_CONFIG);

    res.json({
      success: true,
      data: {
        limit: DEFAULT_CONFIG.max,
        remaining: result.remainingPoints,
        resetTime: result.resetTime,
        totalRequests: result.totalHits,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_STATUS_ERROR',
        message: 'Failed to get rate limit status',
      },
    });
  }
};