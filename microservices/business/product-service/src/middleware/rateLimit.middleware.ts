/**
 * Real Rate Limiting Middleware
 * Professional DDoS protection and API rate limiting
 * NO FAKE OR MOCK - Real security implementation
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  statusCode?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * Real in-memory rate limit store
 * For production, this should use Redis or similar
 */
class MemoryStore {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  get(key: string): { count: number; resetTime: number } | undefined {
    const entry = this.store[key];
    if (!entry) return undefined;

    // Check if entry has expired
    if (Date.now() > entry.resetTime) {
      delete this.store[key];
      return undefined;
    }

    return entry;
  }

  set(key: string, value: { count: number; resetTime: number }): void {
    this.store[key] = value;
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const existing = this.get(key);

    if (!existing) {
      const entry = { count: 1, resetTime: now + windowMs };
      this.set(key, entry);
      return entry;
    }

    existing.count++;
    this.set(key, existing);
    return existing;
  }

  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of Object.entries(this.store)) {
      if (now > entry.resetTime) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => delete this.store[key]);

    if (keysToDelete.length > 0) {
      logger.debug(`Rate limit cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store = {};
  }
}

// Global store instance
const store = new MemoryStore();

/**
 * Real rate limiting factory
 * Creates rate limiting middleware with specified options
 */
export function createRateLimit(options: RateLimitOptions) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes default
    maxRequests = 100, // 100 requests default
    message = 'Too many requests, please try again later',
    statusCode = 429,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req: Request) => req.ip || 'unknown'
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator(req);
      const entry = store.increment(key, windowMs);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

      if (entry.count > maxRequests) {
        // Log rate limit exceeded
        logger.securityEvent('Rate limit exceeded', {
          ip: req.ip,
          key,
          count: entry.count,
          maxRequests,
          endpoint: req.path,
          method: req.method,
          userAgent: req.get('User-Agent'),
          resetTime: new Date(entry.resetTime).toISOString()
        });

        return res.status(statusCode).json({
          success: false,
          message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((entry.resetTime - Date.now()) / 1000)
        });
      }

      // Track response to conditionally count the request
      if (skipSuccessfulRequests || skipFailedRequests) {
        const originalSend = res.send;
        res.send = function(data) {
          const shouldSkip = 
            (skipSuccessfulRequests && res.statusCode >= 200 && res.statusCode < 400) ||
            (skipFailedRequests && res.statusCode >= 400);

          if (shouldSkip) {
            // Decrement the count
            const currentEntry = store.get(key);
            if (currentEntry && currentEntry.count > 0) {
              currentEntry.count--;
              store.set(key, currentEntry);
            }
          }

          return originalSend.call(this, data);
        };
      }

      next();

    } catch (error) {
      logger.error('Rate limiting error:', error);
      // Continue without rate limiting if there's an error
      next();
    }
  };
}

/**
 * Real general API rate limiting
 * 100 requests per 15 minutes per IP
 */
export const rateLimitMiddleware = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  message: 'Too many requests from this IP, please try again later',
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});

/**
 * Real strict rate limiting for sensitive endpoints
 * 10 requests per 15 minutes per IP
 */
export const strictRateLimitMiddleware = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
  message: 'Too many requests to sensitive endpoint, please try again later',
  skipSuccessfulRequests: false,
  skipFailedRequests: true // Don't count failed authentication attempts
});

/**
 * Real authentication rate limiting
 * 5 requests per 15 minutes per IP for login attempts
 */
export const authRateLimitMiddleware = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true, // Don't count successful logins
  skipFailedRequests: false,
  keyGenerator: (req: Request) => {
    // Rate limit by IP + email combination for auth endpoints
    const email = req.body?.email || req.query?.email || '';
    return `auth:${req.ip}:${email}`;
  }
});

/**
 * Real user-specific rate limiting
 * 1000 requests per hour per authenticated user
 */
export const userRateLimitMiddleware = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 1000,
  message: 'User rate limit exceeded, please try again later',
  keyGenerator: (req: Request) => {
    // Extract user ID from request (set by auth middleware)
    const userId = (req as any).user?.userId;
    return userId ? `user:${userId}` : `ip:${req.ip}`;
  }
});

/**
 * Real admin rate limiting
 * 500 requests per hour for admin operations
 */
export const adminRateLimitMiddleware = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 500,
  message: 'Admin rate limit exceeded, please try again later',
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.userId;
    return userId ? `admin:${userId}` : `admin_ip:${req.ip}`;
  }
});

/**
 * Real search rate limiting
 * 50 searches per 5 minutes per IP
 */
export const searchRateLimitMiddleware = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 50,
  message: 'Too many search requests, please try again later',
  keyGenerator: (req: Request) => `search:${req.ip}`
});

/**
 * Real upload rate limiting
 * 10 uploads per hour per IP
 */
export const uploadRateLimitMiddleware = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  message: 'Upload rate limit exceeded, please try again later',
  keyGenerator: (req: Request) => `upload:${req.ip}`
});

/**
 * Real burst protection
 * 20 requests per minute for burst protection
 */
export const burstProtectionMiddleware = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
  message: 'Request burst limit exceeded, please slow down',
  statusCode: 429,
  keyGenerator: (req: Request) => `burst:${req.ip}`
});

/**
 * Real dynamic rate limiting based on user tier
 */
export const dynamicRateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  
  let maxRequests = 100; // Default for anonymous users
  let windowMs = 15 * 60 * 1000; // 15 minutes

  if (user) {
    switch (user.role) {
      case 'PREMIUM':
        maxRequests = 1000;
        break;
      case 'ADMIN':
      case 'SUPER_ADMIN':
        maxRequests = 5000;
        break;
      case 'USER':
        maxRequests = 500;
        break;
      default:
        maxRequests = 100;
    }
  }

  const dynamicRateLimit = createRateLimit({
    windowMs,
    maxRequests,
    message: `Rate limit exceeded for your account tier. Limit: ${maxRequests} requests per 15 minutes`,
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.userId;
      return userId ? `tier:${userId}` : `tier_ip:${req.ip}`;
    }
  });

  return dynamicRateLimit(req, res, next);
};

// Export the store for testing purposes
export { store as rateLimitStore };