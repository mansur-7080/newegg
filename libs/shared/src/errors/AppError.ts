/**
 * Standardized Error Classes for UltraMarket Application
 * Provides consistent error handling across all microservices
 */

export interface ErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
    timestamp: string;
    requestId?: string;
  };
}

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code: string;
  public details?: ErrorDetail[];

  constructor(
    statusCode: number,
    message: string,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: ErrorDetail[]
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): ErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// Specific error classes for different scenarios
export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetail[]) {
    super(400, message, 'VALIDATION_ERROR', true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(401, message, 'AUTHENTICATION_ERROR', true);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(403, message, 'AUTHORIZATION_ERROR', true);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, message, 'NOT_FOUND_ERROR', true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(409, message, 'CONFLICT_ERROR', true);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(429, message, 'RATE_LIMIT_ERROR', true);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(500, message, 'DATABASE_ERROR', true);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string = 'External service error') {
    super(502, message, 'EXTERNAL_SERVICE_ERROR', true);
  }
}

export class PaymentError extends AppError {
  constructor(message: string = 'Payment processing failed') {
    super(400, message, 'PAYMENT_ERROR', true);
  }
}

export class InventoryError extends AppError {
  constructor(message: string = 'Inventory operation failed') {
    super(400, message, 'INVENTORY_ERROR', true);
  }
}

export class OrderError extends AppError {
  constructor(message: string = 'Order operation failed') {
    super(400, message, 'ORDER_ERROR', true);
  }
}

// Error codes mapping
export const ERROR_CODES = {
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Authentication errors
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  INVALID_TOKEN: 'INVALID_TOKEN',
  EXPIRED_TOKEN: 'EXPIRED_TOKEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // Authorization errors
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ROLE_REQUIRED: 'ROLE_REQUIRED',

  // Resource errors
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',

  // Conflict errors
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  RESOURCE_EXISTS: 'RESOURCE_EXISTS',

  // Rate limiting
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // Database errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  QUERY_ERROR: 'QUERY_ERROR',
  TRANSACTION_ERROR: 'TRANSACTION_ERROR',

  // External service errors
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  PAYMENT_GATEWAY_ERROR: 'PAYMENT_GATEWAY_ERROR',
  SMS_SERVICE_ERROR: 'SMS_SERVICE_ERROR',
  EMAIL_SERVICE_ERROR: 'EMAIL_SERVICE_ERROR',

  // Business logic errors
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  PAYMENT_DECLINED: 'PAYMENT_DECLINED',

  INVENTORY_ERROR: 'INVENTORY_ERROR',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  INSUFFICIENT_QUANTITY: 'INSUFFICIENT_QUANTITY',

  ORDER_ERROR: 'ORDER_ERROR',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  ORDER_EXPIRED: 'ORDER_EXPIRED',

  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

// Error message templates
export const ERROR_MESSAGES = {
  // Validation
  INVALID_EMAIL: 'Invalid email format',
  INVALID_PHONE: 'Invalid phone number format',
  INVALID_PASSWORD: 'Password must be at least 8 characters long',
  MISSING_REQUIRED_FIELD: (field: string) => `${field} is required`,
  INVALID_FORMAT: (field: string) => `Invalid ${field} format`,

  // Authentication
  INVALID_CREDENTIALS: 'Invalid email or password',
  TOKEN_EXPIRED: 'Authentication token has expired',
  INVALID_TOKEN: 'Invalid authentication token',
  LOGIN_REQUIRED: 'Please log in to continue',

  // Authorization
  ACCESS_DENIED: 'You do not have permission to access this resource',
  ROLE_REQUIRED: (role: string) => `${role} role is required`,
  ADMIN_REQUIRED: 'Administrator access is required',

  // Resources
  USER_NOT_FOUND: 'User not found',
  PRODUCT_NOT_FOUND: 'Product not found',
  ORDER_NOT_FOUND: 'Order not found',
  CART_NOT_FOUND: 'Cart not found',

  // Business logic
  OUT_OF_STOCK: 'Product is out of stock',
  INSUFFICIENT_QUANTITY: (available: number) => `Only ${available} items available`,
  PAYMENT_DECLINED: 'Payment was declined by the payment processor',
  ORDER_CANCELLED: 'Order has been cancelled',
  ORDER_EXPIRED: 'Order has expired',

  // System
  INTERNAL_ERROR: 'An internal server error occurred',
  SERVICE_UNAVAILABLE: 'Service is temporarily unavailable',
  EXTERNAL_SERVICE_ERROR: 'External service is currently unavailable',
} as const;

// Error handler utility
export const handleError = (error: Error | AppError): ErrorResponse => {
  if (error instanceof AppError) {
    return error.toJSON();
  }

  // Handle unknown errors
  const appError = new AppError(
    500,
    process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    'UNKNOWN_ERROR',
    false
  );

  return appError.toJSON();
};

// Async error handler for Express middleware
export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error logging utility
export const logError = (error: Error | AppError, context?: any): void => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context,
  };

  if (error instanceof AppError) {
    errorInfo['statusCode'] = error.statusCode;
    errorInfo['code'] = error.code;
    errorInfo['isOperational'] = error.isOperational;
  }

  // In production, this would use a proper logging service
  if (process.env.NODE_ENV === 'development') {
    console.error('Error occurred:', errorInfo);
  }
};

export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  PaymentError,
  InventoryError,
  OrderError,
  ERROR_CODES,
  ERROR_MESSAGES,
  handleError,
  asyncHandler,
  logError,
};
