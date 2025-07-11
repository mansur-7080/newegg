/**
 * UltraMarket API Response Types
 * Standardized response formats for all microservices
 */

// =================== API RESPONSE TYPES ===================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ErrorDetail[];
  timestamp: Date;
  path?: string;
  method?: string;
  correlationId?: string;
}

export interface ErrorDetail {
  field?: string;
  message: string;
  value?: any;
  code?: string;
}

export interface ApiMeta {
  timestamp: Date;
  version: string;
  correlationId?: string;
  pagination?: PaginationMeta;
  rateLimit?: RateLimitMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface RateLimitMeta {
  limit: number;
  remaining: number;
  reset: Date;
}

// =================== SUCCESS RESPONSE BUILDERS ===================

/**
 * Create success response
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: Omit<ApiMeta, 'timestamp'>
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date(),
      version: process.env.APP_VERSION || '1.0.0',
      ...meta,
    },
  };
}

/**
 * Create paginated success response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: Omit<PaginationMeta, 'hasNext' | 'hasPrev'>,
  meta?: Omit<ApiMeta, 'timestamp' | 'pagination'>
): ApiResponse<T[]> {
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const hasNext = pagination.page < totalPages;
  const hasPrev = pagination.page > 1;

  return {
    success: true,
    data,
    meta: {
      timestamp: new Date(),
      version: process.env.APP_VERSION || '1.0.0',
      pagination: {
        ...pagination,
        totalPages,
        hasNext,
        hasPrev,
      },
      ...meta,
    },
  };
}

/**
 * Create empty success response
 */
export function createEmptyResponse(meta?: Omit<ApiMeta, 'timestamp'>): ApiResponse<null> {
  return {
    success: true,
    data: null,
    meta: {
      timestamp: new Date(),
      version: process.env.APP_VERSION || '1.0.0',
      ...meta,
    },
  };
}

// =================== ERROR RESPONSE BUILDERS ===================

/**
 * Create error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: ErrorDetail[],
  meta?: Omit<ApiMeta, 'timestamp'>
): ApiResponse<null> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date(),
    },
    meta: {
      timestamp: new Date(),
      version: process.env.APP_VERSION || '1.0.0',
      ...meta,
    },
  };
}

/**
 * Create validation error response
 */
export function createValidationErrorResponse(
  details: ErrorDetail[],
  meta?: Omit<ApiMeta, 'timestamp'>
): ApiResponse<null> {
  return createErrorResponse(
    'VALIDATION_ERROR',
    'Validation failed',
    details,
    meta
  );
}

/**
 * Create not found error response
 */
export function createNotFoundResponse(
  resource: string = 'Resource',
  meta?: Omit<ApiMeta, 'timestamp'>
): ApiResponse<null> {
  return createErrorResponse(
    'NOT_FOUND',
    `${resource} not found`,
    undefined,
    meta
  );
}

/**
 * Create unauthorized error response
 */
export function createUnauthorizedResponse(
  message: string = 'Unauthorized',
  meta?: Omit<ApiMeta, 'timestamp'>
): ApiResponse<null> {
  return createErrorResponse(
    'UNAUTHORIZED',
    message,
    undefined,
    meta
  );
}

/**
 * Create forbidden error response
 */
export function createForbiddenResponse(
  message: string = 'Access denied',
  meta?: Omit<ApiMeta, 'timestamp'>
): ApiResponse<null> {
  return createErrorResponse(
    'FORBIDDEN',
    message,
    undefined,
    meta
  );
}

/**
 * Create conflict error response
 */
export function createConflictResponse(
  message: string = 'Resource conflict',
  meta?: Omit<ApiMeta, 'timestamp'>
): ApiResponse<null> {
  return createErrorResponse(
    'CONFLICT',
    message,
    undefined,
    meta
  );
}

/**
 * Create rate limit error response
 */
export function createRateLimitResponse(
  retryAfter: number,
  meta?: Omit<ApiMeta, 'timestamp'>
): ApiResponse<null> {
  return createErrorResponse(
    'RATE_LIMIT_EXCEEDED',
    'Too many requests',
    undefined,
    meta
  );
}

/**
 * Create internal server error response
 */
export function createInternalErrorResponse(
  message: string = 'Internal server error',
  meta?: Omit<ApiMeta, 'timestamp'>
): ApiResponse<null> {
  return createErrorResponse(
    'INTERNAL_SERVER_ERROR',
    message,
    undefined,
    meta
  );
}

// =================== HTTP STATUS CODES ===================

export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
}

// =================== ERROR CODES ===================

export enum ErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_LENGTH = 'INVALID_LENGTH',
  INVALID_RANGE = 'INVALID_RANGE',

  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_MISSING = 'TOKEN_MISSING',

  // Authorization errors
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ROLE_REQUIRED = 'ROLE_REQUIRED',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_IN_USE = 'RESOURCE_IN_USE',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  QUERY_ERROR = 'QUERY_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',

  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',

  // File errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',

  // Business logic errors
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  INVALID_STATE = 'INVALID_STATE',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',

  // System errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// =================== RESPONSE HELPERS ===================

/**
 * Add correlation ID to response
 */
export function addCorrelationId(
  response: ApiResponse,
  correlationId: string
): ApiResponse {
  if (response.meta) {
    response.meta.correlationId = correlationId;
  } else {
    response.meta = { correlationId };
  }

  if (response.error) {
    response.error.correlationId = correlationId;
  }

  return response;
}

/**
 * Add request context to error response
 */
export function addRequestContext(
  response: ApiResponse,
  path: string,
  method: string
): ApiResponse {
  if (response.error) {
    response.error.path = path;
    response.error.method = method;
  }

  return response;
}

/**
 * Sanitize response for production
 */
export function sanitizeResponse(response: ApiResponse): ApiResponse {
  if (process.env.NODE_ENV === 'production') {
    // Remove sensitive information in production
    if (response.error?.details) {
      response.error.details = response.error.details.map(detail => ({
        field: detail.field,
        message: detail.message,
        code: detail.code,
        // Remove value in production
      }));
    }
  }

  return response;
}

// =================== EXPORTS ===================

export {
  createSuccessResponse,
  createPaginatedResponse,
  createEmptyResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createNotFoundResponse,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createConflictResponse,
  createRateLimitResponse,
  createInternalErrorResponse,
  addCorrelationId,
  addRequestContext,
  sanitizeResponse,
  HttpStatusCode,
  ErrorCode,
};

export type {
  ApiResponse,
  ApiError,
  ErrorDetail,
  ApiMeta,
  PaginationMeta,
  RateLimitMeta,
};
