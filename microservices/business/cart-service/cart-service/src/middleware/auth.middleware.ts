import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { logger } from '../utils/logger';

interface JWTPayload {
  id: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  sessionId?: string;
}

/**
 * Middleware to authenticate users via JWT token
 */
export const authenticateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header or cookie
    let token: string | undefined;
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    // For cart operations, allow guest access with session ID
    const sessionId = req.headers['x-session-id'] as string || req.cookies.sessionId;
    
    if (!token && !sessionId) {
      logger.warn('Authentication failed: No token or session ID provided', {
        url: req.url,
        method: req.method,
        ip: req.ip,
      });

      throw new AuthenticationError('Authentication token or session ID required');
    }

    // If we have a token, verify it
    if (token) {
      try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          throw new Error('JWT_SECRET not configured');
        }

        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
        
        // Attach user info to request
        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
        };

        logger.debug('User authenticated successfully', {
          userId: decoded.id,
          email: decoded.email,
          role: decoded.role,
          url: req.url,
          method: req.method,
        });
      } catch (jwtError) {
        logger.warn('JWT verification failed', {
          error: jwtError instanceof Error ? jwtError.message : 'Unknown error',
          url: req.url,
          method: req.method,
          ip: req.ip,
        });

        // If JWT fails but we have session ID, allow guest access
        if (sessionId) {
          req.sessionId = sessionId;
          logger.debug('Guest access granted with session ID', {
            sessionId,
            url: req.url,
            method: req.method,
          });
        } else {
          throw new AuthenticationError('Invalid or expired authentication token');
        }
      }
    } else if (sessionId) {
      // Guest access with session ID only
      req.sessionId = sessionId;
      logger.debug('Guest access granted with session ID', {
        sessionId,
        url: req.url,
        method: req.method,
      });
    }

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    } else {
      logger.error('Authentication middleware error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication failed',
        },
      });
    }
  }
};

/**
 * Middleware to require user authentication (no guest access)
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // First run the regular authentication
    await new Promise<void>((resolve, reject) => {
      authenticateUser(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Check if user is actually authenticated (not just guest)
    if (!req.user) {
      throw new AuthenticationError('User authentication required');
    }

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    } else {
      logger.error('Require auth middleware error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication failed',
        },
      });
    }
  }
};

/**
 * Middleware to check user roles
 */
export const requireRole = (allowedRoles: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Authorization failed: Insufficient permissions', {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          url: req.url,
          method: req.method,
        });

        throw new AuthorizationError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
      }

      logger.debug('Authorization successful', {
        userId: req.user.id,
        userRole: req.user.role,
        url: req.url,
        method: req.method,
      });

      next();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        res.status(401).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      } else if (error instanceof AuthorizationError) {
        res.status(403).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      } else {
        logger.error('Role check middleware error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: 'Authorization failed',
          },
        });
      }
    }
  };
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Middleware to require admin or moderator role
 */
export const requireAdminOrModerator = requireRole(['admin', 'moderator']);

/**
 * Middleware to validate API key for service-to-service communication
 */
export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    const validApiKey = process.env.INTERNAL_API_KEY;

    if (!apiKey) {
      logger.warn('API key missing', {
        url: req.url,
        method: req.method,
        ip: req.ip,
      });

      res.status(401).json({
        success: false,
        error: {
          code: 'API_KEY_MISSING',
          message: 'API key required for this endpoint',
        },
      });
      return;
    }

    if (!validApiKey) {
      logger.error('INTERNAL_API_KEY not configured');
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_CONFIGURATION_ERROR',
          message: 'Server configuration error',
        },
      });
      return;
    }

    if (apiKey !== validApiKey) {
      logger.warn('Invalid API key', {
        url: req.url,
        method: req.method,
        ip: req.ip,
      });

      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key',
        },
      });
      return;
    }

    logger.debug('API key validated successfully', {
      url: req.url,
      method: req.method,
    });

    next();
  } catch (error) {
    logger.error('API key validation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'API_KEY_VALIDATION_ERROR',
        message: 'API key validation failed',
      },
    });
  }
};

/**
 * Middleware to extract user information from token without requiring authentication
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      try {
        const jwtSecret = process.env.JWT_SECRET;
        if (jwtSecret) {
          const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
          req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
          };
        }
      } catch (jwtError) {
        // Ignore JWT errors for optional auth
        logger.debug('Optional auth: JWT verification failed', {
          error: jwtError instanceof Error ? jwtError.message : 'Unknown error',
        });
      }
    }

    // Always set session ID if available
    const sessionId = req.headers['x-session-id'] as string || req.cookies.sessionId;
    if (sessionId) {
      req.sessionId = sessionId;
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    // Don't fail on optional auth errors
    next();
  }
};