import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthenticationError, AuthorizationError } from './error.middleware';
import { logger } from '../../libs/shared/src/logger';
import env from '../config/environment';

const prisma = new PrismaClient();

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        isEmailVerified: boolean;
        permissions: string[];
      };
    }
  }
}

interface JWTPayload extends JwtPayload {
  userId: string;
  email: string;
  role: string;
  tokenType: 'access' | 'refresh';
}

// Extract token from request
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Also check cookies for web browser requests
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }
  
  return null;
};

// Verify JWT token
const verifyToken = (token: string, secret: string): Promise<JWTPayload> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded as JWTPayload);
      }
    });
  });
};

// Main authentication middleware
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token
    const token = extractToken(req);
    
    if (!token) {
      throw new AuthenticationError('Access token required');
    }

    // Verify token
    const decoded = await verifyToken(token, env.JWT_SECRET);
    
    // Check if token is access token
    if (decoded.tokenType !== 'access') {
      throw new AuthenticationError('Invalid token type');
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isEmailVerified: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Check if user is active
    if (!user.isActive || user.deletedAt) {
      throw new AuthenticationError('Account is deactivated');
    }

    // Check if email is verified for certain operations
    if (!user.isEmailVerified && req.path !== '/verify-email') {
      throw new AuthenticationError('Email verification required');
    }

    // Get user permissions based on role
    const permissions = await getUserPermissions(user.role);

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      permissions,
    };

    logger.debug('User authenticated:', {
      userId: user.id,
      email: user.email,
      role: user.role,
      route: req.path,
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed:', {
      error: error.message,
      route: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    
    next(error);
  }
};

// Optional authentication (user may or may not be authenticated)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (token) {
      const decoded = await verifyToken(token, env.JWT_SECRET);
      
      if (decoded.tokenType === 'access') {
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            role: true,
            isEmailVerified: true,
            isActive: true,
            deletedAt: true,
          },
        });

        if (user && user.isActive && !user.deletedAt) {
          const permissions = await getUserPermissions(user.role);
          
          req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            permissions,
          };
        }
      }
    }
    
    next();
  } catch (error) {
    // Ignore auth errors in optional auth
    next();
  }
};

// Role-based authorization
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new AuthorizationError(
        `Access denied. Required roles: ${roles.join(', ')}`
      );
    }

    next();
  };
};

// Permission-based authorization
export const requirePermission = (...permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const hasPermission = permissions.some(permission =>
      req.user!.permissions.includes(permission)
    );

    if (!hasPermission) {
      throw new AuthorizationError(
        `Access denied. Required permissions: ${permissions.join(', ')}`
      );
    }

    next();
  };
};

// Resource ownership authorization
export const requireOwnership = (resourceField: string = 'userId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Admin can access all resources
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      next();
      return;
    }

    const resourceId = req.params.id;
    if (!resourceId) {
      throw new AuthorizationError('Resource ID required');
    }

    try {
      // This is a generic example - implement specific logic for each resource
      const resource = await prisma.user.findUnique({
        where: { id: resourceId },
        select: { id: true, [resourceField]: true },
      });

      if (!resource) {
        throw new AuthorizationError('Resource not found');
      }

      if (resource[resourceField] !== req.user.id) {
        throw new AuthorizationError('Access denied. You can only access your own resources');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Email verification required
export const requireEmailVerification = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  if (!req.user.isEmailVerified) {
    throw new AuthenticationError('Email verification required');
  }

  next();
};

// Get user permissions based on role
async function getUserPermissions(role: string): Promise<string[]> {
  const rolePermissions: Record<string, string[]> = {
    SUPER_ADMIN: [
      'user:read', 'user:write', 'user:delete',
      'product:read', 'product:write', 'product:delete',
      'order:read', 'order:write', 'order:delete',
      'payment:read', 'payment:write', 'payment:delete',
      'admin:access', 'system:manage',
    ],
    ADMIN: [
      'user:read', 'user:write',
      'product:read', 'product:write', 'product:delete',
      'order:read', 'order:write',
      'payment:read', 'payment:write',
      'admin:access',
    ],
    MODERATOR: [
      'user:read',
      'product:read', 'product:write',
      'order:read',
      'payment:read',
    ],
    VENDOR: [
      'product:read', 'product:write',
      'order:read',
      'payment:read',
    ],
    USER: [
      'user:read-own', 'user:write-own',
      'product:read',
      'order:read-own', 'order:write-own',
      'payment:read-own',
    ],
  };

  return rolePermissions[role] || [];
}

// Rate limiting for authentication endpoints
export const authRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Implement Redis-based rate limiting for auth endpoints
  const key = `auth_rate_limit:${req.ip}`;
  // This would use Redis to track requests
  // For now, just pass through
  next();
};

export default authMiddleware;