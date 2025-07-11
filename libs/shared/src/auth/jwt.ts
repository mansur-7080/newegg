import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../logging/logger';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  type?: string;
}

export interface AuthenticatedRequest extends Request {
  user: JWTPayload;
}

/**
 * Validate JWT token middleware
 */
export const validateToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET not configured');
      res.status(500).json({
        success: false,
        message: 'Server configuration error',
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    
    // Add user info to request
    (req as AuthenticatedRequest).user = decoded;
    
    next();
  } catch (error) {
    logger.error('Token validation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Token validation error',
      });
    }
  }
};

/**
 * Generate access token
 */
export const generateAccessToken = (payload: Omit<JWTPayload, 'type'>): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (userId: string): string => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET not configured');
  }
  
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): { userId: string; type: string } => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET not configured');
  }
  
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET) as { userId: string; type: string };
};

/**
 * Role-based access control middleware
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
      return;
    }
    
    next();
  };
};

/**
 * Admin-only middleware
 */
export const requireAdmin = requireRole(['ADMIN', 'SUPER_ADMIN']);

/**
 * User or admin middleware
 */
export const requireUserOrAdmin = requireRole(['USER', 'ADMIN', 'SUPER_ADMIN']);