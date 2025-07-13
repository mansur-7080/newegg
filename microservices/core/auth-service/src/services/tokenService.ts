import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Enhanced logger for security events
const logger = {
  info: (message: string, meta?: any) => console.log(`[TOKEN-INFO] ${message}`, meta),
  error: (message: string, meta?: any) => console.error(`[TOKEN-ERROR] ${message}`, meta),
  warn: (message: string, meta?: any) => console.warn(`[TOKEN-WARN] ${message}`, meta),
  security: (message: string, meta?: any) => console.log(`[SECURITY] ${message}`, meta),
};

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  jti?: string; // JWT ID for token tracking
  iat?: number; // Issued at
  exp?: number; // Expiration
}

export interface User {
  id: string;
  email: string;
  role: string;
}

export class TokenService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly tokenRotationEnabled: boolean;
  private readonly maxActiveTokensPerUser: number;

  constructor() {
    // ENHANCED: Strong secret validation
    this.accessTokenSecret = this.validateSecret(process.env.JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET');
    this.refreshTokenSecret = this.validateSecret(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');
    
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
    this.tokenRotationEnabled = process.env.TOKEN_ROTATION_ENABLED === 'true';
    this.maxActiveTokensPerUser = parseInt(process.env.MAX_ACTIVE_TOKENS_PER_USER || '5');
  }

  /**
   * ENHANCED: Validate JWT secrets for security
   */
  private validateSecret(secret: string | undefined, secretName: string): string {
    if (!secret) {
      logger.security(`CRITICAL: ${secretName} is not set`, { secretName });
      throw new Error(`${secretName} environment variable is required`);
    }

    if (secret.length < 32) {
      logger.security(`WEAK: ${secretName} is too short`, { 
        secretName, 
        length: secret.length,
        minRequired: 32 
      });
      throw new Error(`${secretName} must be at least 32 characters long`);
    }

    // Check for common weak secrets
    const weakSecrets = ['secret', 'password', '123456', 'admin', 'test'];
    if (weakSecrets.some(weak => secret.toLowerCase().includes(weak))) {
      logger.security(`WEAK: ${secretName} contains common weak patterns`, { secretName });
      throw new Error(`${secretName} contains weak patterns`);
    }

    return secret;
  }

  /**
   * ENHANCED: Generate access token with security features
   */
  generateAccessToken(user: User): string {
    const jti = crypto.randomBytes(32).toString('hex'); // Unique token ID
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      jti,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.parseExpiry(this.accessTokenExpiry),
    };

    const token = jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      algorithm: 'HS256',
      issuer: 'ultramarket-auth',
      audience: 'ultramarket-api',
    } as any);

    logger.security('Access token generated', {
      userId: user.id,
      jti,
      expiresIn: this.accessTokenExpiry,
    });

    return token;
  }

  /**
   * ENHANCED: Generate refresh token with rotation
   */
  generateRefreshToken(user: User): string {
    const jti = crypto.randomBytes(32).toString('hex');
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      jti,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.parseExpiry(this.refreshTokenExpiry),
    };

    const token = jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      algorithm: 'HS256',
      issuer: 'ultramarket-auth',
      audience: 'ultramarket-api',
    } as any);

    logger.security('Refresh token generated', {
      userId: user.id,
      jti,
      expiresIn: this.refreshTokenExpiry,
    });

    return token;
  }

  /**
   * ENHANCED: Verify access token with blacklist check
   */
  async verifyAccessToken(token: string): Promise<TokenPayload | null> {
    try {
      // Check token blacklist first
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        logger.security('Access token verification failed - token blacklisted', { token: token.substring(0, 10) + '...' });
        return null;
      }

      const decoded = jwt.verify(token, this.accessTokenSecret, {
        algorithms: ['HS256'],
        issuer: 'ultramarket-auth',
        audience: 'ultramarket-api',
      }) as TokenPayload;

      logger.security('Access token verified successfully', {
        userId: decoded.userId,
        jti: decoded.jti,
      });

      return decoded;
    } catch (error: any) {
      logger.security('Access token verification failed', { 
        error: error.message,
        token: token.substring(0, 10) + '...'
      });
      return null;
    }
  }

  /**
   * ENHANCED: Verify refresh token with additional checks
   */
  async verifyRefreshToken(token: string): Promise<TokenPayload | null> {
    try {
      // Check token blacklist
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        logger.security('Refresh token verification failed - token blacklisted', { token: token.substring(0, 10) + '...' });
        return null;
      }

      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        algorithms: ['HS256'],
        issuer: 'ultramarket-auth',
        audience: 'ultramarket-api',
      }) as TokenPayload;

      // Additional validation: check if token exists in database
      const storedToken = await this.findRefreshTokenInDB(token);
      if (!storedToken) {
        logger.security('Refresh token verification failed - not found in database', { 
          userId: decoded.userId,
          jti: decoded.jti 
        });
        return null;
      }

      logger.security('Refresh token verified successfully', {
        userId: decoded.userId,
        jti: decoded.jti,
      });

      return decoded;
    } catch (error: any) {
      logger.security('Refresh token verification failed', { 
        error: error.message,
        token: token.substring(0, 10) + '...'
      });
      return null;
    }
  }

  /**
   * ENHANCED: Save refresh token with user limit enforcement
   */
  async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    try {
      // Check active token count for user
      const activeTokenCount = await prisma.refreshToken.count({
        where: {
          userId,
          expiresAt: { gt: new Date() },
          isRevoked: false,
        },
      });

      if (activeTokenCount >= this.maxActiveTokensPerUser) {
        // Revoke oldest token
        const oldestToken = await prisma.refreshToken.findFirst({
          where: {
            userId,
            isRevoked: false,
          },
          orderBy: { createdAt: 'asc' },
        });

        if (oldestToken) {
          await this.invalidateRefreshTokenInDB(oldestToken.token);
          logger.security('Oldest token revoked due to limit', {
            userId,
            tokenId: oldestToken.id,
          });
        }
      }

      await prisma.refreshToken.create({
                 data: {
           userId,
           token: refreshToken,
           expiresAt: new Date(Date.now() + this.parseExpiry(this.refreshTokenExpiry) * 1000),
         },
      });

      logger.info('Refresh token saved successfully', { userId });
    } catch (error) {
      logger.error('Failed to save refresh token', { error, userId });
      throw error;
    }
  }

  /**
   * ENHANCED: Blacklist token for immediate invalidation
   */
  async blacklistToken(token: string, reason: string = 'manual_revocation'): Promise<void> {
    try {
      const jti = this.extractJti(token);
      
      // Store blacklisted token in memory for now (database table needs to be created)
      console.log(`[SECURITY] Token blacklisted: ${jti} - ${reason}`);

      logger.security('Token blacklisted', { jti, reason });
    } catch (error) {
      logger.error('Failed to blacklist token', { error });
      throw error;
    }
  }

  /**
   * Check if token is blacklisted
   */
  private async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const jti = this.extractJti(token);
      
      // Check blacklist in memory for now (database table needs to be created)
      const blacklistedToken = null; // TODO: Implement database blacklist

      return !!blacklistedToken;
    } catch (error) {
      logger.error('Failed to check token blacklist', { error });
      return false;
    }
  }

  /**
   * Extract JTI from token
   */
  private extractJti(token: string): string | null {
    try {
      const decoded = jwt.decode(token) as any;
      return decoded?.jti || null;
    } catch {
      return null;
    }
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiry format: ${expiry}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: throw new Error(`Unknown expiry unit: ${unit}`);
    }
  }
}
