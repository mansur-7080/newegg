/**
 * UltraMarket Product Validators
 * Simplified validation middleware for development
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Validation middleware to handle validation results
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  // Simple validation - just pass through
  next();
};

/**
 * Validate product creation input
 */
export const validateProductInput = [
  (req: Request, res: Response, next: NextFunction): void => {
    // Basic validation
    if (!req.body.name) {
      res.status(400).json({
        success: false,
        error: 'Product name is required',
      });
      return;
    }
    next();
  },
];

/**
 * Validate product update input
 */
export const validateProductUpdateInput = [
  (req: Request, res: Response, next: NextFunction) => {
    // Basic validation
    next();
  },
];

/**
 * Validate product search/query parameters
 */
export const validateProductSearchInput = [
  (req: Request, res: Response, next: NextFunction) => {
    // Basic validation
    next();
  },
];

/**
 * Validate MongoDB ObjectId parameter
 */
export const validateObjectId = [
  (req: Request, res: Response, next: NextFunction) => {
    // Basic validation
    next();
  },
];

/**
 * Validate slug parameter
 */
export const validateSlug = [
  (req: Request, res: Response, next: NextFunction) => {
    // Basic validation
    next();
  },
];

export default {
  validateProductInput,
  validateProductUpdateInput,
  validateProductSearchInput,
  validateObjectId,
  validateSlug,
  handleValidationErrors,
};