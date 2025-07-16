/**
 * Validation Middleware - TypeScript Implementation
 * Professional input validation with type safety
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../types/product.types';

// Product validation schemas
export const CreateProductSchema = z.object({
  name: z.string()
    .min(1, 'Product name is required')
    .max(255, 'Product name must be less than 255 characters')
    .trim(),
  
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  
  shortDescription: z.string()
    .max(500, 'Short description must be less than 500 characters')
    .optional(),
  
  price: z.number()
    .positive('Price must be a positive number')
    .min(0.01, 'Price must be at least 0.01'),
  
  categoryId: z.string()
    .uuid('Category ID must be a valid UUID'),
  
  brand: z.string()
    .max(100, 'Brand name must be less than 100 characters')
    .optional(),
  
  sku: z.string()
    .min(1, 'SKU is required')
    .max(50, 'SKU must be less than 50 characters')
    .regex(/^[A-Z0-9-_]+$/i, 'SKU can only contain letters, numbers, hyphens, and underscores'),
  
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'])
    .default('DRAFT'),
  
  type: z.enum(['PHYSICAL', 'DIGITAL', 'SERVICE'])
    .default('PHYSICAL'),
  
  weight: z.number()
    .positive('Weight must be positive')
    .optional(),
  
  dimensions: z.string()
    .optional(),
  
  metaTitle: z.string()
    .max(60, 'Meta title must be less than 60 characters')
    .optional(),
  
  metaDescription: z.string()
    .max(160, 'Meta description must be less than 160 characters')
    .optional(),
  
  warranty: z.string()
    .max(500, 'Warranty information must be less than 500 characters')
    .optional(),
  
  attributes: z.string()
    .optional(),
  
  specifications: z.string()
    .optional()
});

export const UpdateProductSchema = CreateProductSchema.partial().extend({
  id: z.string().uuid('Product ID must be a valid UUID')
});

// Category validation schemas
export const CreateCategorySchema = z.object({
  name: z.string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be less than 100 characters')
    .trim(),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  
  parentId: z.string()
    .uuid('Parent ID must be a valid UUID')
    .optional(),
  
  image: z.string()
    .url('Image must be a valid URL')
    .optional(),
  
  sortOrder: z.number()
    .int('Sort order must be an integer')
    .min(0, 'Sort order must be non-negative')
    .default(0)
});

export const UpdateCategorySchema = CreateCategorySchema.partial().extend({
  id: z.string().uuid('Category ID must be a valid UUID')
});

// Query parameter validation schemas
export const ProductQuerySchema = z.object({
  page: z.string()
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0, 'Page must be a positive integer')
    .default('1'),
  
  limit: z.string()
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0 && val <= 50, 'Limit must be between 1 and 50')
    .default('10'),
  
  search: z.string()
    .min(1, 'Search query cannot be empty')
    .max(100, 'Search query must be less than 100 characters')
    .optional(),
  
  category: z.string()
    .uuid('Category must be a valid UUID')
    .optional(),
  
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'])
    .optional(),
  
  type: z.enum(['PHYSICAL', 'DIGITAL', 'SERVICE'])
    .optional(),
  
  brand: z.string()
    .max(100, 'Brand filter must be less than 100 characters')
    .optional(),
  
  minPrice: z.string()
    .transform(val => parseFloat(val))
    .refine(val => val >= 0, 'Minimum price must be non-negative')
    .optional(),
  
  maxPrice: z.string()
    .transform(val => parseFloat(val))
    .refine(val => val >= 0, 'Maximum price must be non-negative')
    .optional(),
  
  sortBy: z.enum(['name', 'price', 'createdAt', 'updatedAt'])
    .default('createdAt'),
  
  sortOrder: z.enum(['asc', 'desc'])
    .default('desc'),
  
  isActive: z.string()
    .transform(val => val === 'true')
    .optional(),
  
  isFeatured: z.string()
    .transform(val => val === 'true')
    .optional(),
  
  isBestSeller: z.string()
    .transform(val => val === 'true')
    .optional(),
  
  isNewArrival: z.string()
    .transform(val => val === 'true')
    .optional(),
  
  isOnSale: z.string()
    .transform(val => val === 'true')
    .optional()
});

export const SearchQuerySchema = z.object({
  q: z.string()
    .min(1, 'Search query is required')
    .max(100, 'Search query must be less than 100 characters')
    .trim(),
  
  limit: z.string()
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0 && val <= 50, 'Limit must be between 1 and 50')
    .default('20'),
  
  category: z.string()
    .uuid('Category must be a valid UUID')
    .optional(),
  
  minPrice: z.string()
    .transform(val => parseFloat(val))
    .refine(val => val >= 0, 'Minimum price must be non-negative')
    .optional(),
  
  maxPrice: z.string()
    .transform(val => parseFloat(val))
    .refine(val => val >= 0, 'Maximum price must be non-negative')
    .optional()
});

// Generic validation middleware factory
export function validateSchema<T>(schema: ZodSchema<T>, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate = source === 'body' ? req.body : 
                            source === 'query' ? req.query : 
                            req.params;

      const validatedData = schema.parse(dataToValidate);
      
      // Replace the original data with validated and transformed data
      if (source === 'body') {
        req.body = validatedData;
      } else if (source === 'query') {
        req.query = validatedData;
      } else {
        req.params = validatedData;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          value: err.input
        }));
        
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validationErrors
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error during validation',
          code: 'INTERNAL_ERROR'
        });
      }
    }
  };
}

// Specific validation middleware for common use cases
export const validateCreateProduct = validateSchema(CreateProductSchema, 'body');
export const validateUpdateProduct = validateSchema(UpdateProductSchema, 'body');
export const validateCreateCategory = validateSchema(CreateCategorySchema, 'body');
export const validateUpdateCategory = validateSchema(UpdateCategorySchema, 'body');
export const validateProductQuery = validateSchema(ProductQuerySchema, 'query');
export const validateSearchQuery = validateSchema(SearchQuerySchema, 'query');

// UUID validation middleware
export const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const value = req.params[paramName];
    
    if (!value || !uuidRegex.test(value)) {
      return res.status(400).json({
        success: false,
        error: `Invalid ${paramName}: must be a valid UUID`,
        code: 'INVALID_UUID'
      });
    }
    
    next();
  };
};

// Custom validation for price range
export const validatePriceRange = (req: Request, res: Response, next: NextFunction) => {
  const { minPrice, maxPrice } = req.query;
  
  if (minPrice && maxPrice) {
    const min = parseFloat(minPrice as string);
    const max = parseFloat(maxPrice as string);
    
    if (min > max) {
      return res.status(400).json({
        success: false,
        error: 'Minimum price cannot be greater than maximum price',
        code: 'INVALID_PRICE_RANGE'
      });
    }
  }
  
  next();
};

// Sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize string inputs
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/\s+/g, ' '); // Remove extra whitespace
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  };
  
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

// Rate limiting validation
export const validateRateLimit = (windowMs: number, maxRequests: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const clientData = requests.get(clientIP);
    
    if (!clientData || now > clientData.resetTime) {
      requests.set(clientIP, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
    } else if (clientData.count < maxRequests) {
      clientData.count++;
      next();
    } else {
      res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }
  };
};

export default {
  validateSchema,
  validateCreateProduct,
  validateUpdateProduct,
  validateCreateCategory,
  validateUpdateCategory,
  validateProductQuery,
  validateSearchQuery,
  validateUUID,
  validatePriceRange,
  sanitizeInput,
  validateRateLimit
};