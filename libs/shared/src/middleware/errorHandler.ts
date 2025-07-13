/**
 * UltraMarket Standardized Error Handler Middleware
 * Provides consistent error handling across all microservices
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../logging/logger';
import { AppError, createErrorResponse } from '../errors';
import { HttpStatusCode, ErrorCode } from '../types/api-responses';

export interface ErrorHandlerOptions {
  includeStack?: boolean;
  logErrors?: boolean;
  logLevel?: 'error' | 'warn' | 'info';
  requestIdHeader?: string;
  serviceName?: string;
  environment?: string;
}

export class StandardizedErrorHandler {
  private options: Required<ErrorHandlerOptions>;

  constructor(options: ErrorHandlerOptions = {}) {
    this.options = {
      includeStack: process.env.NODE_ENV === 'development',
      logErrors: true,
      logLevel: 'error',
      requestIdHeader: 'x-request-id',
      serviceName: process.env.SERVICE_NAME || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      ...options,
    };
  }

  /**
   * Main error handler middleware
   */
  public handle = (error: Error, req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.headers[this.options.requestIdHeader] as string || 
                     req.headers['x-correlation-id'] as string || 
                     this.generateRequestId();

    // Convert generic errors to AppError if needed
    const appError = this.normalizeError(error, req);

    // Log the error
    if (this.options.logErrors) {
      this.logError(appError, req, requestId);
    }

    // Create standardized error response
    const errorResponse = createErrorResponse(appError, requestId);

    // Add additional context for development
    if (this.options.includeStack) {
      errorResponse.error.stack = appError.stack;
    }

    // Send response
    res.status(appError.statusCode).json(errorResponse);
  };

  /**
   * Normalize different error types to AppError
   */
  private normalizeError(error: Error, req: Request): AppError {
    // If it's already an AppError, return it
    if (error instanceof AppError) {
      return error;
    }

    // Handle common error types
    switch (error.name) {
      case 'ValidationError':
        return new AppError(
          HttpStatusCode.BAD_REQUEST as number,
          error.message,
          ErrorCode.VALIDATION_ERROR,
          this.extractValidationDetails(error)
        );
      
      case 'CastError':
        return new AppError(
          HttpStatusCode.BAD_REQUEST,
          `Invalid format for field: ${(error as any).path}`,
          ErrorCode.INVALID_FORMAT,
          [{ field: (error as any).path, message: 'Invalid format', value: (error as any).value }]
        );
      
      case 'JsonWebTokenError':
        return new AppError(
          HttpStatusCode.UNAUTHORIZED,
          'Invalid token',
          ErrorCode.INVALID_CREDENTIALS
        );
      
      case 'TokenExpiredError':
        return new AppError(
          HttpStatusCode.UNAUTHORIZED,
          'Token has expired',
          ErrorCode.TOKEN_EXPIRED
        );
      
      case 'MongoError':
        return this.handleMongoError(error);
      
      case 'PrismaClientKnownRequestError':
        return this.handlePrismaError(error);
      
      case 'SequelizeValidationError':
        return new AppError(
          HttpStatusCode.BAD_REQUEST,
          'Database validation failed',
          ErrorCode.VALIDATION_ERROR,
          this.extractSequelizeDetails(error)
        );
      
      case 'SequelizeUniqueConstraintError':
        return new AppError(
          HttpStatusCode.CONFLICT,
          'Resource already exists',
          ErrorCode.RESOURCE_ALREADY_EXISTS,
          this.extractSequelizeDetails(error)
        );
      
      case 'AxiosError':
        return this.handleAxiosError(error);
      
      case 'RedisError':
        return new AppError(
          HttpStatusCode.BAD_GATEWAY,
          `Redis error: ${error.message}`,
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          [{ service: 'Redis', message: error.message }],
          false
        );
      
      case 'ElasticsearchError':
        return new AppError(
          HttpStatusCode.BAD_GATEWAY,
          `Elasticsearch error: ${error.message}`,
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          [{ service: 'Elasticsearch', message: error.message }],
          false
        );
      
      default:
        // Check for common error patterns
        if (error.message.includes('not found')) {
          return new AppError(
            HttpStatusCode.NOT_FOUND,
            error.message,
            ErrorCode.RESOURCE_NOT_FOUND
          );
        }
        
        if (error.message.includes('already exists')) {
          return new AppError(
            HttpStatusCode.CONFLICT,
            error.message,
            ErrorCode.RESOURCE_ALREADY_EXISTS
          );
        }
        
        if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          return new AppError(
            HttpStatusCode.FORBIDDEN,
            error.message,
            ErrorCode.INSUFFICIENT_PERMISSIONS
          );
        }
        
        if (error.message.includes('rate limit')) {
          return new AppError(
            HttpStatusCode.TOO_MANY_REQUESTS,
            error.message,
            ErrorCode.RATE_LIMIT_EXCEEDED
          );
        }
        
        // Default to internal server error
        return new AppError(
          HttpStatusCode.INTERNAL_SERVER_ERROR,
          error.message,
          ErrorCode.INTERNAL_ERROR,
          undefined,
          false
        );
    }
  }

  /**
   * Handle MongoDB specific errors
   */
  private handleMongoError(error: any): AppError {
    switch (error.code) {
      case 11000:
        const field = Object.keys(error.keyPattern || {})[0];
        return new AppError(
          HttpStatusCode.CONFLICT,
          `Duplicate value for field: ${field}`,
          ErrorCode.RESOURCE_ALREADY_EXISTS,
          [{ field, value: error.keyValue?.[field] }]
        );
      
      case 121:
        return new AppError(
          HttpStatusCode.BAD_REQUEST,
          'Document validation failed',
          ErrorCode.VALIDATION_ERROR
        );
      
      default:
        return new AppError(
          HttpStatusCode.INTERNAL_SERVER_ERROR,
          `MongoDB error: ${error.message}`,
          ErrorCode.DATABASE_ERROR,
          undefined,
          false
        );
    }
  }

  /**
   * Handle Prisma specific errors
   */
  private handlePrismaError(error: any): AppError {
    switch (error.code) {
      case 'P2002':
        const field = error.meta?.target?.[0] || 'unknown';
        return new AppError(
          HttpStatusCode.CONFLICT,
          `Duplicate value for field: ${field}`,
          ErrorCode.RESOURCE_ALREADY_EXISTS,
          [{ field, value: error.meta?.target }]
        );
      
      case 'P2025':
        return new AppError(
          HttpStatusCode.NOT_FOUND,
          'Record not found',
          ErrorCode.RESOURCE_NOT_FOUND
        );
      
      case 'P2003':
        return new AppError(
          HttpStatusCode.BAD_REQUEST,
          'Foreign key constraint failed',
          ErrorCode.VALIDATION_ERROR
        );
      
      default:
        return new AppError(
          HttpStatusCode.INTERNAL_SERVER_ERROR,
          `Prisma error: ${error.message}`,
          ErrorCode.DATABASE_ERROR,
          undefined,
          false
        );
    }
  }

  /**
   * Handle Axios HTTP errors
   */
  private handleAxiosError(error: any): AppError {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    
    switch (status) {
      case 401:
        return new AppError(
          HttpStatusCode.UNAUTHORIZED,
          message,
          ErrorCode.INVALID_CREDENTIALS
        );
      
      case 403:
        return new AppError(
          HttpStatusCode.FORBIDDEN,
          message,
          ErrorCode.INSUFFICIENT_PERMISSIONS
        );
      
      case 404:
        return new AppError(
          HttpStatusCode.NOT_FOUND,
          'Resource not found',
          ErrorCode.RESOURCE_NOT_FOUND
        );
      
      case 429:
        return new AppError(
          HttpStatusCode.TOO_MANY_REQUESTS,
          message,
          ErrorCode.RATE_LIMIT_EXCEEDED,
          [{ retryAfter: error.response?.headers?.['retry-after'] }]
        );
      
      case 502:
      case 503:
      case 504:
        return new AppError(
          HttpStatusCode.SERVICE_UNAVAILABLE,
          message,
          ErrorCode.SERVICE_UNAVAILABLE,
          undefined,
          false
        );
      
      default:
        return new AppError(
          HttpStatusCode.BAD_GATEWAY,
          `External service error: ${message}`,
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          [{ service: error.config?.url || 'External service', message }],
          false
        );
    }
  }

  /**
   * Extract validation details from various error types
   */
  private extractValidationDetails(error: any): any[] {
    if (error.details) {
      return error.details;
    }
    
    if (error.errors) {
      return Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message,
        value: error.errors[key].value
      }));
    }
    
    return [];
  }

  /**
   * Extract Sequelize error details
   */
  private extractSequelizeDetails(error: any): any[] {
    if (error.errors) {
      return error.errors.map((err: any) => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
    }
    
    return [];
  }

  /**
   * Log error with structured information
   */
  private logError(error: AppError, req: Request, requestId: string): void {
    const logData = {
      requestId,
      service: this.options.serviceName,
      environment: this.options.environment,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        isOperational: error.isOperational,
        details: error.details,
        timestamp: error.timestamp,
      },
      request: {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: (req as any).user?.id,
      },
      stack: this.options.includeStack ? error.stack : undefined,
    };

    if (this.options.logLevel === 'error') {
      logger.error('Application error occurred', logData);
    } else if (this.options.logLevel === 'warn') {
      logger.warn('Application warning', logData);
    } else {
      logger.info('Application error', logData);
    }
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Async error wrapper for route handlers
   */
  public wrapAsync = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  /**
   * Create a middleware that catches unhandled promise rejections
   */
  public handleUnhandledRejections(): void {
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Unhandled Promise Rejection', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise.toString(),
      });
      
      // Don't exit the process in production
      if (this.options.environment === 'production') {
        return;
      }
      
      process.exit(1);
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
      });
      
      // Always exit for uncaught exceptions
      process.exit(1);
    });
  }
}

// Default error handler instance
export const errorHandler = new StandardizedErrorHandler().handle;

// Async wrapper for route handlers
export const asyncHandler = new StandardizedErrorHandler().wrapAsync;