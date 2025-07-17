/**
 * Validation Middleware
 * Professional input validation with express-validator
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';
import { logger } from '../shared/logger';

/**
 * Format validation errors for consistent API responses
 */
interface FormattedValidationError {
  field: string;
  message: string;
  value?: any;
  location?: string;
}

/**
 * Handle validation errors from express-validator
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors: FormattedValidationError[] = errors.array().map((error: ValidationError) => ({
      field: error.type === 'field' ? (error as any).path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined,
      location: error.type === 'field' ? (error as any).location : undefined,
    }));

    logger.warn('Validation failed', {
      url: req.url,
      method: req.method,
      errors: formattedErrors,
      body: req.body,
      query: req.query,
      params: req.params,
      ip: req.ip,
    });

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
      code: 'VALIDATION_ERROR',
    });
      return;
  }

  next();
};

/**
 * Sanitize request data (remove undefined, null, empty strings)
 */
export const sanitizeRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  next();
};

/**
 * Recursively sanitize object
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject).filter(item => item !== null && item !== undefined);
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined && value !== '') {
        sanitized[key] = sanitizeObject(value);
      }
    }
    
    return sanitized;
  }

  // Trim strings
  if (typeof obj === 'string') {
    return obj.trim();
  }

  return obj;
}

/**
 * Validate pagination parameters
 */
export const validatePagination = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { page, limit } = req.query;

  if (page) {
    const pageNum = parseInt(page as string, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      res.status(400).json({
        success: false,
        message: 'Page must be a positive integer',
        code: 'INVALID_PAGE',
      });
      return;
    }
    req.query.page = pageNum.toString();
  }

  if (limit) {
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 100',
        code: 'INVALID_LIMIT',
      });
      return;
    }
    req.query.limit = limitNum.toString();
  }

  next();
};

/**
 * Validate sort parameters
 */
export const validateSort = (allowedFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { sortBy, sortOrder } = req.query;

    if (sortBy && !allowedFields.includes(sortBy as string)) {
      res.status(400).json({
        success: false,
        message: `Invalid sort field. Allowed fields: ${allowedFields.join(', ')}`,
        code: 'INVALID_SORT_FIELD',
      });
      return;
    }

    if (sortOrder && !['asc', 'desc'].includes(sortOrder as string)) {
      res.status(400).json({
        success: false,
        message: 'Sort order must be "asc" or "desc"',
        code: 'INVALID_SORT_ORDER',
      });
      return;
    }

    next();
  };
};

/**
 * Validate MongoDB ObjectId
 */
export const validateObjectId = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.params[paramName];
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: `${paramName} is required`,
        code: 'MISSING_PARAMETER',
      });
      return;
    }

    // MongoDB ObjectId validation (24 character hex string)
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    
    if (!objectIdRegex.test(id)) {
      res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`,
        code: 'INVALID_OBJECT_ID',
      });
      return;
    }

    next();
  };
};

/**
 * Validate slug format
 */
export const validateSlug = (paramName: string = 'slug') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const slug = req.params[paramName];
    
    if (!slug) {
      res.status(400).json({
        success: false,
        message: `${paramName} is required`,
        code: 'MISSING_PARAMETER',
      });
      return;
    }

    // Slug validation (lowercase letters, numbers, hyphens)
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    
    if (!slugRegex.test(slug)) {
      res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format. Use lowercase letters, numbers, and hyphens only`,
        code: 'INVALID_SLUG_FORMAT',
      });
      return;
    }

    next();
  };
};

/**
 * Validate price range
 */
export const validatePriceRange = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { minPrice, maxPrice } = req.query;

  if (minPrice) {
    const min = parseFloat(minPrice as string);
    if (isNaN(min) || min < 0) {
      res.status(400).json({
        success: false,
        message: 'Minimum price must be a non-negative number',
        code: 'INVALID_MIN_PRICE',
      });
      return;
    }
    req.query.minPrice = min.toString();
  }

  if (maxPrice) {
    const max = parseFloat(maxPrice as string);
    if (isNaN(max) || max < 0) {
      res.status(400).json({
        success: false,
        message: 'Maximum price must be a non-negative number',
        code: 'INVALID_MAX_PRICE',
      });
      return;
    }
    req.query.maxPrice = max.toString();
  }

  if (minPrice && maxPrice) {
    const min = parseFloat(minPrice as string);
    const max = parseFloat(maxPrice as string);
    
    if (min > max) {
      res.status(400).json({
        success: false,
        message: 'Minimum price cannot be greater than maximum price',
        code: 'INVALID_PRICE_RANGE',
      });
      return;
    }
  }

  next();
};

/**
 * Validate search query
 */
export const validateSearchQuery = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { q } = req.query;

  if (!q) {
    res.status(400).json({
      success: false,
      message: 'Search query (q) is required',
      code: 'MISSING_SEARCH_QUERY',
    });
      return;
  }

  const query = q as string;

  if (query.length < 2) {
    res.status(400).json({
      success: false,
      message: 'Search query must be at least 2 characters long',
      code: 'SEARCH_QUERY_TOO_SHORT',
    });
      return;
  }

  if (query.length > 100) {
    res.status(400).json({
      success: false,
      message: 'Search query cannot exceed 100 characters',
      code: 'SEARCH_QUERY_TOO_LONG',
    });
      return;
  }

  // Sanitize search query
  req.query.q = query.trim();

  next();
};

/**
 * Validate file upload
 */
export const validateFileUpload = (
  allowedTypes: string[],
  maxSize: number = 5 * 1024 * 1024 // 5MB
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.file && !req.files) {
      return next(); // No file uploaded, continue
    }

    const files = req.files ? (Array.isArray(req.files) ? req.files : [req.file]) : [req.file];

    for (const file of files) {
      if (!file) continue;

      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        res.status(400).json({
          success: false,
          message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
          code: 'INVALID_FILE_TYPE',
        });
      return;
      }

      // Check file size
      if (file.size > maxSize) {
        res.status(400).json({
          success: false,
          message: `File size exceeds limit of ${maxSize / (1024 * 1024)}MB`,
          code: 'FILE_SIZE_EXCEEDED',
        });
      return;
      }
    }

    next();
  };
};

/**
 * Validate array field
 */
export const validateArrayField = (fieldName: string, maxLength: number = 50) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const field = req.body[fieldName];

    if (field && Array.isArray(field)) {
      if (field.length > maxLength) {
        res.status(400).json({
          success: false,
          message: `${fieldName} cannot have more than ${maxLength} items`,
          code: 'ARRAY_LENGTH_EXCEEDED',
        });
      return;
      }
    }

    next();
  };
};

/**
 * Rate limiting validation (check if request should be rate limited)
 */
export const validateRateLimit = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Check if rate limit headers are present
  const remaining = req.get('X-RateLimit-Remaining');
  const limit = req.get('X-RateLimit-Limit');

  if (remaining && limit) {
    const remainingRequests = parseInt(remaining, 10);
    
    if (remainingRequests <= 0) {
      res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
      });
      return;
    }
  }

  next();
};

/**
 * Validate content type
 */
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.get('Content-Type');

    if (!contentType) {
      res.status(400).json({
        success: false,
        message: 'Content-Type header is required',
        code: 'MISSING_CONTENT_TYPE',
      });
      return;
    }

    const isAllowed = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isAllowed) {
      res.status(400).json({
        success: false,
        message: `Invalid content type. Allowed types: ${allowedTypes.join(', ')}`,
        code: 'INVALID_CONTENT_TYPE',
      });
      return;
    }

    next();
  };
};
