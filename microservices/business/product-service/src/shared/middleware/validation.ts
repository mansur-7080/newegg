/**
 * Validation Middleware
 * Professional request validation for product microservice
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ValidationError } from '../errors';

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }));

    const validationError = new ValidationError('Validation failed', { errors: errorMessages });
    res.status(validationError.statusCode).json({
      success: false,
      message: validationError.message,
      code: validationError.code,
      details: validationError.details
    });
      return;
  }

  next();
};
