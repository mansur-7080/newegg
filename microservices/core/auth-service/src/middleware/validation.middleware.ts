import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { BadRequestError } from '@ultramarket/shared/errors';

export const validationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors: Record<string, string[]> = {};
    
    errors.array().forEach((error) => {
      const field = 'path' in error ? error.path : 'unknown';
      const message = error.msg;
      
      if (!formattedErrors[field]) {
        formattedErrors[field] = [];
      }
      
      formattedErrors[field].push(message);
    });
    
    return next(new BadRequestError('Validation failed'));
  }
  
  next();
};