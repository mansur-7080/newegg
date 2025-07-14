import { Request, Response, NextFunction } from 'express';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { MulterError } from 'multer';
import { logger } from '../../libs/shared/src/logger';

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public errors: Record<string, string>;

  constructor(message: string, errors: Record<string, string>) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

// Handle different types of errors
const handlePrismaError = (err: PrismaClientKnownRequestError): AppError => {
  switch (err.code) {
    case 'P2002':
      // Unique constraint violation
      const field = err.meta?.target as string[] | undefined;
      const fieldName = field ? field[0] : 'field';
      return new ConflictError(`${fieldName} already exists`);
    
    case 'P2025':
      // Record not found
      return new NotFoundError('Record');
    
    case 'P2003':
      // Foreign key constraint violation
      return new AppError('Invalid reference to related record', 400, 'FOREIGN_KEY_ERROR');
    
    case 'P2014':
      // Invalid ID
      return new AppError('Invalid ID provided', 400, 'INVALID_ID');
    
    default:
      logger.error('Unhandled Prisma error:', err);
      return new AppError('Database operation failed', 500, 'DATABASE_ERROR');
  }
};

const handlePrismaValidationError = (err: PrismaClientValidationError): AppError => {
  return new AppError('Invalid data provided', 400, 'VALIDATION_ERROR');
};

const handleJWTError = (err: JsonWebTokenError): AppError => {
  if (err instanceof TokenExpiredError) {
    return new AuthenticationError('Token has expired');
  }
  return new AuthenticationError('Invalid token');
};

const handleMulterError = (err: MulterError): AppError => {
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      return new AppError('File too large', 400, 'FILE_TOO_LARGE');
    case 'LIMIT_FILE_COUNT':
      return new AppError('Too many files', 400, 'TOO_MANY_FILES');
    case 'LIMIT_UNEXPECTED_FILE':
      return new AppError('Unexpected file field', 400, 'UNEXPECTED_FILE');
    default:
      return new AppError('File upload error', 400, 'UPLOAD_ERROR');
  }
};

const handleCastError = (): AppError => {
  return new AppError('Invalid data format', 400, 'CAST_ERROR');
};

const sendErrorDev = (err: AppError, res: Response) => {
  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    error: {
      code: err.code,
      message: err.message,
      stack: err.stack,
      ...(err instanceof ValidationError && { errors: err.errors }),
    },
    timestamp: new Date().toISOString(),
  });
};

const sendErrorProd = (err: AppError, res: Response) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    const response: any = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
      timestamp: new Date().toISOString(),
    };

    if (err instanceof ValidationError) {
      response.error.errors = err.errors;
    }

    res.status(err.statusCode).json(response);
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('Unknown error:', err);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

// Global error handling middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Handle different error types
  if (err instanceof PrismaClientKnownRequestError) {
    error = handlePrismaError(err);
  } else if (err instanceof PrismaClientValidationError) {
    error = handlePrismaValidationError(err);
  } else if (err instanceof JsonWebTokenError || err instanceof TokenExpiredError) {
    error = handleJWTError(err);
  } else if (err instanceof MulterError) {
    error = handleMulterError(err);
  } else if (err.name === 'CastError') {
    error = handleCastError();
  } else if (err.name === 'ValidationError') {
    // Joi validation error
    const validationErrors: Record<string, string> = {};
    if ((err as any).details) {
      (err as any).details.forEach((detail: any) => {
        validationErrors[detail.path.join('.')] = detail.message;
      });
    }
    error = new ValidationError('Validation failed', validationErrors);
  } else if (!(err instanceof AppError)) {
    // Unknown error - convert to AppError
    error = new AppError(err.message || 'Something went wrong', 500);
  }

  // Send error response
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error as AppError, res);
  } else {
    sendErrorProd(error as AppError, res);
  }
};

// Async error wrapper
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Close server gracefully
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception:', err);
  // Close server gracefully
  process.exit(1);
});

export default errorHandler;