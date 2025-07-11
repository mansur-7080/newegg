import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { logger } from '@ultramarket/shared/logging/logger';
import { ApiError } from '@ultramarket/shared/errors/ApiError';

const prisma = new PrismaClient();

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new ApiError(401, 'Access token is required');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      throw new ApiError(401, 'User not found or inactive');
    }

    // Attach user to request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid JWT token', { error: error.message });
      throw new ApiError(401, 'Invalid or expired token');
    }
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Authentication error', { error: error.message });
    throw new ApiError(500, 'Authentication error');
  }
};

/**
 * Middleware to check if user has required role
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Insufficient permissions', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: roles
      });
      throw new ApiError(403, 'Insufficient permissions');
    }

    next();
  };
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  requireRole(['ADMIN'])(req, res, next);
};

/**
 * Middleware to check if user is customer
 */
export const requireCustomer = (req: Request, res: Response, next: NextFunction): void => {
  requireRole(['CUSTOMER', 'ADMIN'])(req, res, next);
};

/**
 * Optional authentication middleware
 * Doesn't throw error if no token provided
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // Continue without authentication
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (user && user.isActive) {
      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role
      };
    }

    next();
  } catch (error) {
    // Log error but don't throw - this is optional auth
    logger.warn('Optional authentication failed', { error: error.message });
    next();
  }
};

/**
 * Middleware to rate limit authentication attempts
 */
export const authRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  // This would typically use Redis to track attempts
  // For now, we'll just pass through
  next();
};

/**
 * Middleware to validate refresh token
 */
export const validateRefreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ApiError(400, 'Refresh token is required');
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;

    // Check if token exists and is not revoked
    const tokenRecord = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: decoded.userId,
        isRevoked: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!tokenRecord) {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      throw new ApiError(401, 'User not found or inactive');
    }

    // Attach user to request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(401, 'Invalid refresh token');
    }
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Refresh token validation error', { error: error.message });
    throw new ApiError(500, 'Token validation error');
  }
};