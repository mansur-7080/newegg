export class BaseError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class CartNotFoundError extends BaseError {
  constructor(message = 'Cart not found') {
    super(message, 404, 'CART_NOT_FOUND');
  }
}

export class CartItemNotFoundError extends BaseError {
  constructor(message = 'Cart item not found') {
    super(message, 404, 'CART_ITEM_NOT_FOUND');
  }
}

export class SavedItemNotFoundError extends BaseError {
  constructor(message = 'Saved item not found') {
    super(message, 404, 'SAVED_ITEM_NOT_FOUND');
  }
}

export class InvalidQuantityError extends BaseError {
  constructor(message = 'Invalid quantity specified') {
    super(message, 400, 'INVALID_QUANTITY');
  }
}

export class ProductNotAvailableError extends BaseError {
  constructor(message = 'Product is not available') {
    super(message, 400, 'PRODUCT_NOT_AVAILABLE');
  }
}

export class InsufficientStockError extends BaseError {
  constructor(message = 'Insufficient stock available') {
    super(message, 400, 'INSUFFICIENT_STOCK');
  }
}

export class CartValidationError extends BaseError {
  constructor(message = 'Cart validation failed') {
    super(message, 400, 'CART_VALIDATION_ERROR');
  }
}

export class CouponValidationError extends BaseError {
  constructor(message = 'Coupon validation failed') {
    super(message, 400, 'COUPON_VALIDATION_ERROR');
  }
}

export class CartExpiredError extends BaseError {
  constructor(message = 'Cart has expired') {
    super(message, 410, 'CART_EXPIRED');
  }
}

export class CartLimitExceededError extends BaseError {
  constructor(message = 'Cart item limit exceeded') {
    super(message, 400, 'CART_LIMIT_EXCEEDED');
  }
}

export class PriceValidationError extends BaseError {
  constructor(message = 'Price validation failed') {
    super(message, 400, 'PRICE_VALIDATION_ERROR');
  }
}

export class AuthenticationError extends BaseError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_REQUIRED');
  }
}

export class AuthorizationError extends BaseError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'INSUFFICIENT_PERMISSIONS');
  }
}

export class DatabaseError extends BaseError {
  constructor(message = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

export class ValidationError extends BaseError {
  public readonly errors: Array<{
    field: string;
    message: string;
    value?: any;
  }>;

  constructor(
    errors: Array<{ field: string; message: string; value?: any }>,
    message = 'Validation failed'
  ) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

export class RateLimitError extends BaseError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class ServiceUnavailableError extends BaseError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

// Error handler utility function
export const handleError = (error: unknown): BaseError => {
  if (error instanceof BaseError) {
    return error;
  }

  if (error instanceof Error) {
    return new BaseError(error.message, 500, 'INTERNAL_ERROR');
  }

  return new BaseError('Unknown error occurred', 500, 'UNKNOWN_ERROR');
};

// Error response formatter
export const formatErrorResponse = (error: BaseError) => {
  const response: any = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
    },
  };

  // Add validation errors if present
  if (error instanceof ValidationError) {
    response.error.validationErrors = error.errors;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
  }

  return response;
};
