/**
 * JWT Service
 * Professional JWT token management with security best practices
 */

import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { logger } from '../utils/logger';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export class JWTService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET!;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET!;
    this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(payload: TokenPayload): Promise<Tokens> {
    try {
      const accessToken = jwt.sign(
        {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          type: 'access',
        },
        this.accessTokenSecret,
        {
          expiresIn: this.accessTokenExpiry,
          issuer: 'ultramarket-auth',
          audience: 'ultramarket-api',
        }
      );

      const refreshToken = jwt.sign(
        {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          type: 'refresh',
          jti: randomBytes(16).toString('hex'), // Unique token ID
        },
        this.refreshTokenSecret,
        {
          expiresIn: this.refreshTokenExpiry,
          issuer: 'ultramarket-auth',
          audience: 'ultramarket-api',
        }
      );

      logger.debug('Tokens generated successfully', {
        userId: payload.userId,
        email: payload.email,
      });

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Token generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: payload.userId,
      });
      throw new Error('Failed to generate tokens');
    }
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as any;

      if (decoded.type !== 'access') {
        return null;
      }

      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
    } catch (error) {
      logger.debug('Access token verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret) as any;

      if (decoded.type !== 'refresh') {
        return null;
      }

      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
    } catch (error) {
      logger.debug('Refresh token verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Generate password reset token
   */
  async generateResetToken(userId: string): Promise<string> {
    try {
      const token = jwt.sign(
        {
          userId,
          type: 'password_reset',
          jti: randomBytes(16).toString('hex'),
        },
        this.accessTokenSecret,
        {
          expiresIn: '1h',
          issuer: 'ultramarket-auth',
          audience: 'ultramarket-api',
        }
      );

      logger.debug('Password reset token generated', { userId });
      return token;
    } catch (error) {
      logger.error('Password reset token generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw new Error('Failed to generate reset token');
    }
  }

  /**
   * Generate email verification token
   */
  async generateVerificationToken(userId: string): Promise<string> {
    try {
      const token = jwt.sign(
        {
          userId,
          type: 'email_verification',
          jti: randomBytes(16).toString('hex'),
        },
        this.accessTokenSecret,
        {
          expiresIn: '24h',
          issuer: 'ultramarket-auth',
          audience: 'ultramarket-api',
        }
      );

      logger.debug('Email verification token generated', { userId });
      return token;
    } catch (error) {
      logger.error('Email verification token generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw new Error('Failed to generate verification token');
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return true;
    return expiration < new Date();
  }
}
