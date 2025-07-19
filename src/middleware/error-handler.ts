import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

// Custom error class
export class CustomError extends Error implements AppError {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation error handler
const handleValidationError = (err: any): CustomError => {
  const errors = Object.values(err.errors).map((el: any) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new CustomError(message, 400);
};

// Database duplicate key error handler
const handleDuplicateKeyError = (err: any): CustomError => {
  const value = err.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new CustomError(message, 400);
};

// JWT error handler
const handleJWTError = (): CustomError =>
  new CustomError('Invalid token. Please log in again!', 401);

// JWT expired error handler
const handleJWTExpiredError = (): CustomError =>
  new CustomError('Your token has expired! Please log in again.', 401);

// Send error response for development
const sendErrorDev = (err: AppError, res: Response) => {
  res.status(err.statusCode || 500).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

// Send error response for production
const sendErrorProd = (err: AppError, res: Response) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode || 500).json({
      status: err.status,
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR 💥', err);

    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Main error handling middleware
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error details
  logger.error('Error caught by middleware:', {
    message: error.message,
    statusCode: error.statusCode,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    stack: error.stack
  });

  // Handle different types of errors
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = new CustomError(message, 404);
  }

  if (err.code === 11000) {
    error = handleDuplicateKeyError(err);
  }

  if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  }

  if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }

  if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  // Send error response
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

// Async error wrapper
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};