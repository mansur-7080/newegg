// Local shared module to replace problematic @ultramarket/shared imports
import winston from 'winston';
import jwt from 'jsonwebtoken';

// Logger implementation
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'product-service' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Error classes
export class AppError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ValidationError extends Error {
  statusCode = 400;
  constructor(message = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

// Create error helper
export const createError = (statusCode: number, message: string) => {
  const error = new Error(message) as any;
  error.statusCode = statusCode;
  return error;
};

// Types
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Auth helpers
export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    if (typeof payload === 'string') {
      throw new UnauthorizedError('Invalid token format');
    }
    return payload as JwtPayload;
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
};

export const extractTokenFromHeader = (authHeader?: string) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

// Error handler middleware
export const errorHandler = (err: any, req: any, res: any, next: any) => {
  logger.error('Error occurred:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};
