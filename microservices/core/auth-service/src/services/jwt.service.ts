import jwt from 'jsonwebtoken';
import { logger } from '@ultramarket/shared/logging/logger';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface UserForToken {
  id: string;
  email: string;
  role: string;
}

/**
 * Generate access token
 */
export const generateAccessToken = (user: UserForToken): string => {
  try {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }

    const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN ?? '1h';

    const token = jwt.sign(payload, secret, {
      expiresIn,
      issuer: 'ultramarket-auth-service',
      audience: 'ultramarket-users'
    });

    logger.debug('Access token generated', {
      userId: user.id,
      expiresIn
    });

    return token;
  } catch (error) {
    logger.error('Error generating access token', {
      userId: user.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (user: UserForToken): string => {
  try {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }

    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

    const token = jwt.sign(payload, secret, {
      expiresIn,
      issuer: 'ultramarket-auth-service',
      audience: 'ultramarket-users'
    });

    logger.debug('Refresh token generated', {
      userId: user.id,
      expiresIn
    });

    return token;
  } catch (error) {
    logger.error('Error generating refresh token', {
      userId: user.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string, secret: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, secret, {
      issuer: 'ultramarket-auth-service',
      audience: 'ultramarket-users'
    }) as JWTPayload;

    logger.debug('Token verified successfully', {
      userId: decoded.userId,
      email: decoded.email
    });

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Token expired', {
        token: token.substring(0, 20) + '...'
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid token', {
        token: token.substring(0, 20) + '...',
        error: error.message
      });
    } else {
      logger.error('Token verification error', {
        token: token.substring(0, 20) + '...',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    return null;
  }
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): JWTPayload | null => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    logger.error('JWT_ACCESS_SECRET is not configured');
    return null;
  }
  return verifyToken(token, secret);
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): JWTPayload | null => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    logger.error('JWT_REFRESH_SECRET is not configured');
    return null;
  }
  return verifyToken(token, secret);
};

/**
 * Decode token without verification (for logging purposes only)
 */
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    return decoded;
  } catch (error) {
    logger.error('Error decoding token', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
};

/**
 * Get token expiration time
 */
export const getTokenExpiration = (token: string): Date | null => {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch (error) {
    logger.error('Error getting token expiration', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const expiration = getTokenExpiration(token);
  if (!expiration) {
    return true;
  }
  return expiration < new Date();
};