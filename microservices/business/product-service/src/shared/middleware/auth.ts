/**
 * Authentication Middleware
 * Professional auth middleware for product microservice
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError, AuthorizationError } from '../errors';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    const error = new AuthenticationError('Access token required');
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code
    });
      return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    req.user = decoded;
    next();
  } catch (error) {
    const authError = new AuthenticationError('Invalid or expired token');
    res.status(authError.statusCode).json({
      success: false,
      message: authError.message,
      code: authError.code
    });
      return;
  }
};

export const authorize = (requiredRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const error = new AuthenticationError('User not authenticated');
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code
      });
      return;
    }

    if (!requiredRoles.includes(req.user.role)) {
      const error = new AuthorizationError('Insufficient permissions');
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code
      });
      return;
    }

    next();
  };
};
