import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  // Log error details
  logger.error('Request error:', {
    error: {
      message: error.message,
      stack: error.stack,
      statusCode,
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
    },
    timestamp: new Date().toISOString(),
  });

  // Handle specific error types
  if (error.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (error.name === 'UnauthorizedError' || statusCode === 401) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (error.name === 'ForbiddenError' || statusCode === 403) {
    res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Insufficient permissions',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (statusCode === 404) {
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: 'Resource not found',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle multer errors
  if (error.name === 'MulterError') {
    let multerMessage = 'File upload error';
    let multerStatusCode = 400;

    switch ((error as any).code) {
      case 'LIMIT_FILE_SIZE':
        multerMessage = 'File size too large';
        break;
      case 'LIMIT_FILE_COUNT':
        multerMessage = 'Too many files';
        break;
      case 'LIMIT_FIELD_KEY':
        multerMessage = 'Field name too long';
        break;
      case 'LIMIT_FIELD_VALUE':
        multerMessage = 'Field value too long';
        break;
      case 'LIMIT_FIELD_COUNT':
        multerMessage = 'Too many fields';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        multerMessage = 'Unexpected file field';
        break;
      case 'MISSING_FIELD_NAME':
        multerMessage = 'Missing field name';
        break;
      default:
        multerMessage = error.message;
    }

    res.status(multerStatusCode).json({
      success: false,
      error: 'File Upload Error',
      message: multerMessage,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Default error response
  res.status(statusCode).json({
    success: false,
    error: statusCode >= 500 ? 'Internal Server Error' : 'Client Error',
    message: statusCode >= 500 ? 'Something went wrong on our end' : message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error,
    }),
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};