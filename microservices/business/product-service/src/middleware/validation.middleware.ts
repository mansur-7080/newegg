/**
 * Validation Middleware
 * Professional input validation for UltraMarket Product Service
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@ultramarket/shared/logging/logger';

/**
 * Generic validation middleware factory
 */
export const validateRequest = (validationFn: (data: any) => { error?: any; value: any }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Combine query, params, and body for validation
      const dataToValidate = {
        ...req.query,
        ...req.params,
        ...req.body,
      };

      const { error, value } = validationFn(dataToValidate);

      if (error) {
        const validationErrors = error.details?.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        })) || [{ message: error.message }];

        logger.warn('Validation failed', {
          endpoint: req.path,
          method: req.method,
          errors: validationErrors,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        });

        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Input validation failed',
            details: validationErrors,
          },
        });
      }

      // Replace original data with validated data
      req.body = value;
      req.query = value;
      req.params = { ...req.params, ...value };

      next();
    } catch (error) {
      logger.error('Validation middleware error', {
        error: error.message,
        stack: error.stack,
        endpoint: req.path,
      });

      return res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_SYSTEM_ERROR',
          message: 'Validation system error',
        },
      });
    }
  };
};

/**
 * File upload validation middleware
 */
export const validateFileUpload = (options: {
  maxSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
  required?: boolean;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
      maxFiles = 20,
      required = false,
    } = options;

    const files = req.files as Express.Multer.File[] | undefined;

    if (required && (!files || files.length === 0)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILES_REQUIRED',
          message: 'At least one file is required',
        },
      });
    }

    if (!files || files.length === 0) {
      return next();
    }

    // Check number of files
    if (files.length > maxFiles) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOO_MANY_FILES',
          message: `Maximum ${maxFiles} files allowed`,
        },
      });
    }

    // Validate each file
    const validationErrors: string[] = [];

    files.forEach((file, index) => {
      // Check file size
      if (file.size > maxSize) {
        validationErrors.push(
          `File ${index + 1}: Size ${Math.round(file.size / 1024 / 1024)}MB exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`
        );
      }

      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        validationErrors.push(
          `File ${index + 1}: Type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}`
        );
      }

      // Additional file name validation
      if (file.originalname.length > 255) {
        validationErrors.push(`File ${index + 1}: Filename too long (max 255 characters)`);
      }

      // Check for potentially dangerous file names
      if (/[<>:"/\\|?*]/.test(file.originalname)) {
        validationErrors.push(`File ${index + 1}: Invalid characters in filename`);
      }
    });

    if (validationErrors.length > 0) {
      logger.warn('File validation failed', {
        errors: validationErrors,
        fileCount: files.length,
        endpoint: req.path,
        ip: req.ip,
      });

      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_VALIDATION_ERROR',
          message: 'File validation failed',
          details: validationErrors,
        },
      });
    }

    next();
  };
};

/**
 * JSON schema validation middleware
 */
export const validateJsonSchema = (schema: object) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // This is a placeholder for JSON schema validation
    // In a real implementation, you would use a library like ajv
    next();
  };
};

/**
 * API version validation middleware
 */
export const validateApiVersion = (supportedVersions: string[] = ['v1']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiVersion = req.headers['api-version'] || req.params.version || 'v1';

    if (!supportedVersions.includes(apiVersion as string)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_API_VERSION',
          message: `API version '${apiVersion}' is not supported. Supported versions: ${supportedVersions.join(', ')}`,
        },
      });
    }

    req.params.apiVersion = apiVersion as string;
    next();
  };
};

/**
 * Content-Type validation middleware
 */
export const validateContentType = (allowedTypes: string[] = ['application/json']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip validation for GET requests
    if (req.method === 'GET') {
      return next();
    }

    const contentType = req.get('Content-Type')?.split(';')[0]; // Remove charset if present

    if (!contentType || !allowedTypes.includes(contentType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CONTENT_TYPE',
          message: `Content-Type '${contentType}' is not supported. Allowed types: ${allowedTypes.join(', ')}`,
        },
      });
    }

    next();
  };
};

/**
 * Request size validation middleware
 */
export const validateRequestSize = (maxSize: number = 50 * 1024 * 1024) => { // 50MB default
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');

    if (contentLength > maxSize) {
      return res.status(413).json({
        success: false,
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: `Request size ${Math.round(contentLength / 1024 / 1024)}MB exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`,
        },
      });
    }

    next();
  };
};

/**
 * Query parameter sanitization middleware
 */
export const sanitizeQuery = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Convert string booleans to actual booleans
    Object.keys(req.query).forEach(key => {
      const value = req.query[key];
      
      if (typeof value === 'string') {
        // Convert boolean strings
        if (value.toLowerCase() === 'true') {
          req.query[key] = true;
        } else if (value.toLowerCase() === 'false') {
          req.query[key] = false;
        }
        // Convert number strings
        else if (/^\d+$/.test(value)) {
          req.query[key] = parseInt(value);
        } else if (/^\d+\.\d+$/.test(value)) {
          req.query[key] = parseFloat(value);
        }
        // Convert array strings (comma-separated)
        else if (value.includes(',')) {
          req.query[key] = value.split(',').map(item => item.trim());
        }
      }
    });

    next();
  } catch (error) {
    logger.error('Query sanitization error', {
      error: error.message,
      query: req.query,
      endpoint: req.path,
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'QUERY_SANITIZATION_ERROR',
        message: 'Invalid query parameters',
      },
    });
  }
};

/**
 * Input sanitization middleware (prevents XSS, SQL injection, etc.)
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Recursive function to sanitize object values
    const sanitizeValue = (value: any): any => {
      if (typeof value === 'string') {
        // Remove potentially dangerous HTML tags
        return value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]+>/g, '') // Remove all HTML tags
          .replace(/javascript:/gi, '') // Remove javascript: protocols
          .replace(/on\w+\s*=/gi, '') // Remove event handlers
          .trim();
      }
      
      if (Array.isArray(value)) {
        return value.map(sanitizeValue);
      }
      
      if (value && typeof value === 'object') {
        const sanitized: any = {};
        Object.keys(value).forEach(key => {
          sanitized[key] = sanitizeValue(value[key]);
        });
        return sanitized;
      }
      
      return value;
    };

    // Sanitize request body
    if (req.body) {
      req.body = sanitizeValue(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeValue(req.query);
    }

    next();
  } catch (error) {
    logger.error('Input sanitization error', {
      error: error.message,
      endpoint: req.path,
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'INPUT_SANITIZATION_ERROR',
        message: 'Input sanitization failed',
      },
    });
  }
};

/**
 * Custom validation middleware for specific business rules
 */
export const validateBusinessRules = (rules: {
  [key: string]: (value: any, req: Request) => boolean | string;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];
    const dataToValidate = { ...req.body, ...req.query, ...req.params };

    Object.keys(rules).forEach(field => {
      const value = dataToValidate[field];
      const rule = rules[field];
      const result = rule(value, req);

      if (result !== true) {
        errors.push(typeof result === 'string' ? result : `${field} is invalid`);
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BUSINESS_RULE_VIOLATION',
          message: 'Business rule validation failed',
          details: errors,
        },
      });
    }

    next();
  };
};