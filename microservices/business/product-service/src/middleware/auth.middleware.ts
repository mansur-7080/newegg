/**
 * Authentication and Authorization Middleware
 * Professional auth system for UltraMarket Product Service
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '@ultramarket/shared/logging/logger';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        permissions: string[];
        vendorId?: string;
        name: string;
        isActive: boolean;
      };
    }
  }
}

/**
 * User roles hierarchy
 */
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  VENDOR = 'VENDOR',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

/**
 * Permission system for fine-grained access control
 */
export const PERMISSIONS = {
  // Product permissions
  'product:read': 'Read product information',
  'product:write': 'Create and update products',
  'product:delete': 'Delete products',
  'product:approve': 'Approve/reject products',
  'product:analytics': 'View product analytics',
  
  // Inventory permissions
  'inventory:read': 'Read inventory information',
  'inventory:write': 'Update inventory',
  
  // Vendor permissions
  'vendor:read': 'Read vendor information',
  'vendor:write': 'Update vendor information',
  'vendor:manage': 'Manage vendors',
  
  // Admin permissions
  'admin:products': 'Full product management',
  'admin:users': 'User management',
  'admin:system': 'System administration',
} as const;

/**
 * Role-based permissions mapping
 */
const ROLE_PERMISSIONS = {
  [UserRole.CUSTOMER]: [
    'product:read',
  ],
  [UserRole.VENDOR]: [
    'product:read',
    'product:write',
    'product:analytics',
    'inventory:read',
    'inventory:write',
    'vendor:read',
    'vendor:write',
  ],
  [UserRole.ADMIN]: [
    'product:read',
    'product:write',
    'product:delete',
    'product:approve',
    'product:analytics',
    'inventory:read',
    'inventory:write',
    'vendor:read',
    'vendor:write',
    'vendor:manage',
    'admin:products',
    'admin:users',
  ],
  [UserRole.SUPER_ADMIN]: Object.keys(PERMISSIONS),
};

/**
 * Authentication middleware
 */
export const authMiddleware = (options: { required: boolean } = { required: true }) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader && !options.required) {
        // Optional auth - continue without user
        return next();
      }

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        if (options.required) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'AUTH_TOKEN_MISSING',
              message: 'Authentication token is required',
            },
          });
        }
        return next();
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      // Extract user information from token
      const user = {
        id: decoded.id || decoded.userId,
        email: decoded.email,
        role: decoded.role,
        permissions: ROLE_PERMISSIONS[decoded.role as UserRole] || [],
        vendorId: decoded.vendorId,
        name: decoded.name,
        isActive: decoded.isActive !== false,
      };

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'USER_INACTIVE',
            message: 'User account is inactive',
          },
        });
      }

      // Attach user to request
      req.user = user;

      logger.debug('User authenticated successfully', {
        userId: user.id,
        role: user.role,
        email: user.email,
        endpoint: req.path,
      });

      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: 'Invalid authentication token',
          },
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_TOKEN_EXPIRED',
            message: 'Authentication token has expired',
          },
        });
      }

      logger.error('Authentication error', {
        error: error.message,
        stack: error.stack,
        endpoint: req.path,
      });

      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication failed',
        },
      });
    }
  };
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication is required',
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Access denied - insufficient role', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        endpoint: req.path,
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Insufficient permissions to access this resource',
        },
      });
    }

    next();
  };
};

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication is required',
        },
      });
    }

    if (!req.user.permissions.includes(permission)) {
      logger.warn('Access denied - insufficient permission', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredPermission: permission,
        userPermissions: req.user.permissions,
        endpoint: req.path,
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: `Permission '${permission}' is required to access this resource`,
        },
      });
    }

    next();
  };
};

/**
 * Vendor ownership validation middleware
 */
export const requireOwnershipOrAdmin = (resourceOwnerField: string = 'vendorId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication is required',
        },
      });
    }

    // Admin can access everything
    if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN) {
      return next();
    }

    // For vendors, check ownership
    if (req.user.role === UserRole.VENDOR) {
      // Resource ownership will be checked in the controller
      // This middleware just ensures vendor has permission
      return next();
    }

    return res.status(403).json({
      success: false,
      error: {
        code: 'ACCESS_DENIED',
        message: 'You can only access your own resources',
      },
    });
  };
};

/**
 * API Key authentication for service-to-service communication
 */
export const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'API_KEY_MISSING',
        message: 'API key is required',
      },
    });
  }

  const validApiKeys = (process.env.VALID_API_KEYS || '').split(',');
  
  if (!validApiKeys.includes(apiKey as string)) {
    logger.warn('Invalid API key used', {
      apiKey: apiKey,
      endpoint: req.path,
      ip: req.ip,
    });

    return res.status(401).json({
      success: false,
      error: {
        code: 'API_KEY_INVALID',
        message: 'Invalid API key',
      },
    });
  }

  next();
};

/**
 * Vendor verification middleware (ensures vendor is verified)
 */
export const requireVerifiedVendor = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication is required',
      },
    });
  }

  // Admin bypass
  if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.SUPER_ADMIN) {
    return next();
  }

  // For vendors, check verification status
  if (req.user.role === UserRole.VENDOR) {
    try {
      // In a real implementation, you would check vendor verification status from database
      // For now, we'll assume vendors in the token are verified
      if (!req.user.vendorId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'VENDOR_NOT_FOUND',
            message: 'Vendor information not found',
          },
        });
      }

      // TODO: Add actual vendor verification check here
      // const vendor = await prisma.vendor.findUnique({
      //   where: { id: req.user.vendorId }
      // });
      // 
      // if (!vendor || !vendor.isVerified) {
      //   return res.status(403).json({
      //     success: false,
      //     error: {
      //       code: 'VENDOR_NOT_VERIFIED',
      //       message: 'Vendor account is not verified',
      //     },
      //   });
      // }

      return next();
    } catch (error) {
      logger.error('Error checking vendor verification', {
        error: error.message,
        userId: req.user.id,
        vendorId: req.user.vendorId,
      });

      return res.status(500).json({
        success: false,
        error: {
          code: 'VERIFICATION_CHECK_FAILED',
          message: 'Failed to verify vendor status',
        },
      });
    }
  }

  return res.status(403).json({
    success: false,
    error: {
      code: 'ACCESS_DENIED',
      message: 'Vendor role is required',
    },
  });
};

/**
 * Rate limiting by user role
 */
export const roleBasedRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // Higher rate limits for paid/premium users
  const userRole = req.user?.role || 'anonymous';
  
  // This would integrate with your rate limiting system
  // Different limits based on role
  const rateLimits = {
    anonymous: 10,
    [UserRole.CUSTOMER]: 50,
    [UserRole.VENDOR]: 200,
    [UserRole.ADMIN]: 1000,
    [UserRole.SUPER_ADMIN]: 10000,
  };

  // Add rate limit info to headers
  res.setHeader('X-RateLimit-Role', userRole);
  res.setHeader('X-RateLimit-Limit', rateLimits[userRole] || rateLimits.anonymous);

  next();
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // API-specific headers
  res.setHeader('X-API-Version', '1.0');
  res.setHeader('X-Service', 'product-service');

  next();
};