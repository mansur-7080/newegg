import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token is required',
        },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

    try {
      const decoded = jwt.verify(token, jwtSecret) as {
        userId: string;
        email: string;
        role: string;
      };

      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };

      next();
    } catch (jwtError) {
      logger.error('JWT verification failed', { error: jwtError instanceof Error ? jwtError.message : 'Unknown error' });
      
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
      });
    }
  } catch (error) {
    logger.error('Auth middleware error', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication service error',
      },
    });
  }
};