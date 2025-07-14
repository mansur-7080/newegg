/**
 * Professional Error Handler Middleware for UltraMarket
 * Comprehensive error handling with proper classification and response formatting
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Custom error classes
export class AuthError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code: string;

  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = 'AUTH_ERROR';
  }
}

export class ValidationError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code: string;
  public details?: any;

  constructor(message: string, details?: any, statusCode: number = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = 'VALIDATION_ERROR';
    this.details = details;
  }
}

export class NotFoundError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code: string;

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
    this.isOperational = true;
    this.code = 'NOT_FOUND';
  }
}

export class ConflictError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code: string;

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
    this.isOperational = true;
    this.code = 'CONFLICT';
  }
}

export class RateLimitError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code: string;

  constructor(message: string = 'Too many requests') {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = 429;
    this.isOperational = true;
    this.code = 'RATE_LIMIT_EXCEEDED';
  }
}

export class DatabaseError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code: string;
  public originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = 500;
    this.isOperational = true;
    this.code = 'DATABASE_ERROR';
    this.originalError = originalError;
  }
}

export class ExternalServiceError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code: string;
  public service: string;

  constructor(message: string, service: string) {
    super(message);
    this.name = 'ExternalServiceError';
    this.statusCode = 502;
    this.isOperational = true;
    this.code = 'EXTERNAL_SERVICE_ERROR';
    this.service = service;
  }
}

// Error handler middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error with context
  logger.error('Error occurred', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
    },
  });

  // Determine error type and create appropriate response
  let statusCode = 500;
  let errorResponse: any = {
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    },
  };

  // Handle custom error types
  if (error instanceof AuthError) {
    statusCode = error.statusCode;
    errorResponse.error = {
      message: error.message,
      code: error.code,
    };
  } else if (error instanceof ValidationError) {
    statusCode = error.statusCode;
    errorResponse.error = {
      message: error.message,
      code: error.code,
      details: error.details,
    };
  } else if (error instanceof NotFoundError) {
    statusCode = error.statusCode;
    errorResponse.error = {
      message: error.message,
      code: error.code,
    };
  } else if (error instanceof ConflictError) {
    statusCode = error.statusCode;
    errorResponse.error = {
      message: error.message,
      code: error.code,
    };
  } else if (error instanceof RateLimitError) {
    statusCode = error.statusCode;
    errorResponse.error = {
      message: error.message,
      code: error.code,
    };
  } else if (error instanceof DatabaseError) {
    statusCode = error.statusCode;
    errorResponse.error = {
      message: 'Database operation failed',
      code: error.code,
    };
  } else if (error instanceof ExternalServiceError) {
    statusCode = error.statusCode;
    errorResponse.error = {
      message: `External service (${error.service}) is unavailable`,
      code: error.code,
    };
  } else {
    // Handle generic errors
    switch (error.name) {
      case 'ValidationError':
        statusCode = 400;
        errorResponse.error = {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: (error as any).errors,
        };
        break;

      case 'CastError':
        statusCode = 400;
        errorResponse.error = {
          message: 'Invalid ID format',
          code: 'INVALID_ID',
        };
        break;

      case 'MongoError':
        if ((error as any).code === 11000) {
          statusCode = 409;
          errorResponse.error = {
            message: 'Duplicate entry',
            code: 'DUPLICATE_ENTRY',
            details: (error as any).keyValue,
          };
        } else {
          statusCode = 500;
          errorResponse.error = {
            message: 'Database error',
            code: 'DATABASE_ERROR',
          };
        }
        break;

      case 'JsonWebTokenError':
        statusCode = 401;
        errorResponse.error = {
          message: 'Invalid token',
          code: 'INVALID_TOKEN',
        };
        break;

      case 'TokenExpiredError':
        statusCode = 401;
        errorResponse.error = {
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
        };
        break;

      case 'SyntaxError':
        statusCode = 400;
        errorResponse.error = {
          message: 'Invalid JSON',
          code: 'INVALID_JSON',
        };
        break;

      default:
        // For unknown errors, don't expose internal details in production
        if (process.env.NODE_ENV === 'production') {
          errorResponse.error = {
            message: 'Internal server error',
            code: 'INTERNAL_SERVER_ERROR',
          };
        } else {
          errorResponse.error = {
            message: error.message,
            code: 'UNKNOWN_ERROR',
            stack: error.stack,
          };
        }
    }
  }

  // Add request ID for tracking
  errorResponse.requestId = req.headers['x-request-id'] || 'unknown';

  // Add timestamp
  errorResponse.timestamp = new Date().toISOString();

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error response formatter
export const formatErrorResponse = (error: Error, req: Request) => {
  const baseResponse = {
    success: false,
    requestId: req.headers['x-request-id'] || 'unknown',
    timestamp: new Date().toISOString(),
  };

  if (error instanceof AuthError) {
    return {
      ...baseResponse,
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
      },
    };
  }

  if (error instanceof ValidationError) {
    return {
      ...baseResponse,
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
      },
    };
  }

  // Default error response
  return {
    ...baseResponse,
    error: {
      message: error.message,
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
    },
  };
};

// Error logging utility
export const logError = (error: Error, context?: any) => {
  const errorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...context,
  };

  logger.error('Application error', errorInfo);
};

// Error monitoring utility
export const monitorError = (error: Error, req: Request) => {
  // Log error with request context
  logger.error('Error monitored', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
    },
    timestamp: new Date().toISOString(),
  });

  // In production, you might want to send to external monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Send to Sentry, DataDog, or other monitoring service
    // Example: Sentry.captureException(error);
  }
};

// Error recovery utility
export const handleUncaughtException = (error: Error) => {
  logger.error('Uncaught Exception', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  });

  // Gracefully shutdown the application
  process.exit(1);
};

export const handleUnhandledRejection = (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? {
      name: reason.name,
      message: reason.message,
      stack: reason.stack,
    } : reason,
    promise: promise.toString(),
  });

  // Gracefully shutdown the application
  process.exit(1);
};

// Set up global error handlers
process.on('uncaughtException', handleUncaughtException);
process.on('unhandledRejection', handleUnhandledRejection);
