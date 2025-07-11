// Export all constants
export const API_VERSION = 'v1';
export const DEFAULT_LIMIT = 20;
export const DEFAULT_PAGE = 1;
export const MAX_LIMIT = 100;
export const DEFAULT_SORT_FIELD = 'createdAt';
export const DEFAULT_SORT_ORDER = 'desc';

// Environment constants
export const NODE_ENV = process.env['NODE_ENV'] ?? 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const IS_DEVELOPMENT = NODE_ENV === 'development';
export const IS_TEST = NODE_ENV === 'test';

// Authentication constants
export const ACCESS_TOKEN_EXPIRY = '1h';
export const REFRESH_TOKEN_EXPIRY = '7d';
export const PASSWORD_RESET_TOKEN_EXPIRY = '1h';

// Cache constants
export const DEFAULT_CACHE_TTL = 60 * 60 * 24; // 24 hours

// Error messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Forbidden action',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation error',
  INTERNAL_SERVER_ERROR: 'Internal server error',
};

// Success messages
export const SUCCESS_MESSAGES = {
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
};

// Service names
export const SERVICES = {
  AUTH: 'auth-service',
  USER: 'user-service',
  PRODUCT: 'product-service',
  ORDER: 'order-service',
  CART: 'cart-service',
  PAYMENT: 'payment-service',
  NOTIFICATION: 'notification-service',
  SEARCH: 'search-service',
};
