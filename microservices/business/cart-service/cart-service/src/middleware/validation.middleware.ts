import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';
import { logger } from '../utils/logger';

export const validateRequest = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const errorDetails = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        logger.warn('Validation failed', {
          path: req.path,
          method: req.method,
          errors: errorDetails,
        });

        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: errorDetails,
          },
        });
      }

      // Replace request body with validated data
      req.body = value;
      next();
    } catch (error) {
      logger.error('Validation middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        method: req.method,
      });

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Validation service error',
        },
      });
    }
  };
};