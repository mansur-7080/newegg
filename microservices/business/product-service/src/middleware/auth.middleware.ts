/**
 * Real Authentication Middleware
 * Professional JWT authentication and authorization
 * NO FAKE OR MOCK - Real security implementation
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Real JWT Authentication Middleware
 * Verifies JWT tokens and sets user data
 */
export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Authorization header required'
      });
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Real JWT verification
    const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret_key_ultra_secure_2024';
    
    try {
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

      // Real user data validation
      if (!decoded.userId || !decoded.email || !decoded.role) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token payload'
        });
      }

      // Set user data for subsequent middleware
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };

      // Log successful authentication
      logger.debug('User authenticated', {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        endpoint: req.path
      });

      next();

    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }

      if (jwtError instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }

      throw jwtError;
    }

  } catch (error) {
    logger.error('Authentication error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Authentication service error'
    });
  }
};

/**
 * Real Admin Authorization Middleware
 * Ensures user has admin privileges
 */
export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Real role-based authorization
    const adminRoles = ['ADMIN', 'SUPER_ADMIN'];
    
    if (!adminRoles.includes(req.user.role)) {
      logger.securityEvent('Unauthorized admin access attempt', {
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
        endpoint: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(403).json({
        success: false,
        message: 'Admin privileges required'
      });
    }

    // Log admin action
    logger.businessEvent('Admin action', {
      userId: req.user.userId,
      email: req.user.email,
      action: `${req.method} ${req.path}`,
      ip: req.ip
    });

    next();

  } catch (error) {
    logger.error('Authorization error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Authorization service error'
    });
  }
};

/**
 * Real Optional Authentication Middleware
 * Sets user data if token is provided, but doesn't require it
 */
export const optionalAuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(); // Continue without authentication
  }

  // Use the main auth middleware if token is provided
  authMiddleware(req, res, (error) => {
    if (error) {
      // If auth fails, continue without user data instead of returning error
      req.user = undefined;
    }
    next();
  });
};

/**
 * Real Role-based Authorization
 * Check if user has specific role
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.securityEvent('Unauthorized role access attempt', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        endpoint: req.path
      });

      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Real API Key Authentication (for service-to-service communication)
 */
export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKey = process.env.API_KEY || 'dev_api_key_ultra_secure_2024';

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key required'
    });
  }

  if (apiKey !== validApiKey) {
    logger.securityEvent('Invalid API key attempt', {
      providedKey: apiKey.substring(0, 10) + '...',
      ip: req.ip,
      endpoint: req.path
    });

    return res.status(401).json({
      success: false,
      message: 'Invalid API key'
    });
  }

  logger.debug('API key authenticated', {
    endpoint: req.path,
    ip: req.ip
  });

  next();
};