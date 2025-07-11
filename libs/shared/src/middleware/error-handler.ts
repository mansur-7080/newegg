/**
 * UltraMarket Error Handler Middleware
 * Professional error handling for Express applications
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../logging/logger';

// =================== ERROR TYPES ===================

export interface ErrorDetail {
  code: string;
  message: string;
  field?: string;
  value?: any;
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    code: string;
    details?: ErrorDetail[];
    timestamp: Date;
    path: string;
    method: string;
    correlationId?: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ErrorDetail;
  meta?: {
    timestamp: Date;
    version: string;
    correlationId?: string;
  };
}

// =================== CUSTOM ERROR CLASSES ===================

export class ValidationError extends Error {
  public code: string;
  public details: ErrorDetail[];
  public statusCode: number;

  constructor(message: string, details: ErrorDetail[] = [], code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.details = details;
    this.statusCode = 400;
  }
}

export class AuthenticationError extends Error {
  public code: string;
  public statusCode: number;

  constructor(message: string = 'Authentication failed', code = 'AUTHENTICATION_ERROR') {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
    this.statusCode = 401;
  }
}

export class AuthorizationError extends Error {
  public code: string;
  public statusCode: number;

  constructor(message: string = 'Access denied', code = 'AUTHORIZATION_ERROR') {
    super(message);
    this.name = 'AuthorizationError';
    this.code = code;
    this.statusCode = 403;
  }
}

export class NotFoundError extends Error {
  public code: string;
  public statusCode: number;

  constructor(message: string = 'Resource not found', code = 'NOT_FOUND_ERROR') {
    super(message);
    this.name = 'NotFoundError';
    this.code = code;
    this.statusCode = 404;
  }
}

export class ConflictError extends Error {
  public code: string;
  public statusCode: number;

  constructor(message: string = 'Resource conflict', code = 'CONFLICT_ERROR') {
    super(message);
    this.name = 'ConflictError';
    this.code = code;
    this.statusCode = 409;
  }
}

export class RateLimitError extends Error {
  public code: string;
  public statusCode: number;
  public retryAfter: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter = 60, code = 'RATE_LIMIT_ERROR') {
    super(message);
    this.name = 'RateLimitError';
    this.code = code;
    this.statusCode = 429;
    this.retryAfter = retryAfter;
  }
}

export class DatabaseError extends Error {
  public code: string;
  public statusCode: number;
  public originalError?: Error;

  constructor(message: string = 'Database operation failed', originalError?: Error, code = 'DATABASE_ERROR') {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.statusCode = 500;
    this.originalError = originalError;
  }
}

export class ExternalServiceError extends Error {
  public code: string;
  public statusCode: number;
  public service: string;
  public originalError?: Error;

  constructor(message: string, service: string, originalError?: Error, code = 'EXTERNAL_SERVICE_ERROR') {
    super(message);
    this.name = 'ExternalServiceError';
    this.code = code;
    this.statusCode = 502;
    this.service = service;
    this.originalError = originalError;
  }
}

// =================== ERROR HANDLER MIDDLEWARE ===================

/**
 * Professional error handling middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate correlation ID for tracking
  const correlationId = req.headers['x-correlation-id'] as string || 
    `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Log error with context
  logger.error('Request error occurred', {
    error: error.message,
    stack: error.stack,
    correlationId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.id,
  });

  // Handle known error types
  if (error instanceof ValidationError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        details: error.details,
        timestamp: new Date(),
        path: req.originalUrl,
        method: req.method,
        correlationId,
      },
    });
    return;
  }

  if (error instanceof AuthenticationError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        timestamp: new Date(),
        path: req.originalUrl,
        method: req.method,
        correlationId,
      },
    });
    return;
  }

  if (error instanceof AuthorizationError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        timestamp: new Date(),
        path: req.originalUrl,
        method: req.method,
        correlationId,
      },
    });
    return;
  }

  if (error instanceof NotFoundError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        timestamp: new Date(),
        path: req.originalUrl,
        method: req.method,
        correlationId,
      },
    });
    return;
  }

  if (error instanceof ConflictError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        timestamp: new Date(),
        path: req.originalUrl,
        method: req.method,
        correlationId,
      },
    });
    return;
  }

  if (error instanceof RateLimitError) {
    res.status(error.statusCode)
      .set('Retry-After', error.retryAfter.toString())
      .json({
        success: false,
        error: {
          message: error.message,
          code: error.code,
          timestamp: new Date(),
          path: req.originalUrl,
          method: req.method,
          correlationId,
        },
      });
    return;
  }

  if (error instanceof DatabaseError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        message: 'Database operation failed',
        code: error.code,
        timestamp: new Date(),
        path: req.originalUrl,
        method: req.method,
        correlationId,
      },
    });
    return;
  }

  if (error instanceof ExternalServiceError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        message: `External service (${error.service}) is temporarily unavailable`,
        code: error.code,
        timestamp: new Date(),
        path: req.originalUrl,
        method: req.method,
        correlationId,
      },
    });
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token',
        code: 'INVALID_TOKEN',
        timestamp: new Date(),
        path: req.originalUrl,
        method: req.method,
        correlationId,
      },
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: {
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
        timestamp: new Date(),
        path: req.originalUrl,
        method: req.method,
        correlationId,
      },
    });
    return;
  }

  // Handle validation errors from libraries
  if (error.name === 'ValidationError' && (error as any).isJoi) {
    const joiError = error as any;
    const details: ErrorDetail[] = joiError.details.map((detail: any) => ({
      code: 'VALIDATION_ERROR',
      message: detail.message,
      field: detail.path.join('.'),
      value: detail.context?.value,
    }));

    res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details,
        timestamp: new Date(),
        path: req.originalUrl,
        method: req.method,
        correlationId,
      },
    });
    return;
  }

  // Handle MongoDB errors
  if (error.name === 'MongoError' || error.name === 'MongooseError') {
    res.status(500).json({
      success: false,
      error: {
        message: 'Database operation failed',
        code: 'DATABASE_ERROR',
        timestamp: new Date(),
        path: req.originalUrl,
        method: req.method,
        correlationId,
      },
    });
    return;
  }

  // Default error response
  const statusCode = (error as any).statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date(),
      path: req.originalUrl,
      method: req.method,
      correlationId,
    },
  });
}

// =================== REQUEST LOGGER MIDDLEWARE ===================

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const correlationId = req.headers['x-correlation-id'] as string || 
    `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add correlation ID to request
  req.headers['x-correlation-id'] = correlationId;

  // Log request start
  logger.info('Request started', {
    method: req.method,
    url: req.originalUrl,
    correlationId,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.id,
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      correlationId,
      userId: (req as any).user?.id,
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
}

// =================== NOT FOUND HANDLER ===================

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  const correlationId = req.headers['x-correlation-id'] as string || 
    `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    correlationId,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
      timestamp: new Date(),
      path: req.originalUrl,
      method: req.method,
      correlationId,
    },
  });
}

// =================== EXPORTS ===================

export {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  errorHandler,
  requestLogger,
  notFoundHandler,
};

export type {
  ErrorDetail,
  ApiError,
  ApiResponse,
};
