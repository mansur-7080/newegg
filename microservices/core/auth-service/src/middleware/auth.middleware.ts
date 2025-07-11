import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@ultramarket/shared/auth/jwt-utils';
import { AppError } from '@ultramarket/shared/errors';
import { logger } from '@ultramarket/shared/logging/logger';

const prisma = new PrismaClient();

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        jti: string;
      };
    }
  }
}

/**
 * Authenticate JWT token middleware
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new AppError(401, 'Access token is required');
    }

    // Verify token
    const decoded = verifyToken(token);

    // Check if session is still active
    const session = await prisma.user_sessions.findFirst({
      where: {
        user_id: decoded.userId,
        token_jti: decoded.jti,
        is_active: true,
        expires_at: { gt: new Date() }
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            role: true,
            is_active: true
          }
        }
      }
    });

    if (!session || !session.users) {
      throw new AppError(401, 'Invalid or expired session');
    }

    if (!session.users.is_active) {
      throw new AppError(401, 'User account is deactivated');
    }

    // Attach user to request
    req.user = {
      id: session.users.id,
      email: session.users.email,
      role: session.users.role,
      jti: decoded.jti
    };

    logger.debug('Token authenticated successfully', { 
      userId: req.user.id, 
      email: req.user.email,
      role: req.user.role 
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (error instanceof AppError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid token',
        timestamp: new Date().toISOString()
      }
    });
  }
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // Continue without authentication
    }

    // Try to authenticate
    const decoded = verifyToken(token);

    const session = await prisma.user_sessions.findFirst({
      where: {
        user_id: decoded.userId,
        token_jti: decoded.jti,
        is_active: true,
        expires_at: { gt: new Date() }
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            role: true,
            is_active: true
          }
        }
      }
    });

    if (session && session.users && session.users.is_active) {
      req.user = {
        id: session.users.id,
        email: session.users.email,
        role: session.users.role,
        jti: decoded.jti
      };
    }

    next();
  } catch (error) {
    // Continue without authentication on error
    next();
  }
}

/**
 * Role-based authorization middleware
 */
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions',
          timestamp: new Date().toISOString()
        }
      });
    }

    next();
  };
}

/**
 * Admin authorization middleware
 */
export const requireAdmin = requireRole(['admin', 'super_admin']);

/**
 * Vendor authorization middleware
 */
export const requireVendor = requireRole(['vendor', 'admin', 'super_admin']);

/**
 * Customer authorization middleware
 */
export const requireCustomer = requireRole(['customer', 'vendor', 'admin', 'super_admin']);