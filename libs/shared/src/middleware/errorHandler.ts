import { Request, Response, NextFunction } from 'express';
import { AppError, HttpStatusCode, ErrorCode } from '../errors';
import { logger } from '../logging';

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    timestamp: string;
    path: string;
    requestId?: string;
  };
}

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const timestamp = new Date().toISOString();
  const path = req.originalUrl;
  const requestId = req.headers['x-request-id'] as string;
  
  // Determine error type and status code
  let statusCode = HttpStatusCode.INTERNAL_SERVER_ERROR;
  let errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
  let message = 'Internal Server Error';
  
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorCode = error.errorCode;
    message = error.message;
  } else if (error.name === 'ValidationError') {
    statusCode = HttpStatusCode.BAD_REQUEST;
    errorCode = ErrorCode.VALIDATION_ERROR;
    message = error.message;
  } else if (error.name === 'CastError') {
    statusCode = HttpStatusCode.BAD_REQUEST;
    errorCode = ErrorCode.VALIDATION_ERROR;
    message = 'Invalid data format';
  } else if (error.name === 'MongoError' && (error as any).code === 11000) {
    statusCode = HttpStatusCode.CONFLICT;
    errorCode = ErrorCode.DUPLICATE_ENTRY;
    message = 'Duplicate entry found';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = HttpStatusCode.UNAUTHORIZED;
    errorCode = ErrorCode.INVALID_TOKEN;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = HttpStatusCode.UNAUTHORIZED;
    errorCode = ErrorCode.TOKEN_EXPIRED;
    message = 'Token expired';
  }
  
  // Log error with structured information
  logger.error('Error occurred', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: errorCode,
      statusCode
    },
    request: {
      method: req.method,
      path,
      requestId,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    },
    timestamp
  });
  
  // Create standardized error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message,
      code: errorCode,
      statusCode,
      timestamp,
      path,
      requestId
    }
  };
  
  // Send response
  res.status(statusCode).json(errorResponse);
};

export default errorHandler;
