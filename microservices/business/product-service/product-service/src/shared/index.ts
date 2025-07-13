// Shared utilities and types for product-service
// This file provides local implementations of shared functionality

import { createLogger, format, transports } from 'winston';
import jwt from 'jsonwebtoken';

// Create local logger
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'product-service' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, service, ...meta }) => {
          return `${timestamp} [${service}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      ),
    }),
  ],
});

// Error classes
class AppError extends Error {
  statusCode: number;
  code: string;
  details: any;

  constructor(
    statusCode: number,
    message: string,
    code: string = 'INTERNAL_ERROR',
    details: any = {}
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details: any = {}) {
    super(401, message, 'UNAUTHORIZED', details);
  }
}

// Auth functions
const extractTokenFromHeader = (header: string): string | null => {
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }
  return header.split(' ')[1];
};

// Environment validation
const validateEnvironment = () => {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for security');
  }
  
  if (jwtSecret === 'default-jwt-secret-key' || jwtSecret === 'your_jwt_secret') {
    throw new Error('JWT_SECRET cannot use default values in production');
  }
  
  return jwtSecret;
};

const verifyAccessToken = (token: string): JwtPayload => {
  try {
    const secret = validateEnvironment();
    const payload = jwt.verify(token, secret) as JwtPayload;
    return payload;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token format', { error: error.message });
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token has expired', { error: error.message });
    }
    throw new UnauthorizedError('Token verification failed', { error });
  }
};

// Types
interface PaginationParams {
  page?: number;
  limit?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

enum UserRole {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
  VENDOR = 'VENDOR',
  STAFF = 'STAFF',
}

// Export everything
export {
  logger,
  AppError,
  UnauthorizedError,
  extractTokenFromHeader,
  verifyAccessToken,
  PaginationParams,
  PaginatedResponse,
  JwtPayload,
  TokenPair,
  UserRole,
};
