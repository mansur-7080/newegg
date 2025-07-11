/**
 * UltraMarket Auth Service - Authentication Middleware
 * Professional authentication middleware for route protection
 */

import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/token.service';
import { UserService } from '../services/user.service';
import { ApiError } from '@ultramarket/shared/errors/api-error';
import { logger } from '@ultramarket/shared/logging/logger';

const tokenService = new TokenService();
const userService = new UserService();

// Extend Express Request interface
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
 * Verifies JWT token and attaches user to request
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new ApiError(401, 'Authorization header is required');
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      throw new ApiError(401, 'Access token is required');
    }

    // Verify access token
    const decoded = await tokenService.verifyAccessToken(token);

    // Get user information
    const user = await userService.findById(decoded.userId);

    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    if (!user.isActive) {
      throw new ApiError(401, 'User account is deactivated');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    logger.info('User authenticated', {
      userId: user.id,
      email: user.email,
      role: user.role,
      operation: 'auth_middleware',
    });

    next();
  } catch (error) {
    logger.error('Authentication failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      operation: 'auth_middleware',
    });

    if (error instanceof ApiError) {
      next(error);
    } else {
      next(new ApiError(401, 'Invalid access token'));
    }
  }
}

/**
 * Role-based access control middleware
 * Checks if user has required role
 */
export function requireRole(requiredRole: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      if (req.user.role !== requiredRole && req.user.role !== 'ADMIN') {
        throw new ApiError(403, `Access denied. Required role: ${requiredRole}`);
      }

      logger.info('Role check passed', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRole,
        operation: 'require_role',
      });

      next();
    } catch (error) {
      logger.error('Role check failed', {
        error: error.message,
        userId: req.user?.id,
        userRole: req.user?.role,
        requiredRole,
        operation: 'require_role',
      });

      next(error);
    }
  };
}

/**
 * Permission-based access control middleware
 * Checks if user has required permission
 */
export function requirePermission(requiredPermission: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      // For now, we'll use role-based permissions
      // In a full implementation, you'd check against a permissions table
      const hasPermission = await checkUserPermission(req.user.id, requiredPermission);

      if (!hasPermission) {
        throw new ApiError(403, `Access denied. Required permission: ${requiredPermission}`);
      }

      logger.info('Permission check passed', {
        userId: req.user.id,
        requiredPermission,
        operation: 'require_permission',
      });

      next();
    } catch (error) {
      logger.error('Permission check failed', {
        error: error.message,
        userId: req.user?.id,
        requiredPermission,
        operation: 'require_permission',
      });

      next(error);
    }
  };
}

/**
 * Optional authentication middleware
 * Attaches user to request if token is provided, but doesn't require it
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return next();
    }

    // Verify access token
    const decoded = await tokenService.verifyAccessToken(token);

    // Get user information
    const user = await userService.findById(decoded.userId);

    if (user && user.isActive) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      logger.info('Optional authentication successful', {
        userId: user.id,
        email: user.email,
        operation: 'optional_auth_middleware',
      });
    }

    next();
  } catch (error) {
    // For optional auth, we don't throw errors, just continue
    logger.debug('Optional authentication failed', {
      error: error.message,
      operation: 'optional_auth_middleware',
    });

    next();
  }
}

/**
 * Check if user has specific permission
 * This is a simplified implementation - in production, you'd query a permissions table
 */
async function checkUserPermission(userId: string, permission: string): Promise<boolean> {
  try {
    // Get user with role and permissions
    const user = await userService.findById(userId);

    if (!user) {
      return false;
    }

    // Simple role-based permission check
    // In a real implementation, you'd have a proper RBAC system
    const rolePermissions: Record<string, string[]> = {
      ADMIN: ['*'], // Admin has all permissions
      MANAGER: [
        'user:read',
        'user:update',
        'product:read',
        'product:create',
        'product:update',
        'order:read',
        'order:update',
      ],
      USER: [
        'profile:read',
        'profile:update',
        'order:create',
        'order:read',
      ],
    };

    const userPermissions = rolePermissions[user.role] || [];
    
    return userPermissions.includes('*') || userPermissions.includes(permission);
  } catch (error) {
    logger.error('Permission check failed', {
      error: error.message,
      userId,
      permission,
      operation: 'check_user_permission',
    });
    return false;
  }
}

/**
 * Rate limiting middleware for authentication endpoints
 */
export function authRateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // This would integrate with a rate limiting service like Redis
  // For now, we'll just pass through
  next();
}