/**
 * JWT Service
 * Professional JWT token management with security best practices
 */

import jwt from 'jsonwebtoken';
import { logger } from '@ultramarket/shared/logging/logger';

export interface JWTPayload {
  userId: string;
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate access token
 */
export function generateAccessToken(user: any): string {
  try {
    const payload: JWTPayload = {
      userId: user.id,
      id: user.id,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN || '3600'),
      issuer: 'ultramarket-auth-service',
      audience: 'ultramarket-users'
    });

    logger.debug('Access token generated', {
      userId: user.id,
      operation: 'token_generation'
    });

    return token;
  } catch (error) {
    logger.error('Failed to generate access token', {
      userId: user.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(user: any): string {
  try {
    const payload: RefreshTokenPayload = {
      userId: user.id,
      tokenId: generateTokenId()
    };

    const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '604800'),
      issuer: 'ultramarket-auth-service',
      audience: 'ultramarket-users'
    });

    logger.debug('Refresh token generated', {
      userId: user.id,
      operation: 'refresh_token_generation'
    });

    return token;
  } catch (error) {
    logger.error('Failed to generate refresh token', {
      userId: user.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
      issuer: 'ultramarket-auth-service',
      audience: 'ultramarket-users'
    }) as JWTPayload;

    logger.debug('Access token verified', {
      userId: decoded.userId,
      operation: 'token_verification'
    });

    return decoded;
  } catch (error) {
    logger.warn('Access token verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!, {
      issuer: 'ultramarket-auth-service',
      audience: 'ultramarket-users'
    }) as RefreshTokenPayload;

    logger.debug('Refresh token verified', {
      userId: decoded.userId,
      operation: 'refresh_token_verification'
    });

    return decoded;
  } catch (error) {
    logger.warn('Refresh token verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Verify token (generic)
 */
export function verifyToken(token: string, secret: string): any {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    logger.warn('Token verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Decode token without verification
 */
export function decodeToken(token: string): any {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.warn('Token decode failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Generate email verification token
 */
export function generateEmailVerificationToken(userId: string): string {
  try {
    const payload = {
      userId,
      type: 'email_verification'
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: '24h',
      issuer: 'ultramarket-auth-service',
      audience: 'ultramarket-users'
    });

    logger.debug('Email verification token generated', {
      userId,
      operation: 'email_verification_token_generation'
    });

    return token;
  } catch (error) {
    logger.error('Failed to generate email verification token', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Generate password reset token
 */
export function generatePasswordResetToken(userId: string): string {
  try {
    const payload = {
      userId,
      type: 'password_reset'
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: '1h',
      issuer: 'ultramarket-auth-service',
      audience: 'ultramarket-users'
    });

    logger.debug('Password reset token generated', {
      userId,
      operation: 'password_reset_token_generation'
    });

    return token;
  } catch (error) {
    logger.error('Failed to generate password reset token', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Generate token ID for refresh tokens
 */
function generateTokenId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch (error) {
    logger.warn('Failed to get token expiration', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp) {
      return Date.now() >= decoded.exp * 1000;
    }
    return true;
  } catch (error) {
    logger.warn('Failed to check token expiration', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return true;
  }
}