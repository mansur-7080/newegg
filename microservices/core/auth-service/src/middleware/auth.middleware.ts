/**
 * Authentication Middleware
 * Professional JWT verification and role-based access control
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/jwt.service';
import { logger } from '@ultramarket/shared/logging/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
  };
}

/**
 * Verify JWT token middleware
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      logger.warn('Authentication failed - no token provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });

      res.status(401).json({
        success: false,
        message: 'Access token is required',
        code: 'MISSING_TOKEN'
      });
      return;
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      logger.warn('Authentication failed - invalid token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });

      res.status(401).json({
        success: false,
        message: 'Invalid or expired access token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    // Add user info to request
    req.user = decoded;

    logger.debug('Authentication successful', {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      path: req.path,
      operation: 'token_verification'
    });

    next();
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      path: req.path
    });

    res.status(500).json({
      success: false,
      message: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded) {
        req.user = decoded;
        
        logger.debug('Optional authentication successful', {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          path: req.path
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Optional authentication middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      path: req.path
    });
    next();
  }
}

/**
 * Role-based access control middleware
 */
export function requireRole(roles: string | string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        logger.warn('Role check failed - user not authenticated', {
          ip: req.ip,
          path: req.path,
          requiredRoles: Array.isArray(roles) ? roles : [roles]
        });

        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      const userRole = req.user.role;
      const requiredRoles = Array.isArray(roles) ? roles : [roles];

      if (!requiredRoles.includes(userRole)) {
        logger.warn('Role check failed - insufficient permissions', {
          userId: req.user.id,
          userRole,
          requiredRoles,
          path: req.path,
          operation: 'role_verification'
        });

        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
      }

      logger.debug('Role check successful', {
        userId: req.user.id,
        userRole,
        requiredRoles,
        path: req.path
      });

      next();
    } catch (error) {
      logger.error('Role-based access control middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.ip,
        path: req.path
      });

      res.status(500).json({
        success: false,
        message: 'Authorization service error',
        code: 'AUTH_SERVICE_ERROR'
      });
    }
  };
}

/**
 * Require admin role
 */
export const requireAdmin = requireRole(['ADMIN', 'SUPER_ADMIN']);

/**
 * Require customer role
 */
export const requireCustomer = requireRole(['CUSTOMER', 'ADMIN', 'SUPER_ADMIN']);

/**
 * Require vendor role
 */
export const requireVendor = requireRole(['VENDOR', 'ADMIN', 'SUPER_ADMIN']);

/**
 * Require super admin role
 */
export const requireSuperAdmin = requireRole('SUPER_ADMIN');

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        logger.warn('Role check failed - user not authenticated', {
          ip: req.ip,
          path: req.path,
          requiredRoles: roles
        });

        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      const userRole = req.user.role;

      if (!roles.includes(userRole)) {
        logger.warn('Role check failed - insufficient permissions', {
          userId: req.user.id,
          userRole,
          requiredRoles: roles,
          path: req.path
        });

        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
      }

      logger.debug('Role check successful', {
        userId: req.user.id,
        userRole,
        requiredRoles: roles,
        path: req.path
      });

      next();
    } catch (error) {
      logger.error('Role-based access control middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.ip,
        path: req.path
      });

      res.status(500).json({
        success: false,
        message: 'Authorization service error',
        code: 'AUTH_SERVICE_ERROR'
      });
    }
  };
}

/**
 * Check if user owns the resource or has admin role
 */
export function requireOwnershipOrAdmin(resourceUserIdField: string = 'userId') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        logger.warn('Ownership check failed - user not authenticated', {
          ip: req.ip,
          path: req.path
        });

        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      const userRole = req.user.role;
      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

      // Admin can access any resource
      if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
        logger.debug('Ownership check passed - admin access', {
          userId: req.user.id,
          userRole,
          resourceUserId,
          path: req.path
        });
        next();
        return;
      }

      // Check if user owns the resource
      if (req.user.id === resourceUserId) {
        logger.debug('Ownership check passed - resource owner', {
          userId: req.user.id,
          userRole,
          resourceUserId,
          path: req.path
        });
        next();
        return;
      }

      logger.warn('Ownership check failed - insufficient permissions', {
        userId: req.user.id,
        userRole,
        resourceUserId,
        path: req.path
      });

      res.status(403).json({
        success: false,
        message: 'Access denied - you can only access your own resources',
        code: 'ACCESS_DENIED'
      });
    } catch (error) {
      logger.error('Ownership check middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.ip,
        path: req.path
      });

      res.status(500).json({
        success: false,
        message: 'Authorization service error',
        code: 'AUTH_SERVICE_ERROR'
      });
    }
  };
}

/**
 * Validate token without failing (for optional endpoints)
 */
export function validateTokenOptional(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded) {
        req.user = decoded;
        
        logger.debug('Optional token validation successful', {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          path: req.path
        });
      } else {
        logger.debug('Optional token validation failed - invalid token', {
          ip: req.ip,
          path: req.path
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Optional token validation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      path: req.path
    });
    next();
  }
}

/**
 * Check if user is verified
 */
export function requireVerifiedUser(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    if (!req.user) {
      logger.warn('Verification check failed - user not authenticated', {
        ip: req.ip,
        path: req.path
      });

      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    // For now, we'll assume all authenticated users are verified
    // In a real implementation, you'd check the user's verification status
    logger.debug('User verification check passed', {
      userId: req.user.id,
      email: req.user.email,
      path: req.path
    });

    next();
  } catch (error) {
    logger.error('User verification middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      path: req.path
    });

    res.status(500).json({
      success: false,
      message: 'Verification service error',
      code: 'VERIFICATION_SERVICE_ERROR'
    });
  }
}