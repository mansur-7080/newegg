/**
 * UltraMarket Authentication Middleware
 * Professional authentication and authorization middleware for product service
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '@ultramarket/shared/logging/logger';
import { AuthorizationError, AuthenticationError } from '@ultramarket/shared/errors';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'admin' | 'vendor' | 'customer';
        vendorId?: string;
        permissions?: string[];
      };
    }
  }
}

/**
 * Middleware to verify JWT token and authenticate user
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractTokenFromHeader(req);
    
    if (!token) {
      throw new AuthenticationError('Authentication token required');
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as any;

    // Set user in request
    req.user = {
      id: decoded.userId || decoded.id,
      email: decoded.email,
      role: decoded.role || 'customer',
      vendorId: decoded.vendorId,
      permissions: decoded.permissions || [],
    };

    logger.debug('User authenticated successfully', {
      userId: req.user.id,
      role: req.user.role,
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed', { error: error.message });
    
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AuthenticationError('Invalid authentication token'));
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AuthenticationError('Authentication token expired'));
    }
    
    next(error);
  }
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (req.user.role !== 'admin') {
      throw new AuthorizationError('Admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to require vendor role or admin
 */
export const requireVendor = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const allowedRoles = ['admin', 'vendor'];
    if (!allowedRoles.includes(req.user.role)) {
      throw new AuthorizationError('Vendor or admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to require ownership or admin access
 * Used for product operations where user should own the resource or be admin
 */
export const requireOwnershipOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // For vendors, check if they own the resource
    if (req.user.role === 'vendor') {
      // The actual ownership check should be done in the controller
      // This middleware just ensures the user is a vendor or admin
      return next();
    }

    throw new AuthorizationError('Insufficient permissions');
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Sets user if token is valid, but doesn't require authentication
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractTokenFromHeader(req);
    
    if (!token) {
      return next(); // No token, continue without authentication
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as any;

    req.user = {
      id: decoded.userId || decoded.id,
      email: decoded.email,
      role: decoded.role || 'customer',
      vendorId: decoded.vendorId,
      permissions: decoded.permissions || [],
    };

    next();
  } catch (error) {
    // If token is invalid, continue without authentication
    logger.debug('Optional authentication failed, continuing without auth', {
      error: error.message,
    });
    next();
  }
};

/**
 * Middleware to check specific permissions
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      // Admin has all permissions
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user has the specific permission
      if (!req.user.permissions?.includes(permission)) {
        throw new AuthorizationError(`Permission required: ${permission}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Extract JWT token from Authorization header
 */
function extractTokenFromHeader(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Middleware to validate API key for service-to-service communication
 */
export const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    const validApiKey = process.env.INTERNAL_API_KEY;

    if (!apiKey || !validApiKey) {
      throw new AuthenticationError('API key required');
    }

    if (apiKey !== validApiKey) {
      throw new AuthenticationError('Invalid API key');
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default {
  requireAuth,
  requireAdmin,
  requireVendor,
  requireOwnershipOrAdmin,
  optionalAuth,
  requirePermission,
  requireApiKey,
};