/**
 * Constants for Product Service
 * Professional application constants and configuration
 */

// =====================================
// Application Constants
// =====================================

export const APP_NAME = 'UltraMarket Product Service';
export const APP_VERSION = '1.0.0';
export const API_PREFIX = '/api/v1';

// =====================================
// Database Constants
// =====================================

export const DATABASE_COLLECTIONS = {
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  BRANDS: 'brands',
  REVIEWS: 'reviews',
  INVENTORIES: 'inventories',
} as const;

export const MAX_CATEGORY_DEPTH = 10;
export const MAX_CATEGORY_SIBLINGS = 100;

// =====================================
// Product Constants
// =====================================

export const PRODUCT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
} as const;

export const PRODUCT_LIMITS = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 200,
  DESCRIPTION_MIN_LENGTH: 10,
  DESCRIPTION_MAX_LENGTH: 5000,
  SKU_MIN_LENGTH: 3,
  SKU_MAX_LENGTH: 50,
  TAGS_MAX_COUNT: 20,
  TAG_MAX_LENGTH: 50,
  IMAGES_MAX_COUNT: 10,
  VARIANTS_MAX_COUNT: 50,
  RELATED_PRODUCTS_MAX_COUNT: 20,
  MIN_PRICE: 0.01,
  MAX_PRICE: 999999.99,
} as const;

export const PRODUCT_SORT_FIELDS = {
  NAME: 'name',
  PRICE: 'price',
  RATING: 'rating.average',
  SALES: 'salesCount',
  VIEWS: 'viewCount',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  RELEVANCE: 'relevance',
} as const;

// =====================================
// Category Constants
// =====================================

export const CATEGORY_LIMITS = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 1000,
  SLUG_MIN_LENGTH: 2,
  SLUG_MAX_LENGTH: 100,
  KEYWORDS_MAX_COUNT: 20,
  KEYWORD_MAX_LENGTH: 50,
} as const;

// =====================================
// Inventory Constants
// =====================================

export const INVENTORY_OPERATIONS = {
  ADD: 'add',
  SUBTRACT: 'subtract',
  SET: 'set',
} as const;

export const INVENTORY_DEFAULTS = {
  QUANTITY: 0,
  LOW_STOCK_THRESHOLD: 5,
  TRACKED: true,
  ALLOW_BACKORDER: false,
} as const;

// =====================================
// User Roles and Permissions
// =====================================

export const USER_ROLES = {
  CUSTOMER: 'customer',
  VENDOR: 'vendor',
  ADMIN: 'admin',
} as const;

export const PERMISSIONS = {
  // Product permissions
  PRODUCT_READ: 'product:read',
  PRODUCT_CREATE: 'product:create',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DELETE: 'product:delete',
  PRODUCT_MANAGE_ALL: 'product:manage:all',
  
  // Category permissions
  CATEGORY_READ: 'category:read',
  CATEGORY_CREATE: 'category:create',
  CATEGORY_UPDATE: 'category:update',
  CATEGORY_DELETE: 'category:delete',
  CATEGORY_MANAGE: 'category:manage',
  
  // Inventory permissions
  INVENTORY_READ: 'inventory:read',
  INVENTORY_UPDATE: 'inventory:update',
  INVENTORY_MANAGE: 'inventory:manage',
  
  // Analytics permissions
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_ADVANCED: 'analytics:advanced',
  
  // Admin permissions
  ADMIN_ACCESS: 'admin:access',
  BULK_OPERATIONS: 'bulk:operations',
  SYSTEM_CONFIG: 'system:config',
} as const;

// =====================================
// Validation Constants
// =====================================

export const VALIDATION_PATTERNS = {
  SKU: /^[A-Z0-9-_]+$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  OBJECT_ID: /^[0-9a-fA-F]{24}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
} as const;

export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  INVALID_FORMAT: 'Invalid format',
  INVALID_LENGTH: 'Invalid length',
  INVALID_TYPE: 'Invalid type',
  INVALID_RANGE: 'Value out of range',
  NOT_FOUND: 'Resource not found',
  ALREADY_EXISTS: 'Resource already exists',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  VALIDATION_FAILED: 'Validation failed',
} as const;

// =====================================
// HTTP Status Codes
// =====================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// =====================================
// Cache Constants
// =====================================

export const CACHE_KEYS = {
  PRODUCT: 'product',
  PRODUCT_LIST: 'product:list',
  PRODUCT_SEARCH: 'product:search',
  CATEGORY: 'category',
  CATEGORY_TREE: 'category:tree',
  CATEGORY_LIST: 'category:list',
  FEATURED_PRODUCTS: 'featured:products',
  POPULAR_CATEGORIES: 'popular:categories',
  ANALYTICS: 'analytics',
} as const;

export const CACHE_TTL = {
  SHORT: 300,     // 5 minutes
  MEDIUM: 1800,   // 30 minutes
  LONG: 3600,     // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

// =====================================
// Pagination Constants
// =====================================

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const PAGINATION_LIMITS = {
  PRODUCTS: {
    DEFAULT: 20,
    MAX: 100,
  },
  CATEGORIES: {
    DEFAULT: 50,
    MAX: 100,
  },
  SEARCH_RESULTS: {
    DEFAULT: 20,
    MAX: 50,
  },
  FEATURED_PRODUCTS: {
    DEFAULT: 10,
    MAX: 50,
  },
} as const;

// =====================================
// File Upload Constants
// =====================================

export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_FILES_PER_REQUEST: 10,
  IMAGE_MAX_WIDTH: 2048,
  IMAGE_MAX_HEIGHT: 2048,
  IMAGE_QUALITY: 85,
} as const;

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
] as const;

export const IMAGE_FORMATS = {
  JPEG: 'jpeg',
  PNG: 'png',
  WEBP: 'webp',
  GIF: 'gif',
} as const;

// =====================================
// Rate Limiting Constants
// =====================================

export const RATE_LIMITS = {
  GLOBAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 1000,
  },
  SEARCH: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 60,
  },
  UPLOAD: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 10,
  },
  CREATE: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 30,
  },
  UPDATE: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 50,
  },
} as const;

// =====================================
// Search Constants
// =====================================

export const SEARCH_LIMITS = {
  QUERY_MIN_LENGTH: 2,
  QUERY_MAX_LENGTH: 100,
  SUGGESTIONS_MAX_COUNT: 10,
  FILTERS_MAX_COUNT: 20,
} as const;

export const SEARCH_WEIGHTS = {
  NAME: 10,
  DESCRIPTION: 5,
  TAGS: 3,
  BRAND: 2,
  SKU: 1,
} as const;

// =====================================
// Analytics Constants
// =====================================

export const ANALYTICS_PERIODS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const;

export const ANALYTICS_METRICS = {
  VIEWS: 'views',
  SALES: 'sales',
  REVENUE: 'revenue',
  CONVERSION: 'conversion',
  INVENTORY_TURNOVER: 'inventory_turnover',
} as const;

// =====================================
// Error Codes
// =====================================

export const ERROR_CODES = {
  // Authentication errors
  TOKEN_MISSING: 'TOKEN_MISSING',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INSUFFICIENT_ROLE: 'INSUFFICIENT_ROLE',
  INSUFFICIENT_PERMISSION: 'INSUFFICIENT_PERMISSION',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_OBJECT_ID: 'INVALID_OBJECT_ID',
  INVALID_SLUG_FORMAT: 'INVALID_SLUG_FORMAT',
  INVALID_SKU_FORMAT: 'INVALID_SKU_FORMAT',
  INVALID_EMAIL_FORMAT: 'INVALID_EMAIL_FORMAT',
  INVALID_URL_FORMAT: 'INVALID_URL_FORMAT',
  INVALID_PAGE: 'INVALID_PAGE',
  INVALID_LIMIT: 'INVALID_LIMIT',
  INVALID_SORT_FIELD: 'INVALID_SORT_FIELD',
  INVALID_SORT_ORDER: 'INVALID_SORT_ORDER',
  INVALID_PRICE_RANGE: 'INVALID_PRICE_RANGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_SIZE_EXCEEDED: 'FILE_SIZE_EXCEEDED',
  
  // Business logic errors
  SKU_ALREADY_EXISTS: 'SKU_ALREADY_EXISTS',
  SLUG_ALREADY_EXISTS: 'SLUG_ALREADY_EXISTS',
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  INSUFFICIENT_INVENTORY: 'INSUFFICIENT_INVENTORY',
  CIRCULAR_REFERENCE: 'CIRCULAR_REFERENCE',
  MAX_DEPTH_EXCEEDED: 'MAX_DEPTH_EXCEEDED',
  CANNOT_DELETE_WITH_CHILDREN: 'CANNOT_DELETE_WITH_CHILDREN',
  CANNOT_DELETE_WITH_PRODUCTS: 'CANNOT_DELETE_WITH_PRODUCTS',
  
  // Rate limiting errors
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  USER_RATE_LIMIT_EXCEEDED: 'USER_RATE_LIMIT_EXCEEDED',
  
  // Server errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
} as const;

// =====================================
// Event Types
// =====================================

export const EVENT_TYPES = {
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted',
  PRODUCT_STATUS_CHANGED: 'product.status.changed',
  PRODUCT_INVENTORY_UPDATED: 'product.inventory.updated',
  
  CATEGORY_CREATED: 'category.created',
  CATEGORY_UPDATED: 'category.updated',
  CATEGORY_DELETED: 'category.deleted',
  CATEGORY_MOVED: 'category.moved',
  
  INVENTORY_RESERVED: 'inventory.reserved',
  INVENTORY_RELEASED: 'inventory.released',
  LOW_STOCK_ALERT: 'inventory.low_stock',
  OUT_OF_STOCK_ALERT: 'inventory.out_of_stock',
} as const;

// =====================================
// Default Values
// =====================================

export const DEFAULTS = {
  PRODUCT: {
    STATUS: PRODUCT_STATUS.DRAFT,
    IS_FEATURED: false,
    IS_DIGITAL: false,
    HAS_VARIANTS: false,
    TAGS: [],
    IMAGES: [],
    VARIANTS: [],
    VIEW_COUNT: 0,
    SALES_COUNT: 0,
    RATING: {
      average: 0,
      count: 0,
      breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    },
  },
  CATEGORY: {
    IS_ACTIVE: true,
    LEVEL: 0,
    SORT_ORDER: 0,
    METADATA: {
      keywords: [],
      featured: false,
    },
  },
  INVENTORY: {
    QUANTITY: 0,
    RESERVED: 0,
    TRACKED: true,
    ALLOW_BACKORDER: false,
    LOW_STOCK_THRESHOLD: 5,
  },
} as const;

// =====================================
// Export all constants as default
// =====================================

export default {
  APP_NAME,
  APP_VERSION,
  API_PREFIX,
  DATABASE_COLLECTIONS,
  MAX_CATEGORY_DEPTH,
  MAX_CATEGORY_SIBLINGS,
  PRODUCT_STATUS,
  PRODUCT_LIMITS,
  PRODUCT_SORT_FIELDS,
  CATEGORY_LIMITS,
  INVENTORY_OPERATIONS,
  INVENTORY_DEFAULTS,
  USER_ROLES,
  PERMISSIONS,
  VALIDATION_PATTERNS,
  VALIDATION_MESSAGES,
  HTTP_STATUS,
  CACHE_KEYS,
  CACHE_TTL,
  PAGINATION_DEFAULTS,
  PAGINATION_LIMITS,
  UPLOAD_LIMITS,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  IMAGE_FORMATS,
  RATE_LIMITS,
  SEARCH_LIMITS,
  SEARCH_WEIGHTS,
  ANALYTICS_PERIODS,
  ANALYTICS_METRICS,
  ERROR_CODES,
  EVENT_TYPES,
  DEFAULTS,
};