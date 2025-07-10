import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from './errorHandler';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Authentication middleware
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Access token required', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as any;

    if (decoded.type !== 'access') {
      throw new AppError('Invalid token type', 401);
    }

    // Add user to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'user',
    };

    logger.debug('User authenticated', { userId: decoded.userId, email: decoded.email });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid JWT token', { error: error.message });
      next(new AppError('Invalid token', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Expired JWT token', { error: error.message });
      next(new AppError('Token expired', 401));
    } else {
      logger.error('Authentication error', { error: error instanceof Error ? error.message : error });
      next(error);
    }
  }
};

/**
 * Optional authentication middleware (doesn't throw error if no token)
 */
export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as any;

    if (decoded.type === 'access') {
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role || 'user',
      };

      logger.debug('User authenticated (optional)', { userId: decoded.userId });
    }

    next();
  } catch (error) {
    // Don't throw error for optional auth
    logger.debug('Optional authentication failed', { error: error instanceof Error ? error.message : error });
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Insufficient permissions', { 
        userId: req.user.id, 
        userRole: req.user.role, 
        requiredRoles: roles 
      });
      next(new AppError('Insufficient permissions', 403));
      return;
    }

    logger.debug('Role authorization passed', { 
      userId: req.user.id, 
      userRole: req.user.role, 
      requiredRoles: roles 
    });

    next();
  };
};

/**
 * Admin authorization middleware
 */
export const adminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  requireRole(['admin'])(req, res, next);
};

/**
 * User authorization middleware (user can access their own data or admin)
 */
export const userOrAdminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    next(new AppError('Authentication required', 401));
    return;
  }

  const userId = req.params.id || req.params.userId;
  
  if (req.user.role === 'admin' || req.user.id === userId) {
    next();
  } else {
    logger.warn('User access denied', { 
      userId: req.user.id, 
      requestedUserId: userId 
    });
    next(new AppError('Access denied', 403));
  }
};

/**
 * Rate limiting middleware
 */
export const rateLimitMiddleware = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();

    const userRequests = requests.get(key);

    if (!userRequests || now > userRequests.resetTime) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
    } else {
      userRequests.count++;
      
      if (userRequests.count > maxRequests) {
        logger.warn('Rate limit exceeded', { ip: key, count: userRequests.count });
        next(new AppError('Too many requests', 429));
        return;
      }
    }

    next();
  };
};