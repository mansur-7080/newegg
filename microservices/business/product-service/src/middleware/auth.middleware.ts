/**
 * Authentication Middleware
 * Professional JWT authentication and authorization
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '@ultramarket/shared/logging/logger';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin';
  permissions: string[];
  vendorId?: string;
  isActive: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Verify JWT token and attach user to request
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'TOKEN_MISSING',
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET environment variable not set');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, jwtSecret) as any;

    // Validate token structure
    if (!decoded.id || !decoded.email || !decoded.role) {
      logger.warn('Invalid token structure', { 
        tokenPayload: decoded,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid token format',
        code: 'TOKEN_INVALID',
      });
    }

    // Check if user is active
    if (decoded.isActive === false) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    // Attach user to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
      vendorId: decoded.vendorId,
      isActive: decoded.isActive !== false,
    };

    logger.debug('Token authenticated successfully', {
      userId: decoded.id,
      role: decoded.role,
      ip: req.ip,
    });

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Token expired', { 
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid token', { 
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'TOKEN_INVALID',
      });
    }

    logger.error('Authentication error', { 
      error: error instanceof Error ? error.message : error,
      ip: req.ip,
    });

    return res.status(500).json({
      success: false,
      message: 'Authentication service error',
    });
  }
};

/**
 * Require authentication (wrapper for optional auth)
 */
export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  authenticateToken(req, res, (error) => {
    if (error) return next(error);
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    next();
  });
};

/**
 * Optional authentication (don't fail if no token)
 */
export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    // No token provided, continue without user
    return next();
  }

  // Token provided, try to authenticate
  authenticateToken(req, res, next);
};

/**
 * Require specific role
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Access denied - insufficient role', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        ip: req.ip,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_ROLE',
        required: roles,
        current: req.user.role,
      });
    }

    next();
  };
};

/**
 * Require specific permission
 */
export const requirePermission = (...permissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const hasPermission = permissions.some(permission => 
      req.user!.permissions.includes(permission)
    );

    if (!hasPermission) {
      logger.warn('Access denied - insufficient permissions', {
        userId: req.user.id,
        userPermissions: req.user.permissions,
        requiredPermissions: permissions,
        ip: req.ip,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSION',
        required: permissions,
        current: req.user.permissions,
      });
    }

    next();
  };
};

/**
 * Check if user is admin
 */
export const requireAdmin = requireRole('admin');

/**
 * Check if user is vendor or admin
 */
export const requireVendor = requireRole('vendor', 'admin');

/**
 * Check if user owns the resource or is admin
 */
export const requireOwnershipOrAdmin = (resourceIdParam: string = 'id') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // Admin can access anything
    if (req.user.role === 'admin') {
      return next();
    }

    const resourceId = req.params[resourceIdParam];
    
    // For vendors, check if they own the resource
    if (req.user.role === 'vendor') {
      // This will be validated in the controller by checking vendorId
      return next();
    }

    // For customers, check if it's their own resource
    if (resourceId === req.user.id) {
      return next();
    }

    logger.warn('Access denied - resource ownership required', {
      userId: req.user.id,
      resourceId,
      userRole: req.user.role,
      ip: req.ip,
      path: req.path,
    });

    return res.status(403).json({
      success: false,
      message: 'You can only access your own resources',
      code: 'OWNERSHIP_REQUIRED',
    });
  };
};

/**
 * Rate limiting per user
 */
export const createUserRateLimit = (maxRequests: number, windowMs: number) => {
  const userRequests = new Map<string, { count: number; resetTime: number }>();

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(); // Skip rate limiting for unauthenticated requests
    }

    const userId = req.user.id;
    const now = Date.now();
    const userLimit = userRequests.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize limit
      userRequests.set(userId, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (userLimit.count >= maxRequests) {
      logger.warn('User rate limit exceeded', {
        userId,
        count: userLimit.count,
        maxRequests,
        ip: req.ip,
      });

      return res.status(429).json({
        success: false,
        message: 'Too many requests',
        code: 'USER_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000),
      });
    }

    // Increment request count
    userLimit.count++;
    next();
  };
};

/**
 * Check API key authentication (for service-to-service)
 */
export const authenticateApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key required',
      code: 'API_KEY_MISSING',
    });
  }

  const validApiKeys = process.env.API_KEYS?.split(',') || [];

  if (!validApiKeys.includes(apiKey)) {
    logger.warn('Invalid API key used', {
      apiKey: apiKey.substring(0, 8) + '...',
      ip: req.ip,
    });

    return res.status(401).json({
      success: false,
      message: 'Invalid API key',
      code: 'API_KEY_INVALID',
    });
  }

  logger.debug('API key authenticated', {
    apiKey: apiKey.substring(0, 8) + '...',
    ip: req.ip,
  });

  next();
};