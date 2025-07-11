/**
 * UltraMarket Error Handler Middleware
 * Professional error handling for Express applications
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../logging/logger';

// Node.js types are already available

// Professional error classes
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR', true);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR', true);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR', true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR', true);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR', true);
  }
}

// Professional API response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// Professional error response formatter
export function formatErrorResponse(
  error: AppError | Error,
  requestId?: string
): ApiResponse {
  const timestamp = new Date().toISOString();
  
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp,
        requestId,
      },
    };
  }

  // Handle unknown errors
  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message,
      details: process.env.NODE_ENV === 'production' ? undefined : error.stack,
      timestamp,
      requestId,
    },
  };
}

// Professional error logging
export function logError(
  error: AppError | Error,
  req: Request,
  operation?: string
): void {
  const errorData = {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.headers['x-request-id'] as string,
    operation,
    service: process.env.APP_NAME || 'unknown',
    timestamp: new Date().toISOString(),
  };

  if (error instanceof AppError) {
    errorData['statusCode'] = error.statusCode;
    errorData['code'] = error.code;
    errorData['details'] = error.details;
  }

  logger.error('Request error occurred', errorData);
}

// Professional error handling middleware
export function errorHandler(
  error: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  logError(error, req);

  // Format the response
  const requestId = req.headers['x-request-id'] as string;
  const response = formatErrorResponse(error, requestId);

  // Set appropriate status code
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  res.status(statusCode).json(response);
}

// Professional async error wrapper
export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: T, res: U, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Professional request ID middleware
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  next();
}

// Professional not found handler
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error = new NotFoundError('Endpoint');
  next(error);
}

// Professional validation error handler
export function handleValidationError(error: any): ValidationError {
  const details = error.details?.map((detail: any) => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value,
  })) || [];

  return new ValidationError('Validation failed', details);
}

// Professional database error handler
export function handleDatabaseError(error: any): AppError {
  // Handle Prisma errors
  if (error.code) {
    switch (error.code) {
      case 'P2002':
        return new ConflictError('Resource already exists');
      case 'P2025':
        return new NotFoundError('Record');
      case 'P2003':
        return new ValidationError('Foreign key constraint failed');
      default:
        return new AppError('Database operation failed', 500, 'DATABASE_ERROR');
    }
  }

  // Handle other database errors
  if (error.message?.includes('duplicate key')) {
    return new ConflictError('Resource already exists');
  }

  if (error.message?.includes('not found')) {
    return new NotFoundError('Record');
  }

  return new AppError('Database operation failed', 500, 'DATABASE_ERROR');
}

// Professional rate limiting error handler
export function handleRateLimitError(req: Request): RateLimitError {
  const retryAfter = req.headers['retry-after'] as string;
  const error = new RateLimitError('Too many requests');
  
  if (retryAfter) {
    error.details = { retryAfter };
  }
  
  return error;
}

// Professional error monitoring
export function setupErrorMonitoring(): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack,
      service: process.env.APP_NAME || 'unknown',
      timestamp: new Date().toISOString(),
    });
    
    // Graceful shutdown
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection', {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined,
      service: process.env.APP_NAME || 'unknown',
      timestamp: new Date().toISOString(),
    });
    
    // Graceful shutdown
    process.exit(1);
  });
}

// All classes and functions are already exported above
