import { Request, Response, NextFunction } from 'express';
import { AppError, HttpStatusCode, ErrorCode, ResourceNotFoundError, BusinessRuleViolationError, AuthorizationError, ValidationError } from '../../libs/shared';

interface AppError extends Error {
  statusCode?: number;
}

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new Error(`Not Found - ${req.originalUrl}`) as AppError;
  error.statusCode = 404;
  next(error);
};
