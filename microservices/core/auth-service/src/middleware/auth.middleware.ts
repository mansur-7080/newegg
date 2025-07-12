/**
 * Authentication Middleware
 * Professional JWT verification and role-based access control
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { AuthError } from './errorHandler';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError('Access token is required');
    }

    const token = authHeader.substring(7);

    if (!token) {
      throw new AuthError('Access token is required');
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      throw new AuthError('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new AuthError('User account is not active');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      url: req.url,
      method: req.method,
      ip: req.ip,
    });

    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AuthError('Invalid token'));
    }

    if (error instanceof jwt.TokenExpiredError) {
      return next(new AuthError('Token expired'));
    }

    next(error);
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AuthError('Insufficient permissions'));
    }

    next();
  };
};

export const requireAdmin = requireRole(['ADMIN']);
export const requireCustomer = requireRole(['CUSTOMER']);
export const requireVendor = requireRole(['VENDOR']);
