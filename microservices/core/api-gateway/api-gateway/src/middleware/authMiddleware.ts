import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

// Simple logger for now - replace with shared logger when available
const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data),
  error: (message: string, data?: any) => console.error(`[ERROR] ${message}`, data),
  debug: (message: string, data?: any) => console.debug(`[DEBUG] ${message}`, data)
};

// Simple ApiError for now - replace with shared error when available
class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    tokenVersion?: number;
  };
}

/**
 * Authenticate JWT token
 */
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new ApiError(401, 'Access token required');
    }

    jwt.verify(token, process.env.JWT_SECRET!, (err: any, decoded: any) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          logger.warn('Token expired', { 
            path: req.path, 
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });
          throw new ApiError(401, 'Token expired');
        }
        if (err.name === 'JsonWebTokenError') {
          logger.warn('Invalid token format', { 
            path: req.path, 
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });
          throw new ApiError(403, 'Invalid token format');
        }
        logger.warn('Token verification failed', { 
          error: err.message,
          path: req.path, 
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        throw new ApiError(403, 'Invalid token');
      }

      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        tokenVersion: decoded.tokenVersion
      };

      logger.info('Token authenticated successfully', {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        path: req.path,
        method: req.method,
        ip: req.ip
      });

      next();
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        error: 'Authentication failed'
      });
      return;
    }
    logger.error('Authentication error', { 
      error: error.message,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      error: 'Authentication failed'
    });
  }
};

/**
 * Require specific role
 */
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      if (!roles.includes(req.user.role)) {
        logger.warn('Insufficient permissions', {
          userId: req.user.userId,
          userRole: req.user.role,
          requiredRoles: roles,
          path: req.path,
          method: req.method,
          ip: req.ip
        });
        throw new ApiError(403, 'Insufficient permissions');
      }

      logger.info('Role check passed', {
        userId: req.user.userId,
        role: req.user.role,
        requiredRoles: roles,
        path: req.path,
        method: req.method
      });

      next();
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: 'Access denied'
        });
        return;
      }
      logger.error('Role check error', { 
        error: error.message,
        path: req.path,
        ip: req.ip
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error during authorization',
        error: 'Access denied'
      });
    }
  };
};

/**
 * Require customer role
 */
export const requireCustomer = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  requireRole(['CUSTOMER', 'ADMIN', 'VENDOR'])(req, res, next);
};

/**
 * Require admin role
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  requireRole(['ADMIN'])(req, res, next);
};

/**
 * Require vendor role
 */
export const requireVendor = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  requireRole(['VENDOR', 'ADMIN'])(req, res, next);
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    jwt.verify(token, process.env.JWT_SECRET!, (err: any, decoded: any) => {
      if (err) {
        // Don't throw error, just continue without user
        logger.debug('Optional authentication failed', {
          error: err.message,
          path: req.path,
          ip: req.ip
        });
        return next();
      }

      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        tokenVersion: decoded.tokenVersion
      };

      logger.debug('Optional authentication successful', {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        path: req.path
      });

      next();
    });
  } catch (error) {
    // Don't throw error, just continue without user
    logger.debug('Optional authentication error', {
      error: error.message,
      path: req.path,
      ip: req.ip
    });
    next();
  }
};

/**
 * Rate limiting per user with Redis-like in-memory storage
 */
export const rateLimitPerUser = (maxRequests: number = 100, windowMs: number = 900000) => {
  const userRequests = new Map<string, { count: number; resetTime: number }>();

  // Clean up expired entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    userRequests.forEach((data, userId) => {
      if (now > data.resetTime) {
        userRequests.delete(userId);
      }
    });
  }, 5 * 60 * 1000);

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        return next();
      }

      const userId = req.user.userId;
      const now = Date.now();
      const userData = userRequests.get(userId);

      if (!userData || now > userData.resetTime) {
        userRequests.set(userId, {
          count: 1,
          resetTime: now + windowMs
        });
      } else {
        userData.count++;
        if (userData.count > maxRequests) {
          logger.warn('Rate limit exceeded', {
            userId,
            count: userData.count,
            maxRequests,
            path: req.path,
            ip: req.ip
          });
          res.status(429).json({
            success: false,
            message: 'Rate limit exceeded',
            error: 'Too many requests',
            retryAfter: Math.ceil((userData.resetTime - now) / 1000)
          });
          return;
        }
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - (userData?.count || 0)).toString());
      res.setHeader('X-RateLimit-Reset', userData?.resetTime ? Math.ceil(userData.resetTime / 1000).toString() : '');

      next();
    } catch (error) {
      logger.error('Rate limiting error', { 
        error: error.message,
        userId: req.user?.userId,
        path: req.path,
        ip: req.ip
      });
      next();
    }
  };
};

/**
 * Validate refresh token
 */
export const validateRefreshToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ApiError(400, 'Refresh token is required');
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!, (err: any, decoded: any) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          logger.warn('Refresh token expired', { 
            path: req.path, 
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });
          throw new ApiError(401, 'Refresh token expired');
        }
        logger.warn('Invalid refresh token', { 
          error: err.message,
          path: req.path, 
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        throw new ApiError(401, 'Invalid refresh token');
      }

      // Add decoded token info to request for controller use
      (req as any).refreshTokenData = decoded;

      logger.info('Refresh token validated', {
        userId: decoded.userId,
        path: req.path,
        ip: req.ip
      });

      next();
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        error: 'Token validation failed'
      });
      return;
    }
    logger.error('Refresh token validation error', { 
      error: error.message,
      path: req.path,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error during token validation',
      error: 'Token validation failed'
    });
  }
};

/**
 * Log authentication attempts
 */
export const logAuthAttempt = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function(data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    logger.info('Authentication attempt logged', {
      method: req.method,
      path: req.path,
      statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId,
      success: statusCode < 400
    });

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
  
  next();
};