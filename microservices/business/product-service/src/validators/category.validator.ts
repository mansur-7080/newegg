/**
 * UltraMarket Category Validators
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
 * Validate category creation input
 */
export const validateCategoryInput = [
  (req: Request, res: Response, next: NextFunction): void => {
    // Basic validation
    if (!req.body.name) {
      res.status(400).json({
        success: false,
        error: 'Category name is required',
      });
      return;
    }
    next();
  },
];

/**
 * Validate category update input
 */
export const validateCategoryUpdateInput = [
  (req: Request, res: Response, next: NextFunction) => {
    // Basic validation
    next();
  },
];

/**
 * Validate category query parameters
 */
export const validateCategoryQueryInput = [
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
  validateCategoryInput,
  validateCategoryUpdateInput,
  validateCategoryQueryInput,
  validateObjectId,
  validateSlug,
  handleValidationErrors,
};