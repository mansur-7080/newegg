import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AppError, HttpStatusCode, ErrorCode, ResourceNotFoundError, BusinessRuleViolationError, AuthorizationError, ValidationError } from '../../libs/shared';

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500);
  }
}

// Error handler middleware
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: any = {};

  // Handle custom errors
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  }

  // Handle Prisma errors
  else if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;

    switch (prismaError.code) {
      case 'P2002':
        statusCode = 409;
        message = 'Resource already exists';
        details = { field: prismaError.meta?.target };
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Resource not found';
        break;
      case 'P2014':
        statusCode = 400;
        message = 'Invalid data provided';
        break;
      default:
        statusCode = 400;
        message = 'Database operation failed';
    }
  }

  // Handle Joi validation errors
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = { errors: (error as any).details };
  }

  // Handle JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Handle Redis errors
  else if (error.name === 'RedisError') {
    statusCode = 503;
    message = 'Service temporarily unavailable';
  }

  // Log error
  logger.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    statusCode,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.userId,
    timestamp: new Date().toISOString(),
  });

  // Send error response
  const errorResponse: any = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  };

  // Include details in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
    errorResponse.details = details;
  }

  res.status(statusCode).json(errorResponse);
};

// Async error handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
