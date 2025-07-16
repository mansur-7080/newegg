/**
 * UltraMarket Product Service - TypeScript Validation Middleware
 * Professional input validation and sanitization
 */

import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';

// Custom validation error class
export class ValidationError extends Error {
  public code: string;
  public statusCode: number;

  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.statusCode = 400;
  }
}

// UUID validation
export const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uuid = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuid || !uuidRegex.test(uuid)) {
      return res.status(400).json({
        success: false,
        error: `Invalid ${paramName} format. Must be a valid UUID.`,
        code: 'INVALID_UUID'
      });
    }
    
    next();
  };
};

// Product query validation
export const validateProductQuery = (req: Request, res: Response, next: NextFunction) => {
  const { page, limit, search, category, status } = req.query;
  
  // Validate page
  if (page && (isNaN(Number(page)) || Number(page) < 1)) {
    return res.status(400).json({
      success: false,
      error: 'Page must be a positive integer',
      code: 'INVALID_PAGE'
    });
  }
  
  // Validate limit
  if (limit && (isNaN(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
    return res.status(400).json({
      success: false,
      error: 'Limit must be between 1 and 100',
      code: 'INVALID_LIMIT'
    });
  }
  
  // Validate search
  if (search && (typeof search !== 'string' || search.trim().length === 0)) {
    return res.status(400).json({
      success: false,
      error: 'Search query must be a non-empty string',
      code: 'INVALID_SEARCH'
    });
  }
  
  // Validate status
  if (status && !['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(status as string)) {
    return res.status(400).json({
      success: false,
      error: 'Status must be one of: DRAFT, ACTIVE, INACTIVE, ARCHIVED',
      code: 'INVALID_STATUS'
    });
  }
  
  next();
};

// Search query validation
export const validateSearchQuery = (req: Request, res: Response, next: NextFunction) => {
  const { q, limit } = req.query;
  
  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Search query (q) is required and must be a non-empty string',
      code: 'MISSING_SEARCH_QUERY'
    });
  }
  
  if (q.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Search query cannot exceed 100 characters',
      code: 'SEARCH_QUERY_TOO_LONG'
    });
  }
  
  if (limit && (isNaN(Number(limit)) || Number(limit) < 1 || Number(limit) > 50)) {
    return res.status(400).json({
      success: false,
      error: 'Limit must be between 1 and 50',
      code: 'INVALID_LIMIT'
    });
  }
  
  next();
};

// Create product validation
export const validateCreateProduct = (req: Request, res: Response, next: NextFunction) => {
  const {
    name,
    price,
    categoryId,
    sku,
    description,
    brand,
    status,
    type,
    weight,
    dimensions,
    shortDescription,
    metaTitle,
    metaDescription,
    warranty,
    attributes,
    specifications
  } = req.body;
  
  // Required field validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Product name is required and must be a non-empty string',
      code: 'INVALID_NAME'
    });
  }
  
  if (name.length > 255) {
    return res.status(400).json({
      success: false,
      error: 'Product name cannot exceed 255 characters',
      code: 'NAME_TOO_LONG'
    });
  }
  
  if (!price || typeof price !== 'number' || price <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Price is required and must be a positive number',
      code: 'INVALID_PRICE'
    });
  }
  
  if (price > 999999999) {
    return res.status(400).json({
      success: false,
      error: 'Price cannot exceed 999,999,999',
      code: 'PRICE_TOO_HIGH'
    });
  }
  
  if (!categoryId || typeof categoryId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Category ID is required and must be a string',
      code: 'INVALID_CATEGORY_ID'
    });
  }
  
  if (!sku || typeof sku !== 'string' || sku.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'SKU is required and must be a non-empty string',
      code: 'INVALID_SKU'
    });
  }
  
  if (sku.length > 50) {
    return res.status(400).json({
      success: false,
      error: 'SKU cannot exceed 50 characters',
      code: 'SKU_TOO_LONG'
    });
  }
  
  // Optional field validation
  if (description && (typeof description !== 'string' || description.length > 2000)) {
    return res.status(400).json({
      success: false,
      error: 'Description must be a string with maximum 2000 characters',
      code: 'INVALID_DESCRIPTION'
    });
  }
  
  if (brand && (typeof brand !== 'string' || brand.length > 100)) {
    return res.status(400).json({
      success: false,
      error: 'Brand must be a string with maximum 100 characters',
      code: 'INVALID_BRAND'
    });
  }
  
  if (status && !['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Status must be one of: DRAFT, ACTIVE, INACTIVE, ARCHIVED',
      code: 'INVALID_STATUS'
    });
  }
  
  if (type && !['PHYSICAL', 'DIGITAL', 'SERVICE'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Type must be one of: PHYSICAL, DIGITAL, SERVICE',
      code: 'INVALID_TYPE'
    });
  }
  
  if (weight && (typeof weight !== 'number' || weight < 0)) {
    return res.status(400).json({
      success: false,
      error: 'Weight must be a non-negative number',
      code: 'INVALID_WEIGHT'
    });
  }
  
  next();
};

// Create category validation
export const validateCreateCategory = (req: Request, res: Response, next: NextFunction) => {
  const { name, description } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Category name is required and must be a non-empty string',
      code: 'INVALID_NAME'
    });
  }
  
  if (name.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Category name cannot exceed 100 characters',
      code: 'NAME_TOO_LONG'
    });
  }
  
  if (description && (typeof description !== 'string' || description.length > 500)) {
    return res.status(400).json({
      success: false,
      error: 'Description must be a string with maximum 500 characters',
      code: 'INVALID_DESCRIPTION'
    });
  }
  
  next();
};

// Price range validation
export const validatePriceRange = (req: Request, res: Response, next: NextFunction) => {
  const { minPrice, maxPrice } = req.query;
  
  if (minPrice && (isNaN(Number(minPrice)) || Number(minPrice) < 0)) {
    return res.status(400).json({
      success: false,
      error: 'Minimum price must be a non-negative number',
      code: 'INVALID_MIN_PRICE'
    });
  }
  
  if (maxPrice && (isNaN(Number(maxPrice)) || Number(maxPrice) < 0)) {
    return res.status(400).json({
      success: false,
      error: 'Maximum price must be a non-negative number',
      code: 'INVALID_MAX_PRICE'
    });
  }
  
  if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
    return res.status(400).json({
      success: false,
      error: 'Minimum price cannot be greater than maximum price',
      code: 'INVALID_PRICE_RANGE'
    });
  }
  
  next();
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }
  
  next();
};

// Helper function to sanitize object properties
function sanitizeObject(obj: any): void {
  if (!obj || typeof obj !== 'object') return;
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        // Remove potentially dangerous HTML/script tags
        obj[key] = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
        
        // Trim whitespace
        obj[key] = obj[key].trim();
        
        // Remove null bytes
        obj[key] = obj[key].replace(/\0/g, '');
        
      } else if (typeof value === 'object' && value !== null) {
        sanitizeObject(value);
      }
    }
  }
}

// Rate limiting validation for specific endpoints
export const validateRequestFrequency = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    const clientData = requestCounts.get(clientIP);
    
    if (!clientData || now > clientData.resetTime) {
      requestCounts.set(clientIP, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests from this IP address',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }
    
    clientData.count++;
    next();
  };
};

export default {
  validateUUID,
  validateProductQuery,
  validateSearchQuery,
  validateCreateProduct,
  validateCreateCategory,
  validatePriceRange,
  sanitizeInput,
  validateRequestFrequency
};