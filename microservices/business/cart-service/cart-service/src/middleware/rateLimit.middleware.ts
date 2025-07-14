import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '../utils/errors';
import { logger } from '../utils/logger';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitInfo {
  totalHits: number;
  resetTime: Date;
}

class InMemoryStore {
  private store = new Map<string, RateLimitInfo>();

  get(key: string): RateLimitInfo | undefined {
    return this.store.get(key);
  }

  set(key: string, value: RateLimitInfo): void {
    this.store.set(key, value);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = new Date();
    for (const [key, info] of this.store.entries()) {
      if (info.resetTime < now) {
        this.store.delete(key);
      }
    }
  }
}

const defaultStore = new InMemoryStore();

// Clean up expired entries every 5 minutes
setInterval(() => {
  defaultStore.cleanup();
}, 5 * 60 * 1000);

/**
 * Create a rate limiting middleware
 */
export const createRateLimit = (config: RateLimitConfig) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const key = config.keyGenerator ? config.keyGenerator(req) : getDefaultKey(req);
      const now = new Date();
      
      let rateLimitInfo = defaultStore.get(key);
      
      // If no info exists or the window has expired, create new info
      if (!rateLimitInfo || rateLimitInfo.resetTime < now) {
        rateLimitInfo = {
          totalHits: 1,
          resetTime: new Date(now.getTime() + config.windowMs),
        };
      } else {
        rateLimitInfo.totalHits++;
      }

      // Store updated info
      defaultStore.set(key, rateLimitInfo);

      // Set rate limit headers
      const remaining = Math.max(0, config.maxRequests - rateLimitInfo.totalHits);
      const resetTime = Math.ceil(rateLimitInfo.resetTime.getTime() / 1000);

      res.set({
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toString(),
        'X-RateLimit-Window': config.windowMs.toString(),
      });

      // Check if rate limit exceeded
      if (rateLimitInfo.totalHits > config.maxRequests) {
        logger.warn('Rate limit exceeded', {
          key,
          totalHits: rateLimitInfo.totalHits,
          maxRequests: config.maxRequests,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          url: req.url,
          method: req.method,
        });

        const error = new RateLimitError(
          `Too many requests. Try again in ${Math.ceil((rateLimitInfo.resetTime.getTime() - now.getTime()) / 1000)} seconds.`
        );

        res.status(429).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            retryAfter: Math.ceil((rateLimitInfo.resetTime.getTime() - now.getTime()) / 1000),
          },
        });
        return;
      }

      logger.debug('Rate limit check passed', {
        key,
        totalHits: rateLimitInfo.totalHits,
        maxRequests: config.maxRequests,
        remaining,
      });

      next();
    } catch (error) {
      logger.error('Rate limit middleware error:', error);
      // Don't fail requests due to rate limiting errors
      next();
    }
  };
};

/**
 * Default key generator based on IP address
 */
const getDefaultKey = (req: Request): string => {
  return `rate_limit:${req.ip}`;
};

/**
 * Key generator for authenticated users
 */
const getUserKey = (req: Request): string => {
  const user = (req as any).user;
  if (user && user.id) {
    return `rate_limit:user:${user.id}`;
  }
  return getDefaultKey(req);
};

/**
 * Key generator for cart operations
 */
const getCartKey = (req: Request): string => {
  const user = (req as any).user;
  const sessionId = (req as any).sessionId || req.headers['x-session-id'];
  
  if (user && user.id) {
    return `rate_limit:cart:user:${user.id}`;
  } else if (sessionId) {
    return `rate_limit:cart:session:${sessionId}`;
  }
  
  return `rate_limit:cart:ip:${req.ip}`;
};

/**
 * Predefined rate limiter
 */

// General API rate limiter - 100 requests per 15 minutes
export const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  keyGenerator: getUserKey,
});

// Strict rate limiter for sensitive operations - 10 requests per 15 minutes
export const strictRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
  keyGenerator: getUserKey,
});

// Cart operations rate limiter - 50 requests per 5 minutes
export const cartRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 50,
  keyGenerator: getCartKey,
});

// Admin operations rate limiter - 200 requests per 15 minutes
export const adminRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 200,
  keyGenerator: getUserKey,
});

// Authentication rate limiter - 5 attempts per 15 minutes
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  keyGenerator: (req: Request) => `rate_limit:auth:${req.ip}`,
});

// Add to cart rate limiter - 20 requests per minute
export const addToCartRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
  keyGenerator: getCartKey,
});

// Default rate limiter for cart service
export const rateLimitMiddleware = cartRateLimit;

/**
 * Dynamic rate limiter based on user role
 */
export const dynamicRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;
  
  if (!user) {
    // Guest users get stricter limits
    return createRateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 20,
      keyGenerator: getDefaultKey,
    })(req, res, next);
  }

  switch (user.role) {
    case 'admin':
      return adminRateLimit(req, res, next);
    case 'premium':
      return createRateLimit({
        windowMs: 5 * 60 * 1000, // 5 minutes
        maxRequests: 100,
        keyGenerator: getUserKey,
      })(req, res, next);
    default:
      return generalRateLimit(req, res, next);
  }
};

/**
 * Skip rate limiting for certain conditions
 */
export const skipRateLimit = (req: Request): boolean => {
  // Skip for health checks
  if (req.url === '/health' || req.url === '/status') {
    return true;
  }

  // Skip for internal API calls
  if (req.headers['x-api-key']) {
    return true;
  }

  // Skip for admin users (optional)
  const user = (req as any).user;
  if (user && user.role === 'admin' && process.env.NODE_ENV === 'development') {
    return true;
  }

  return false;
};

/**
 * Rate limit with skip conditions
 */
export const conditionalRateLimit = (config: RateLimitConfig) => {
  const rateLimit = createRateLimit(config);
  
  return (req: Request, res: Response, next: NextFunction): void => {
    if (skipRateLimit(req)) {
      next();
      return;
    }
    
    rateLimit(req, res, next);
  };
};

/**
 * Reset rate limit for a specific key (admin function)
 */
export const resetRateLimit = (key: string): boolean => {
  try {
    defaultStore.delete(key);
    logger.info('Rate limit reset', { key });
    return true;
  } catch (error) {
    logger.error('Failed to reset rate limit:', error);
    return false;
  }
};

/**
 * Get current rate limit status for a key
 */
export const getRateLimitStatus = (key: string): RateLimitInfo | null => {
  const info = defaultStore.get(key);
  if (!info) {
    return null;
  }

  // Check if expired
  if (info.resetTime < new Date()) {
    defaultStore.delete(key);
    return null;
  }

  return info;
};