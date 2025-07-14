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

export class OrderNotFoundError extends BaseError {
  constructor(message = 'Order not found') {
    super(message, 404, 'ORDER_NOT_FOUND');
  }
}

export class OrderValidationError extends BaseError {
  constructor(message = 'Order validation failed') {
    super(message, 400, 'ORDER_VALIDATION_ERROR');
  }
}

export class InvalidOrderStatusError extends BaseError {
  constructor(message = 'Invalid order status') {
    super(message, 400, 'INVALID_ORDER_STATUS');
  }
}

export class InsufficientStockError extends BaseError {
  constructor(message = 'Insufficient stock available') {
    super(message, 400, 'INSUFFICIENT_STOCK');
  }
}

export class PaymentValidationError extends BaseError {
  constructor(message = 'Payment validation failed') {
    super(message, 400, 'PAYMENT_VALIDATION_ERROR');
  }
}

export class PaymentProcessingError extends BaseError {
  constructor(message = 'Payment processing failed') {
    super(message, 500, 'PAYMENT_PROCESSING_ERROR');
  }
}

export class OrderCancellationError extends BaseError {
  constructor(message = 'Order cannot be cancelled') {
    super(message, 400, 'ORDER_CANCELLATION_ERROR');
  }
}

export class ShippingCalculationError extends BaseError {
  constructor(message = 'Shipping calculation failed') {
    super(message, 500, 'SHIPPING_CALCULATION_ERROR');
  }
}

export class TaxCalculationError extends BaseError {
  constructor(message = 'Tax calculation failed') {
    super(message, 500, 'TAX_CALCULATION_ERROR');
  }
}

export class DiscountValidationError extends BaseError {
  constructor(message = 'Discount validation failed') {
    super(message, 400, 'DISCOUNT_VALIDATION_ERROR');
  }
}

export class OrderTimeoutError extends BaseError {
  constructor(message = 'Order processing timeout') {
    super(message, 408, 'ORDER_TIMEOUT');
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

export class ExternalServiceError extends BaseError {
  constructor(message = 'External service error', service?: string) {
    super(service ? `${service}: ${message}` : message, 502, 'EXTERNAL_SERVICE_ERROR');
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

// Uzbekistan-specific errors
export class UzbekistanRegionError extends BaseError {
  constructor(message = 'Invalid Uzbekistan region') {
    super(message, 400, 'INVALID_UZBEKISTAN_REGION');
  }
}

export class UzbekistanPhoneError extends BaseError {
  constructor(message = 'Invalid Uzbekistan phone number format') {
    super(message, 400, 'INVALID_UZBEKISTAN_PHONE');
  }
}

export class UzbekistanAddressError extends BaseError {
  constructor(message = 'Invalid Uzbekistan address format') {
    super(message, 400, 'INVALID_UZBEKISTAN_ADDRESS');
  }
}

export class PaymentProviderError extends BaseError {
  constructor(provider: string, message = 'Payment provider error') {
    super(`${provider}: ${message}`, 502, 'PAYMENT_PROVIDER_ERROR');
  }
}

export class ClickPaymentError extends PaymentProviderError {
  constructor(message = 'Click.uz payment error') {
    super('Click.uz', message);
  }
}

export class PaymePaymentError extends PaymentProviderError {
  constructor(message = 'Payme.uz payment error') {
    super('Payme.uz', message);
  }
}

export class UzcardPaymentError extends PaymentProviderError {
  constructor(message = 'Uzcard payment error') {
    super('Uzcard', message);
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

// Create standardized error response
export const createErrorResponse = (
  code: string,
  message: string,
  statusCode: number = 500,
  details?: any
) => {
  return {
    success: false,
    error: {
      code,
      message,
      statusCode,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
    },
  };
};
