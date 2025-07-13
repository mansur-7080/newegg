import { z } from 'zod';

// Simple HTML sanitizer (DOMPurify alternative)
const sanitizeHtml = (content: string): string => {
  if (!content) return '';
  
  // Remove dangerous HTML tags and attributes
  const dangerousTags = /<script|javascript:|vbscript:|onload|onerror|onclick/gi;
  const dangerousAttributes = /on\w+\s*=|javascript:|vbscript:/gi;
  
  let sanitized = content
    .replace(dangerousTags, '')
    .replace(dangerousAttributes, '')
    .replace(/<[^>]*>/g, (match) => {
      // Only allow safe tags
      const safeTags = ['b', 'i', 'em', 'strong', 'a', 'p', 'br'];
      const tagName = match.match(/<(\w+)/)?.[1]?.toLowerCase();
      
      if (tagName && safeTags.includes(tagName)) {
        return match;
      }
      return '';
    });
  
  return sanitized;
};

// Enhanced logger for validation events
const validationLogger = {
  info: (message: string, meta?: any) => console.log(`[VALIDATION-INFO] ${message}`, meta),
  error: (message: string, meta?: any) => console.error(`[VALIDATION-ERROR] ${message}`, meta),
  warn: (message: string, meta?: any) => console.warn(`[VALIDATION-WARN] ${message}`, meta),
  security: (message: string, meta?: any) => console.log(`[SECURITY] ${message}`, meta),
};

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  code: string;
  field: string;
  value: any;

  constructor(message: string, code: string, field: string, value?: any) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.field = field;
    this.value = value;
  }
}

/**
 * Input sanitization utility
 */
export class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS
   */
  static sanitizeHtml(content: string): string {
    try {
      return sanitizeHtml(content);
    } catch (error) {
      validationLogger.error('HTML sanitization failed', { error, content });
      return '';
    }
  }

  /**
   * Sanitize SQL input to prevent injection
   */
  static sanitizeSql(input: string): string {
    if (!input) return '';
    
    // Remove dangerous SQL patterns
    const dangerousPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
      /(--|#|\/\*|\*\/)/g,
      /(\b(and|or)\s+\d+\s*=\s*\d+)/gi,
      /(\b(and|or)\s+['"]\w+['"]\s*=\s*['"]\w+['"])/gi,
    ];

    let sanitized = input;
    dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Log potential SQL injection attempts
    if (sanitized !== input) {
      validationLogger.security('Potential SQL injection attempt detected', {
        original: input,
        sanitized,
        patterns: dangerousPatterns.map(p => p.source),
      });
    }

    return sanitized.trim();
  }

  /**
   * Sanitize file path to prevent path traversal
   */
  static sanitizePath(path: string): string {
    if (!path) return '';
    
    // Remove path traversal attempts
    const dangerousPatterns = [
      /\.\./g,
      /\/\//g,
      /\\/g,
    ];

    let sanitized = path;
    dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Log potential path traversal attempts
    if (sanitized !== path) {
      validationLogger.security('Potential path traversal attempt detected', {
        original: path,
        sanitized,
      });
    }

    return sanitized.trim();
  }

  /**
   * Sanitize email address
   */
  static sanitizeEmail(email: string): string {
    if (!email) return '';
    
    // Basic email validation and sanitization
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitized = email.toLowerCase().trim();
    
    if (!emailRegex.test(sanitized)) {
      validationLogger.warn('Invalid email format', { email });
      throw new ValidationError('Invalid email format', 'INVALID_EMAIL', 'email', email);
    }

    return sanitized;
  }

  /**
   * Sanitize phone number
   */
  static sanitizePhone(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-digit characters except + and -
    const sanitized = phone.replace(/[^\d+\-()\s]/g, '').trim();
    
    if (sanitized.length < 10) {
      validationLogger.warn('Phone number too short', { phone });
      throw new ValidationError('Phone number too short', 'INVALID_PHONE', 'phone', phone);
    }

    return sanitized;
  }

  /**
   * Sanitize price values
   */
  static sanitizePrice(price: number | string): number {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    if (isNaN(numPrice) || numPrice < 0) {
      validationLogger.warn('Invalid price value', { price });
      throw new ValidationError('Invalid price value', 'INVALID_PRICE', 'price', price);
    }

    // Round to 2 decimal places
    return Math.round(numPrice * 100) / 100;
  }

  /**
   * Sanitize SKU (Stock Keeping Unit)
   */
  static sanitizeSku(sku: string): string {
    if (!sku) return '';
    
    // Only allow alphanumeric characters, hyphens, and underscores
    const sanitized = sku.replace(/[^a-zA-Z0-9\-_]/g, '').toUpperCase();
    
    if (sanitized.length < 3) {
      validationLogger.warn('SKU too short', { sku });
      throw new ValidationError('SKU too short', 'INVALID_SKU', 'sku', sku);
    }

    return sanitized;
  }

  /**
   * Sanitize barcode
   */
  static sanitizeBarcode(barcode: string): string {
    if (!barcode) return '';
    
    // Only allow digits and some special characters
    const sanitized = barcode.replace(/[^0-9\-]/g, '');
    
    if (sanitized.length < 8) {
      validationLogger.warn('Barcode too short', { barcode });
      throw new ValidationError('Barcode too short', 'INVALID_BARCODE', 'barcode', barcode);
    }

    return sanitized;
  }
}

/**
 * Zod schemas for product validation
 */
export const ProductValidationSchemas = {
  // Basic product data validation
  productCreate: z.object({
    name: z.string()
      .min(1, 'Product name is required')
      .max(255, 'Product name too long')
      .transform(val => InputSanitizer.sanitizeHtml(val)),
    
    description: z.string()
      .max(5000, 'Description too long')
      .optional()
      .transform(val => val ? InputSanitizer.sanitizeHtml(val) : undefined),
    
    shortDescription: z.string()
      .max(500, 'Short description too long')
      .optional()
      .transform(val => val ? InputSanitizer.sanitizeHtml(val) : undefined),
    
    sku: z.string()
      .min(3, 'SKU too short')
      .max(50, 'SKU too long')
      .transform(val => InputSanitizer.sanitizeSku(val)),
    
    barcode: z.string()
      .min(8, 'Barcode too short')
      .max(50, 'Barcode too long')
      .optional()
      .transform(val => val ? InputSanitizer.sanitizeBarcode(val) : undefined),
    
    brand: z.string()
      .max(100, 'Brand name too long')
      .optional()
      .transform(val => val ? InputSanitizer.sanitizeHtml(val) : undefined),
    
    model: z.string()
      .max(100, 'Model name too long')
      .optional()
      .transform(val => val ? InputSanitizer.sanitizeHtml(val) : undefined),
    
    weight: z.number()
      .min(0, 'Weight cannot be negative')
      .max(10000, 'Weight too high')
      .optional(),
    
    price: z.number()
      .min(0, 'Price cannot be negative')
      .max(999999.99, 'Price too high')
      .transform(val => InputSanitizer.sanitizePrice(val)),
    
    comparePrice: z.number()
      .min(0, 'Compare price cannot be negative')
      .max(999999.99, 'Compare price too high')
      .optional()
      .transform(val => val ? InputSanitizer.sanitizePrice(val) : undefined),
    
    costPrice: z.number()
      .min(0, 'Cost price cannot be negative')
      .max(999999.99, 'Cost price too high')
      .optional()
      .transform(val => val ? InputSanitizer.sanitizePrice(val) : undefined),
    
    currency: z.string()
      .length(3, 'Currency must be 3 characters')
      .regex(/^[A-Z]{3}$/, 'Invalid currency format')
      .default('USD'),
    
    categoryId: z.string()
      .uuid('Invalid category ID format'),
    
    vendorId: z.string()
      .uuid('Invalid vendor ID format')
      .optional(),
    
    tags: z.array(z.string())
      .max(20, 'Too many tags')
      .optional()
      .transform(val => val?.map(tag => InputSanitizer.sanitizeHtml(tag)) || []),
    
    slug: z.string()
      .max(255, 'Slug too long')
      .regex(/^[a-z0-9\-]+$/, 'Invalid slug format')
      .optional(),
    
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    isBestSeller: z.boolean().default(false),
    isNewArrival: z.boolean().default(false),
    isOnSale: z.boolean().default(false),
    
    salePercentage: z.number()
      .min(0, 'Sale percentage cannot be negative')
      .max(100, 'Sale percentage cannot exceed 100%')
      .optional(),
    
    metaTitle: z.string()
      .max(60, 'Meta title too long')
      .optional()
      .transform(val => val ? InputSanitizer.sanitizeHtml(val) : undefined),
    
    metaDescription: z.string()
      .max(160, 'Meta description too long')
      .optional()
      .transform(val => val ? InputSanitizer.sanitizeHtml(val) : undefined),
    
    metaKeywords: z.array(z.string())
      .max(10, 'Too many meta keywords')
      .optional()
      .transform(val => val?.map(keyword => InputSanitizer.sanitizeHtml(keyword)) || []),
  }),

  // Product update validation (all fields optional)
  productUpdate: z.object({
    name: z.string()
      .min(1, 'Product name is required')
      .max(255, 'Product name too long')
      .optional()
      .transform(val => val ? InputSanitizer.sanitizeHtml(val) : undefined),
    
    description: z.string()
      .max(5000, 'Description too long')
      .optional()
      .transform(val => val ? InputSanitizer.sanitizeHtml(val) : undefined),
    
    shortDescription: z.string()
      .max(500, 'Short description too long')
      .optional()
      .transform(val => val ? InputSanitizer.sanitizeHtml(val) : undefined),
    
    sku: z.string()
      .min(3, 'SKU too short')
      .max(50, 'SKU too long')
      .optional()
      .transform(val => val ? InputSanitizer.sanitizeSku(val) : undefined),
    
    barcode: z.string()
      .min(8, 'Barcode too short')
      .max(50, 'Barcode too long')
      .optional()
      .transform(val => val ? InputSanitizer.sanitizeBarcode(val) : undefined),
    
    brand: z.string()
      .max(100, 'Brand name too long')
      .optional()
      .transform(val => val ? InputSanitizer.sanitizeHtml(val) : undefined),
    
    model: z.string()
      .max(100, 'Model name too long')
      .optional()
      .transform(val => val ? InputSanitizer.sanitizeHtml(val) : undefined),
    
    weight: z.number()
      .min(0, 'Weight cannot be negative')
      .max(10000, 'Weight too high')
      .optional(),
    
    price: z.number()
      .min(0, 'Price cannot be negative')
      .max(999999.99, 'Price too high')
      .optional()
      .transform(val => val ? InputSanitizer.sanitizePrice(val) : undefined),
    
    comparePrice: z.number()
      .min(0, 'Compare price cannot be negative')
      .max(999999.99, 'Compare price too high')
      .optional()
      .transform(val => val ? InputSanitizer.sanitizePrice(val) : undefined),
    
    costPrice: z.number()
      .min(0, 'Cost price cannot be negative')
      .max(999999.99, 'Cost price too high')
      .optional()
      .transform(val => val ? InputSanitizer.sanitizePrice(val) : undefined),
    
    currency: z.string()
      .length(3, 'Currency must be 3 characters')
      .regex(/^[A-Z]{3}$/, 'Invalid currency format')
      .optional(),
    
    categoryId: z.string()
      .uuid('Invalid category ID format')
      .optional(),
    
    vendorId: z.string()
      .uuid('Invalid vendor ID format')
      .optional(),
    
    tags: z.array(z.string())
      .max(20, 'Too many tags')
      .optional()
      .transform(val => val?.map(tag => InputSanitizer.sanitizeHtml(tag)) || []),
    
    slug: z.string()
      .max(255, 'Slug too long')
      .regex(/^[a-z0-9\-]+$/, 'Invalid slug format')
      .optional(),
    
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isBestSeller: z.boolean().optional(),
    isNewArrival: z.boolean().optional(),
    isOnSale: z.boolean().optional(),
    
    salePercentage: z.number()
      .min(0, 'Sale percentage cannot be negative')
      .max(100, 'Sale percentage cannot exceed 100%')
      .optional(),
    
    metaTitle: z.string()
      .max(60, 'Meta title too long')
      .optional()
      .transform(val => val ? InputSanitizer.sanitizeHtml(val) : undefined),
    
    metaDescription: z.string()
      .max(160, 'Meta description too long')
      .optional()
      .transform(val => val ? InputSanitizer.sanitizeHtml(val) : undefined),
    
    metaKeywords: z.array(z.string())
      .max(10, 'Too many meta keywords')
      .optional()
      .transform(val => val?.map(keyword => InputSanitizer.sanitizeHtml(keyword)) || []),
  }),

  // Search query validation
  searchQuery: z.object({
    query: z.string()
      .min(1, 'Search query is required')
      .max(100, 'Search query too long')
      .transform(val => InputSanitizer.sanitizeSql(val)),
    
    page: z.number()
      .min(1, 'Page must be at least 1')
      .max(1000, 'Page number too high')
      .default(1),
    
    limit: z.number()
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit too high')
      .default(20),
    
    sortBy: z.enum(['name', 'price', 'createdAt', 'updatedAt', 'popularity'])
      .default('createdAt'),
    
    sortOrder: z.enum(['asc', 'desc', 'ASC', 'DESC'])
      .default('DESC'),
  }),

  // Filter validation
  filters: z.object({
    categoryId: z.string().uuid('Invalid category ID').optional(),
    vendorId: z.string().uuid('Invalid vendor ID').optional(),
    minPrice: z.number().min(0, 'Min price cannot be negative').optional(),
    maxPrice: z.number().min(0, 'Max price cannot be negative').optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
    type: z.enum(['PHYSICAL', 'DIGITAL', 'SERVICE']).optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isBestSeller: z.boolean().optional(),
    isNewArrival: z.boolean().optional(),
    isOnSale: z.boolean().optional(),
    tags: z.array(z.string()).max(10, 'Too many filter tags').optional(),
  }),
};

/**
 * Input validation service
 */
export class InputValidator {
  /**
   * Validate product creation data
   */
  static validateProductCreate(data: any) {
    try {
      const validated = ProductValidationSchemas.productCreate.parse(data);
      validationLogger.info('Product creation data validated successfully');
      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        validationLogger.error('Product creation validation failed', { errors });
        throw new ValidationError(
          `Validation failed: ${errors.map(e => e.message).join(', ')}`,
          'VALIDATION_ERROR',
          'product',
          data
        );
      }
      throw error;
    }
  }

  /**
   * Validate product update data
   */
  static validateProductUpdate(data: any) {
    try {
      const validated = ProductValidationSchemas.productUpdate.parse(data);
      validationLogger.info('Product update data validated successfully');
      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        validationLogger.error('Product update validation failed', { errors });
        throw new ValidationError(
          `Validation failed: ${errors.map(e => e.message).join(', ')}`,
          'VALIDATION_ERROR',
          'product',
          data
        );
      }
      throw error;
    }
  }

  /**
   * Validate search query
   */
  static validateSearchQuery(data: any) {
    try {
      const validated = ProductValidationSchemas.searchQuery.parse(data);
      validationLogger.info('Search query validated successfully');
      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        validationLogger.error('Search query validation failed', { errors });
        throw new ValidationError(
          `Search validation failed: ${errors.map(e => e.message).join(', ')}`,
          'VALIDATION_ERROR',
          'search',
          data
        );
      }
      throw error;
    }
  }

  /**
   * Validate filters
   */
  static validateFilters(data: any) {
    try {
      const validated = ProductValidationSchemas.filters.parse(data);
      validationLogger.info('Filters validated successfully');
      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        validationLogger.error('Filters validation failed', { errors });
        throw new ValidationError(
          `Filter validation failed: ${errors.map(e => e.message).join(', ')}`,
          'VALIDATION_ERROR',
          'filters',
          data
        );
      }
      throw error;
    }
  }

  /**
   * Validate and sanitize all input data
   */
  static validateAndSanitize(data: any, type: 'create' | 'update' | 'search' | 'filters') {
    try {
      switch (type) {
        case 'create':
          return this.validateProductCreate(data);
        case 'update':
          return this.validateProductUpdate(data);
        case 'search':
          return this.validateSearchQuery(data);
        case 'filters':
          return this.validateFilters(data);
        default:
          throw new ValidationError('Unknown validation type', 'INVALID_TYPE', 'type', type);
      }
    } catch (error) {
      validationLogger.error('Input validation and sanitization failed', { error, type, data });
      throw error;
    }
  }
}