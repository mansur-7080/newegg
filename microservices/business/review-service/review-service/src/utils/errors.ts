/**
 * Custom Error Classes for Review Service
 */

export interface ErrorDetails {
  field?: string;
  value?: unknown;
  message?: string;
  code?: string;
  validationErrors?: ValidationErrorDetails[];
}

export interface ValidationErrorDetails {
  field: string;
  value: unknown;
  message: string;
}

export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code: string;
  public details?: ErrorDetails;
  
  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code: string = 'INTERNAL_ERROR',
    details?: ErrorDetails
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: ValidationErrorDetails[]) {
    super(message, 400, true, 'VALIDATION_ERROR', { validationErrors: details });
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, true, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Access denied') {
    super(message, 403, true, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, true, 'NOT_FOUND');
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, true, 'CONFLICT');
  }
}

export class TooManyRequestsError extends ApiError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, true, 'TOO_MANY_REQUESTS');
  }
}

export class DatabaseError extends ApiError {
  constructor(message: string = 'Database operation failed', details?: ErrorDetails) {
    super(message, 500, true, 'DATABASE_ERROR', details);
  }
}

export class ExternalServiceError extends ApiError {
  constructor(service: string, message?: string, details?: ErrorDetails) {
    super(
      message || `External service error: ${service}`,
      502,
      true,
      'EXTERNAL_SERVICE_ERROR',
      details
    );
  }
}

export class PaymentError extends ApiError {
  constructor(message: string, statusCode: number = 400, details?: ErrorDetails) {
    super(message, statusCode, true, 'PAYMENT_ERROR', details);
  }
}

// Review-specific errors
export class ReviewError extends ApiError {
  constructor(message: string, statusCode: number = 400, details?: any) {
    super(message, statusCode, true, 'REVIEW_ERROR', details);
  }
}

export class ReviewNotFoundError extends NotFoundError {
  constructor() {
    super('Review');
  }
}

export class ReviewAlreadyExistsError extends ConflictError {
  constructor() {
    super('You have already reviewed this product');
  }
}

export class ReviewPermissionError extends AuthorizationError {
  constructor(action: string = 'perform this action') {
    super(`You don't have permission to ${action} on this review`);
  }
}

export class ReviewModerationError extends ApiError {
  constructor(message: string = 'Review moderation failed') {
    super(message, 422, true, 'REVIEW_MODERATION_ERROR');
  }
}

export class ReviewVotingError extends ApiError {
  constructor(message: string = 'Review voting failed') {
    super(message, 422, true, 'REVIEW_VOTING_ERROR');
  }
}

export class ReviewFlagError extends ApiError {
  constructor(message: string = 'Review flagging failed') {
    super(message, 422, true, 'REVIEW_FLAG_ERROR');
  }
}

export class ReviewReplyError extends ApiError {
  constructor(message: string = 'Review reply failed') {
    super(message, 422, true, 'REVIEW_REPLY_ERROR');
  }
}

// Error codes mapping
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  REVIEW_ERROR: 'REVIEW_ERROR',
  REVIEW_MODERATION_ERROR: 'REVIEW_MODERATION_ERROR',
  REVIEW_VOTING_ERROR: 'REVIEW_VOTING_ERROR',
  REVIEW_FLAG_ERROR: 'REVIEW_FLAG_ERROR',
  REVIEW_REPLY_ERROR: 'REVIEW_REPLY_ERROR',
} as const;

// HTTP status codes mapping
export const HTTP_STATUS_CODES = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Database error handler
export const handleDatabaseError = (error: Error): ApiError => {
  if (error.name === 'ValidationError') {
    return new ValidationError('Database validation failed');
  }
  
  if (error.name === 'CastError') {
    return new ValidationError('Invalid data format');
  }
  
  if (error.name === 'MongoError' || error.name === 'MongooseError') {
    return new DatabaseError('Database operation failed');
  }
  
  return new ApiError('Internal server error', 500, false);
};

// Global error handler middleware
export const errorHandler = (logger: any) => {
  return (req: any, res: any, next: any) => {
    res.error = (error: ApiError) => {
      logger.error('API Error:', {
        message: error.message,
        statusCode: error.statusCode,
        code: error.code,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      const response: {
        success: false;
        error: {
          message: string;
          code: string;
          details?: ErrorDetails;
        };
      } = {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
      };

      return res.status(error.statusCode).json(response);
    };

    next();
  };
};

// Logging utilities
export const logError = (error: Error, context?: Record<string, unknown>) => {
  console.error('Error logged:', {
    message: error.message,
    stack: error.stack,
    context,
  });
};

// Validation error formatter
export const formatValidationError = (errors: ValidationErrorDetails[]): ValidationError => {
  return new ValidationError('Validation failed', errors);
};

// HTTP status code utilities
export const isClientError = (statusCode: number): boolean => {
  return statusCode >= 400 && statusCode < 500;
};

export const isServerError = (statusCode: number): boolean => {
  return statusCode >= 500;
};

export const isOperationalError = (error: Error): boolean => {
  if (error instanceof ApiError) {
    return error.isOperational;
  }
  return false;
};
