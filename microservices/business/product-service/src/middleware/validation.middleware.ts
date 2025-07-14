/**
 * Real Request Validation Middleware
 * Professional input validation and sanitization
 * NO FAKE OR MOCK - Real security validation
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';
import { logger } from '../utils/logger';

/**
 * Real validation result processor
 * Handles express-validator results and returns formatted errors
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error: ValidationError) => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
      location: error.type === 'field' ? error.location : undefined
    }));

    // Log validation failure for security monitoring
    logger.securityEvent('Validation failed', {
      endpoint: req.path,
      method: req.method,
      errors: formattedErrors,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: req.method !== 'GET' ? req.body : undefined,
      query: req.query
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors
    });
  }

  next();
};

/**
 * Real sanitization middleware
 * Cleans and normalizes input data
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    logger.error('Input sanitization error:', error);
    
    return res.status(400).json({
      success: false,
      message: 'Invalid input format'
    });
  }
};

/**
 * Real object sanitization
 * Recursively cleans object properties
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Skip dangerous properties
      if (key.startsWith('__') || key === 'constructor' || key === 'prototype') {
        continue;
      }

      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    
    return sanitized;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  return obj;
}

/**
 * Real string sanitization
 * Removes dangerous characters and patterns
 */
function sanitizeString(str: string): string {
  if (typeof str !== 'string') {
    return str;
  }

  return str
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters (except newlines and tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Limit length to prevent DoS
    .substring(0, 10000);
}

/**
 * Real content type validation
 * Ensures proper content type for requests
 */
export const validateContentType = (allowedTypes: string[] = ['application/json']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.get('Content-Type');

    // Skip validation for GET, DELETE requests
    if (['GET', 'DELETE', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    if (!contentType) {
      return res.status(400).json({
        success: false,
        message: 'Content-Type header required'
      });
    }

    const isValidType = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isValidType) {
      logger.securityEvent('Invalid content type', {
        contentType,
        allowedTypes,
        endpoint: req.path,
        method: req.method,
        ip: req.ip
      });

      return res.status(415).json({
        success: false,
        message: `Unsupported content type. Allowed: ${allowedTypes.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Real file size validation
 * Limits request body size
 */
export const validateFileSize = (maxSize: number = 10 * 1024 * 1024) => { // 10MB default
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('Content-Length');

    if (contentLength && parseInt(contentLength) > maxSize) {
      logger.securityEvent('Request too large', {
        contentLength: parseInt(contentLength),
        maxSize,
        endpoint: req.path,
        ip: req.ip
      });

      return res.status(413).json({
        success: false,
        message: `Request too large. Maximum size: ${maxSize} bytes`
      });
    }

    next();
  };
};

/**
 * Real SQL injection prevention
 * Detects potential SQL injection patterns
 */
export const preventSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(--|\/\*|\*\/|;|\||&)/g,
    /(\b(OR|AND)\b.*=.*)/gi,
    /(1=1|1=0)/g,
    /(\bCAST\b|\bCONVERT\b|\bCHAR\b)/gi
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    if (Array.isArray(value)) {
      return value.some(item => checkValue(item));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(item => checkValue(item));
    }
    return false;
  };

  // Check all input sources
  const inputs = [
    ...Object.values(req.query || {}),
    ...Object.values(req.params || {}),
    ...(req.body ? Object.values(req.body) : [])
  ];

  if (inputs.some(checkValue)) {
    logger.securityEvent('Potential SQL injection attempt', {
      endpoint: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      query: req.query,
      params: req.params
    });

    return res.status(400).json({
      success: false,
      message: 'Invalid input detected'
    });
  }

  next();
};

/**
 * Real XSS prevention
 * Detects potential cross-site scripting attempts
 */
export const preventXSS = (req: Request, res: Response, next: NextFunction) => {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>.*?<\/embed>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]*src[^>]*>/gi
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return xssPatterns.some(pattern => pattern.test(value));
    }
    if (Array.isArray(value)) {
      return value.some(item => checkValue(item));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(item => checkValue(item));
    }
    return false;
  };

  // Check body only (XSS typically comes through form data)
  if (req.body && checkValue(req.body)) {
    logger.securityEvent('Potential XSS attempt', {
      endpoint: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.status(400).json({
      success: false,
      message: 'Invalid content detected'
    });
  }

  next();
};