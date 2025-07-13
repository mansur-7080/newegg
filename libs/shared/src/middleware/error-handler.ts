/**
 * UltraMarket Error Handler Middleware
 * Professional error handling for Express applications
 */

import { Request, Response, NextFunction } from 'express';
import winston from 'winston';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'shared-error-handler' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export interface ErrorDetail {
  code: string;
  message: string;
  field?: string;
  value?: any;
}

export interface ApiError {
  success: false;
  error: ErrorDetail;
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
}

export class ValidationError extends Error {
  public readonly statusCode: number = 400;
  public readonly code: string = 'VALIDATION_ERROR';
  public readonly details: ErrorDetail[];

  constructor(message: string, details: ErrorDetail[] = []) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class AuthenticationError extends Error {
  public readonly statusCode: number = 401;
  public readonly code: string = 'AUTHENTICATION_ERROR';

  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  public readonly statusCode: number = 403;
  public readonly code: string = 'AUTHORIZATION_ERROR';

  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  public readonly statusCode: number = 404;
  public readonly code: string = 'NOT_FOUND_ERROR';

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  public readonly statusCode: number = 409;
  public readonly code: string = 'CONFLICT_ERROR';

  constructor(message: string = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error {
  public readonly statusCode: number = 429;
  public readonly code: string = 'RATE_LIMIT_ERROR';

  constructor(message: string = 'Too many requests') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends Error {
  public readonly statusCode: number = 500;
  public readonly code: string = 'DATABASE_ERROR';

  constructor(message: string = 'Database operation failed') {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends Error {
  public readonly statusCode: number = 502;
  public readonly code: string = 'EXTERNAL_SERVICE_ERROR';

  constructor(message: string = 'External service unavailable') {
    super(message);
    this.name = 'ExternalServiceError';
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate request ID for tracking
  const requestId = req.headers['x-request-id'] as string || generateRequestId();

  // Log error with context
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId,
    userId: (req as any).user?.id,
  });

  // Handle known error types
  if (error instanceof ValidationError) {
    const apiError: ApiError = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      requestId,
    };

    res.status(error.statusCode).json(apiError);
    return;
  }

  if (error instanceof AuthenticationError) {
    const apiError: ApiError = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      requestId,
    };

    res.status(error.statusCode).json(apiError);
    return;
  }

  if (error instanceof AuthorizationError) {
    const apiError: ApiError = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      requestId,
    };

    res.status(error.statusCode).json(apiError);
    return;
  }

  if (error instanceof NotFoundError) {
    const apiError: ApiError = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      requestId,
    };

    res.status(error.statusCode).json(apiError);
    return;
  }

  if (error instanceof ConflictError) {
    const apiError: ApiError = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      requestId,
    };

    res.status(error.statusCode).json(apiError);
    return;
  }

  if (error instanceof RateLimitError) {
    const apiError: ApiError = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      requestId,
    };

    res.status(error.statusCode).json(apiError);
    return;
  }

  if (error instanceof DatabaseError) {
    const apiError: ApiError = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      requestId,
    };

    res.status(error.statusCode).json(apiError);
    return;
  }

  if (error instanceof ExternalServiceError) {
    const apiError: ApiError = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      requestId,
    };

    res.status(error.statusCode).json(apiError);
    return;
  }

  // Handle unknown errors
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const apiError: ApiError = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isDevelopment ? error.message : 'An unexpected error occurred',
    },
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    requestId,
  };

  res.status(500).json(apiError);
};

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation error helper
 */
export const createValidationError = (message: string, details: ErrorDetail[] = []): ValidationError => {
  return new ValidationError(message, details);
};

/**
 * Authentication error helper
 */
export const createAuthenticationError = (message?: string): AuthenticationError => {
  return new AuthenticationError(message);
};

/**
 * Authorization error helper
 */
export const createAuthorizationError = (message?: string): AuthorizationError => {
  return new AuthorizationError(message);
};

/**
 * Not found error helper
 */
export const createNotFoundError = (message?: string): NotFoundError => {
  return new NotFoundError(message);
};

/**
 * Conflict error helper
 */
export const createConflictError = (message?: string): ConflictError => {
  return new ConflictError(message);
};

/**
 * Rate limit error helper
 */
export const createRateLimitError = (message?: string): RateLimitError => {
  return new RateLimitError(message);
};

/**
 * Database error helper
 */
export const createDatabaseError = (message?: string): DatabaseError => {
  return new DatabaseError(message);
};

/**
 * External service error helper
 */
export const createExternalServiceError = (message?: string): ExternalServiceError => {
  return new ExternalServiceError(message);
};
