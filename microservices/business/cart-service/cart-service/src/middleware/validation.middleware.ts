import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Middleware to handle express-validator validation results
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
    }));

    logger.warn('Request validation failed', {
      url: req.url,
      method: req.method,
      errors: validationErrors,
      body: req.body,
      params: req.params,
      query: req.query,
    });

    const validationError = new ValidationError(validationErrors);
    
    res.status(400).json({
      success: false,
      error: {
        code: validationError.code,
        message: validationError.message,
        validationErrors: validationError.errors,
      },
    });
    return;
  }

  next();
};

/**
 * Custom validation functions
 */
export class CustomValidators {
  /**
   * Validate product ID format
   */
  static isValidProductId(value: string): boolean {
    // Product ID should be UUID v4 or MongoDB ObjectId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    
    return uuidRegex.test(value) || objectIdRegex.test(value);
  }

  /**
   * Validate SKU format
   */
  static isValidSKU(value: string): boolean {
    // SKU should be alphanumeric with hyphens and underscores, 3-50 characters
    const skuRegex = /^[A-Z0-9-_]{3,50}$/;
    return skuRegex.test(value);
  }

  /**
   * Validate price (must be positive and reasonable)
   */
  static isValidPrice(value: number): boolean {
    return typeof value === 'number' && 
           value > 0 && 
           value <= 100000000 && // 100 million max
           Number.isFinite(value);
  }

  /**
   * Validate quantity (must be positive integer)
   */
  static isValidQuantity(value: number): boolean {
    return Number.isInteger(value) && value > 0 && value <= 10000; // Max 10k items
  }

  /**
   * Validate weight (must be positive)
   */
  static isValidWeight(value: number): boolean {
    return typeof value === 'number' && 
           value > 0 && 
           value <= 10000 && // 10 tons max
           Number.isFinite(value);
  }

  /**
   * Validate dimensions object
   */
  static isValidDimensions(value: any): boolean {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const { length, width, height } = value;
    
    return (
      typeof length === 'number' && length > 0 &&
      typeof width === 'number' && width > 0 &&
      typeof height === 'number' && height > 0 &&
      length <= 1000 && width <= 1000 && height <= 1000 // Max 10 meters
    );
  }

  /**
   * Validate coupon code format
   */
  static isValidCouponCode(value: string): boolean {
    // Coupon codes should be uppercase alphanumeric, 3-20 characters
    const couponRegex = /^[A-Z0-9]{3,20}$/;
    return couponRegex.test(value);
  }

  /**
   * Validate cart ID format (should be UUID or ObjectId)
   */
  static isValidCartId(value: string): boolean {
    return this.isValidProductId(value); // Same format as product ID
  }

  /**
   * Validate session ID format
   */
  static isValidSessionId(value: string): boolean {
    // Session ID should be alphanumeric, 10-128 characters
    const sessionRegex = /^[a-zA-Z0-9]{10,128}$/;
    return sessionRegex.test(value);
  }
}

/**
 * Middleware to sanitize request data
 */
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Sanitize string fields by trimming whitespace
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.trim();
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

    // Sanitize body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize params
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    logger.debug('Request sanitized', {
      url: req.url,
      method: req.method,
    });

    next();
  } catch (error) {
    logger.error('Error sanitizing request:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'REQUEST_SANITIZATION_FAILED',
        message: 'Failed to process request data',
      },
    });
  }
};

/**
 * Middleware to validate request size
 */
export const validateRequestSize = (maxSizeBytes: number = 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    
    if (contentLength > maxSizeBytes) {
      logger.warn('Request size too large', {
        url: req.url,
        method: req.method,
        contentLength,
        maxSize: maxSizeBytes,
      });

      res.status(413).json({
        success: false,
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: `Request size exceeds maximum allowed size of ${maxSizeBytes} bytes`,
        },
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to validate content type
 */
export const validateContentType = (allowedTypes: string[] = ['application/json']) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.get('content-type');
    
    // Skip validation for GET requests or requests without body
    if (req.method === 'GET' || !contentType) {
      next();
      return;
    }

    const isValidContentType = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isValidContentType) {
      logger.warn('Invalid content type', {
        url: req.url,
        method: req.method,
        contentType,
        allowedTypes,
      });

      res.status(415).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: `Content type must be one of: ${allowedTypes.join(', ')}`,
        },
      });
      return;
    }

    next();
  };
};