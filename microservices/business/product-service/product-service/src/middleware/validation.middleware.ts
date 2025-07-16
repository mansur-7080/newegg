import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Validate request using express-validator
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : undefined,
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
    }));

    logger.warn('Validation failed', {
      path: req.path,
      method: req.method,
      errors: formattedErrors,
    });

    throw new ValidationError('Validation failed', formattedErrors);
  }

  next();
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const { page = '1', limit = '20' } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);

  if (isNaN(pageNum) || pageNum < 1) {
    throw new ValidationError('Invalid page number');
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    throw new ValidationError('Invalid limit. Must be between 1 and 100');
  }

  req.query.page = pageNum.toString();
  req.query.limit = limitNum.toString();

  next();
};

/**
 * Validate sort parameters
 */
export const validateSort = (allowedFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { sortBy, sortOrder } = req.query;

    if (sortBy) {
      if (!allowedFields.includes(sortBy as string)) {
        throw new ValidationError(`Invalid sort field. Allowed: ${allowedFields.join(', ')}`);
      }
    }

    if (sortOrder) {
      const order = (sortOrder as string).toLowerCase();
      if (!['asc', 'desc'].includes(order)) {
        throw new ValidationError('Sort order must be "asc" or "desc"');
      }
      req.query.sortOrder = order;
    }

    next();
  };
};

/**
 * Validate date range
 */
export const validateDateRange = (req: Request, res: Response, next: NextFunction) => {
  const { startDate, endDate } = req.query;

  if (startDate) {
    const start = new Date(startDate as string);
    if (isNaN(start.getTime())) {
      throw new ValidationError('Invalid start date');
    }
  }

  if (endDate) {
    const end = new Date(endDate as string);
    if (isNaN(end.getTime())) {
      throw new ValidationError('Invalid end date');
    }

    if (startDate) {
      const start = new Date(startDate as string);
      if (end < start) {
        throw new ValidationError('End date must be after start date');
      }
    }
  }

  next();
};

/**
 * Validate file upload
 */
export const validateFileUpload = (allowedTypes: string[], maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    const file = req.file;

    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      throw new ValidationError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
    }

    // Check file size
    if (file.size > maxSize) {
      throw new ValidationError(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
    }

    next();
  };
};

/**
 * Sanitize HTML content
 */
export const sanitizeHtml = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const sanitizeField = (obj: any, field: string) => {
      if (obj[field] && typeof obj[field] === 'string') {
        // Basic HTML sanitization - in production, use a library like DOMPurify
        obj[field] = obj[field]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
          .trim();
      }
    };

    fields.forEach(field => {
      if (field.includes('.')) {
        // Handle nested fields
        const parts = field.split('.');
        let obj = req.body;
        for (let i = 0; i < parts.length - 1; i++) {
          if (obj[parts[i]]) {
            obj = obj[parts[i]];
          }
        }
        sanitizeField(obj, parts[parts.length - 1]);
      } else {
        sanitizeField(req.body, field);
      }
    });

    next();
  };
};

/**
 * Validate UUID
 */
export const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uuid = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(uuid)) {
      throw new ValidationError(`Invalid ${paramName} format`);
    }

    next();
  };
};

/**
 * Validate array of items
 */
export const validateArray = (fieldName: string, minItems: number = 1, maxItems: number = 100) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const array = req.body[fieldName];

    if (!Array.isArray(array)) {
      throw new ValidationError(`${fieldName} must be an array`);
    }

    if (array.length < minItems) {
      throw new ValidationError(`${fieldName} must contain at least ${minItems} items`);
    }

    if (array.length > maxItems) {
      throw new ValidationError(`${fieldName} must contain at most ${maxItems} items`);
    }

    next();
  };
};

/**
 * Custom validation rules
 */
export const customValidators = {
  isSlug: (value: string) => {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(value)) {
      throw new Error('Invalid slug format');
    }
    return true;
  },

  isSKU: (value: string) => {
    const skuRegex = /^[A-Z0-9-]+$/;
    if (!skuRegex.test(value)) {
      throw new Error('SKU must contain only uppercase letters, numbers, and hyphens');
    }
    return true;
  },

  isPrice: (value: any) => {
    const price = parseFloat(value);
    if (isNaN(price) || price < 0) {
      throw new Error('Price must be a positive number');
    }
    return true;
  },

  isPercentage: (value: any) => {
    const percentage = parseInt(value, 10);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }
    return true;
  },

  isPhoneNumber: (value: string) => {
    const phoneRegex = /^\+?[\d\s-()]+$/;
    if (!phoneRegex.test(value) || value.replace(/\D/g, '').length < 10) {
      throw new Error('Invalid phone number');
    }
    return true;
  },

  isURL: (value: string) => {
    try {
      new URL(value);
      return true;
    } catch {
      throw new Error('Invalid URL');
    }
  },
};