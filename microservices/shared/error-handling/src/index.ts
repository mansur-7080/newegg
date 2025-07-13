import { Request, Response, NextFunction } from 'express';

// Add the request ID property to Express Request
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

// Base error class
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code || getErrorCodeFromStatus(statusCode);
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'TOO_MANY_REQUESTS');
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details?: any) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string = 'External service error', details?: any) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', details);
  }
}

// Error handler interface
export interface ErrorHandler {
  handle(error: Error, req: Request, res: Response, next: NextFunction): void;
}

// Default error handler implementation
export class DefaultErrorHandler implements ErrorHandler {
  private logger: any;

  constructor(logger: any) {
    this.logger = logger;
  }

  handle(error: Error, req: Request, res: Response, next: NextFunction): void {
    let statusCode = 500;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';
    let details: any = {};
    let isOperational = false;

    // Get request ID for error tracking
    const requestId = req.id || req.header('X-Request-ID') || 'unknown';

    // Handle custom application errors
    if (error instanceof AppError) {
      statusCode = error.statusCode;
      message = error.message;
      isOperational = error.isOperational;
      errorCode = error.code;
      details = error.details || {};
    }

    // Handle database errors
    else if (this.isDatabaseError(error)) {
      const dbError = this.handleDatabaseError(error);
      statusCode = dbError.statusCode;
      message = dbError.message;
      errorCode = dbError.code;
      details = dbError.details;
      isOperational = true;
    }

    // Handle authentication errors
    else if (this.isAuthenticationError(error)) {
      const authError = this.handleAuthenticationError(error);
      statusCode = authError.statusCode;
      message = authError.message;
      errorCode = authError.code;
      isOperational = true;
    }

    // Handle file upload errors
    else if (error.name === 'MulterError') {
      const uploadError = this.handleFileUploadError(error);
      statusCode = uploadError.statusCode;
      message = uploadError.message;
      errorCode = uploadError.code;
      details = uploadError.details;
      isOperational = true;
    }

    // Handle network errors
    else if (this.isNetworkError(error)) {
      statusCode = 503;
      message = 'Service temporarily unavailable';
      errorCode = 'SERVICE_UNAVAILABLE';
      isOperational = true;
    }

    // Log error with proper level based on severity
    const logLevel = isOperational ? 'warn' : 'error';
    this.logger[logLevel](`${req.method} ${req.path} - ${statusCode} ${errorCode}`, {
      error: {
        message,
        name: error.name,
        code: errorCode,
        stack: isOperational ? undefined : error.stack,
      },
      request: {
        id: requestId,
        method: req.method,
        path: req.path,
        params: req.params,
        query: req.query,
        body: req.body,
      },
      user: (req as any).user?.userId || 'anonymous',
      timestamp: new Date().toISOString(),
    });

    // Send standardized response format
    const response: any = {
      success: false,
      error: {
        code: errorCode,
        message,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    };

    // Include details if available
    if (Object.keys(details).length > 0) {
      response.error.details = details;
    }

    // Include stack trace in development mode
    if (process.env.NODE_ENV === 'development') {
      response.error.stack = error.stack;
    }

    res.status(statusCode).json(response);
  }

  private isDatabaseError(error: Error): boolean {
    return (
      error.name === 'ValidationError' ||
      error.name === 'CastError' ||
      error.name === 'MongoServerError' ||
      error.name === 'PrismaClientKnownRequestError' ||
      error.name === 'PrismaClientUnknownRequestError' ||
      error.name === 'PrismaClientValidationError'
    );
  }

  private handleDatabaseError(error: Error): { statusCode: number; message: string; code: string; details: any } {
    if (error.name === 'ValidationError') {
      const errors = (error as any).errors || {};
      const validationErrors = Object.keys(errors).reduce(
        (acc, field) => {
          acc[field] = errors[field].message || 'Invalid value';
          return acc;
        },
        {} as Record<string, string>
      );

      return {
        statusCode: 400,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: { validationErrors },
      };
    }

    if (error.name === 'CastError') {
      const castError = error as any;
      return {
        statusCode: 400,
        message: `Invalid ${castError.kind || 'value'} for ${castError.path || 'field'}`,
        code: 'INVALID_FORMAT',
        details: {
          field: castError.path,
          type: castError.kind,
          value: castError.value,
        },
      };
    }

    if (error.name === 'MongoServerError' && (error as any).code === 11000) {
      const duplicateKey = Object.keys((error as any).keyPattern || {})[0] || 'field';
      return {
        statusCode: 409,
        message: `Duplicate value for ${duplicateKey}`,
        code: 'DUPLICATE_ENTRY',
        details: {
          field: duplicateKey,
          value: ((error as any).keyValue || {})[duplicateKey],
        },
      };
    }

    if (error.name === 'PrismaClientKnownRequestError') {
      const prismaError = error as any;
      switch (prismaError.code) {
        case 'P2002':
          return {
            statusCode: 409,
            message: 'Resource already exists',
            code: 'DUPLICATE_ENTRY',
            details: { field: prismaError.meta?.target?.[0] || 'unknown' },
          };
        case 'P2025':
          return {
            statusCode: 404,
            message: 'Resource not found',
            code: 'NOT_FOUND',
            details: {},
          };
        case 'P2003':
          return {
            statusCode: 400,
            message: 'Foreign key constraint failed',
            code: 'FOREIGN_KEY_CONSTRAINT',
            details: { code: prismaError.code },
          };
        default:
          return {
            statusCode: 400,
            message: 'Database operation failed',
            code: 'DATABASE_ERROR',
            details: { code: prismaError.code },
          };
      }
    }

    return {
      statusCode: 500,
      message: 'Database operation failed',
      code: 'DATABASE_ERROR',
      details: {},
    };
  }

  private isAuthenticationError(error: Error): boolean {
    return error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError';
  }

  private handleAuthenticationError(error: Error): { statusCode: number; message: string; code: string } {
    if (error.name === 'JsonWebTokenError') {
      return {
        statusCode: 401,
        message: 'Invalid authentication token',
        code: 'INVALID_TOKEN',
      };
    }

    if (error.name === 'TokenExpiredError') {
      return {
        statusCode: 401,
        message: 'Authentication token expired',
        code: 'TOKEN_EXPIRED',
      };
    }

    return {
      statusCode: 401,
      message: 'Authentication failed',
      code: 'AUTHENTICATION_ERROR',
    };
  }

  private handleFileUploadError(error: Error): { statusCode: number; message: string; code: string; details: any } {
    const multerError = error as any;
    const message = this.getMulterErrorMessage(multerError.code, multerError.field);
    const code = `FILE_UPLOAD_ERROR_${multerError.code?.toUpperCase() || 'UNKNOWN'}`;

    return {
      statusCode: 400,
      message,
      code,
      details: {
        field: multerError.field,
        type: multerError.code,
        fileSize: multerError.size,
      },
    };
  }

  private isNetworkError(error: Error): boolean {
    return (
      error.name === 'MongoNetworkError' ||
      error.message?.includes('ECONNREFUSED') ||
      error.message?.includes('ETIMEDOUT') ||
      error.message?.includes('ENOTFOUND')
    );
  }

  private getMulterErrorMessage(code: string, field: string = 'file'): string {
    const codeMessages: Record<string, string> = {
      LIMIT_PART_COUNT: 'Too many parts in the multipart form',
      LIMIT_FILE_SIZE: `File ${field} is too large`,
      LIMIT_FILE_COUNT: 'Too many files uploaded',
      LIMIT_FIELD_KEY: 'Field name is too long',
      LIMIT_FIELD_VALUE: 'Field value is too long',
      LIMIT_FIELD_COUNT: 'Too many fields in form',
      LIMIT_UNEXPECTED_FILE: `Unexpected field ${field}`,
      MISSING_FIELD_NAME: 'Field name missing',
    };

    return codeMessages[code] || `Error uploading file ${field}`;
  }
}

// Async error handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error handler factory
export const createErrorHandler = (logger: any): ErrorHandler => {
  return new DefaultErrorHandler(logger);
};

// Map HTTP status codes to standardized error codes
const getErrorCodeFromStatus = (statusCode: number): string => {
  const statusCodeMap: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
  };

  return statusCodeMap[statusCode] || 'INTERNAL_SERVER_ERROR';
};