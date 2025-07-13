import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './error.middleware';
import { logger } from '../utils/logger';
import { getPrismaClient } from '../config/database';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
  store?: {
    id: string;
    isOwner: boolean;
    role: string;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw createError('Access token is required', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as any;
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createError('Invalid access token', 401));
    } else {
      next(error);
    }
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(createError('Authentication required', 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(createError('Insufficient permissions', 403));
      return;
    }

    next();
  };
};

export const requireStoreOwner = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw createError('Authentication required', 401);
    }

    const storeId = req.params.storeId;
    if (!storeId) {
      throw createError('Store ID is required', 400);
    }

    // Check if user owns the store or is admin
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      next();
      return;
    }

    // Check store ownership from database
    try {
      const storeId = req.params.storeId || req.body.storeId;
      if (!storeId) {
        return res.status(400).json({
          success: false,
          error: 'Store ID is required',
        });
      }

             // Get database client
       const prisma = getPrismaClient();

      // Check if user owns the store or is store staff
      const store = await prisma.store.findFirst({
        where: {
          id: storeId,
          OR: [
            { ownerId: req.user!.id },
            {
              staff: {
                some: {
                  userId: req.user!.id,
                  isActive: true,
                },
              },
            },
          ],
        },
        include: {
          staff: {
            where: {
              userId: req.user!.id,
              isActive: true,
            },
          },
        },
      });

      if (!store) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: You do not have permission to access this store',
        });
      }

      // Add store info to request for later use
      req.store = {
        id: store.id,
        isOwner: store.ownerId === req.user!.id,
        role: store.ownerId === req.user!.id ? 'OWNER' : store.staff[0]?.role || 'VIEWER',
      };

      next();
    } catch (error) {
      logger.error('Store ownership check failed', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify store ownership',
      });
    }
  } catch (error) {
    next(error);
  }
};