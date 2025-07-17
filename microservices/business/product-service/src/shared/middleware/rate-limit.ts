/**
 * Rate Limit Middleware
 * Professional rate limiting for product microservice
 */

import { Request, Response, NextFunction } from 'express';
import expressRateLimit from 'express-rate-limit';
import { RateLimitError } from '../errors';

export const createRateLimit = (windowMs: number = 15 * 60 * 1000, max: number = 100) => {
  return expressRateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_ERROR'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      const error = new RateLimitError('Rate limit exceeded');
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code
      });
    }
  });
};

// Default rate limiter
export const rateLimit = createRateLimit();

// Specific rate limiters
export const authRateLimit = createRateLimit(15 * 60 * 1000, 20); // 20 requests per 15 minutes
export const searchRateLimit = createRateLimit(60 * 1000, 60); // 60 requests per minute
export const uploadRateLimit = createRateLimit(60 * 1000, 10); // 10 uploads per minute