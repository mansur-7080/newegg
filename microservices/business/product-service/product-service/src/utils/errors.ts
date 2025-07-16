/**
 * Custom application error class
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/**
 * Conflict error
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: any) {
    super(message, 500, 'DATABASE_ERROR', originalError);
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, originalError?: any) {
    super(`External service error (${service}): ${message}`, 503, 'EXTERNAL_SERVICE_ERROR', originalError);
  }
}

/**
 * Business logic error
 */
export class BusinessError extends AppError {
  constructor(message: string, code: string, details?: any) {
    super(message, 400, code, details);
  }
}

/**
 * Error type guards
 */
export const isAppError = (error: any): error is AppError => {
  return error instanceof AppError;
};

export const isOperationalError = (error: any): boolean => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};

/**
 * Error code constants
 */
export const ErrorCodes = {
  // General
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Product specific
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  INVALID_PRODUCT_DATA: 'INVALID_PRODUCT_DATA',
  DUPLICATE_SKU: 'DUPLICATE_SKU',
  INVALID_PRICE: 'INVALID_PRICE',
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',

  // Inventory specific
  INSUFFICIENT_INVENTORY: 'INSUFFICIENT_INVENTORY',
  INVENTORY_NOT_FOUND: 'INVENTORY_NOT_FOUND',
  INVALID_QUANTITY: 'INVALID_QUANTITY',
  RESERVATION_FAILED: 'RESERVATION_FAILED',

  // Business logic
  INVALID_OPERATION: 'INVALID_OPERATION',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
} as const;

/**
 * Map Prisma errors to app errors
 */
export const handlePrismaError = (error: any): AppError => {
  switch (error.code) {
    case 'P2002':
      return new ConflictError('Unique constraint violation', {
        field: error.meta?.target,
      });
    case 'P2003':
      return new ValidationError('Foreign key constraint violation', {
        field: error.meta?.field_name,
      });
    case 'P2025':
      return new NotFoundError('Record');
    case 'P2000':
      return new ValidationError('Value too long for column', {
        column: error.meta?.column_name,
      });
    case 'P2001':
      return new NotFoundError('Record');
    case 'P2014':
      return new ConflictError('Relation violation', {
        relation: error.meta?.relation_name,
      });
    default:
      return new DatabaseError('Database operation failed', error);
  }
};