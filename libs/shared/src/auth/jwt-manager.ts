import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { logger } from '../logger';
import { getCache } from '../performance/caching';

// JWT configuration interface
export interface JWTConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  issuer: string;
  audience: string;
  algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
}

// Token payload interface
export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  sessionId: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Token pair interface
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: number;
  refreshTokenExpiry: number;
  tokenId: string;
}

// JWT Manager class with advanced security features
export class JWTManager {
  private config: JWTConfig;
  private cache: any;
  private tokenRotationInterval: number = 15 * 60 * 1000; // 15 minutes
  private maxTokensPerUser: number = 5;
  private suspiciousActivityThreshold: number = 10;

  constructor(config: JWTConfig) {
    this.config = config;
    this.cache = getCache();
    this.validateConfig();
  }

  private validateConfig(): void {
    const requiredFields = ['accessTokenSecret', 'refreshTokenSecret', 'issuer', 'audience'];
    for (const field of requiredFields) {
      if (!this.config[field as keyof JWTConfig]) {
        throw new Error(`JWT configuration missing required field: ${field}`);
      }
    }

    // Validate secret strength
    if (this.config.accessTokenSecret.length < 32) {
      throw new Error('JWT access token secret must be at least 32 characters long');
    }

    if (this.config.refreshTokenSecret.length < 32) {
      throw new Error('JWT refresh token secret must be at least 32 characters long');
    }
  }

  /**
   * Generate a new token pair with enhanced security
   */
  async generateTokenPair(
    payload: TokenPayload,
    options?: {
      rememberMe?: boolean;
      deviceFingerprint?: string;
      geoLocation?: { country: string; city: string };
    }
  ): Promise<TokenPair> {
    try {
      const tokenId = this.generateTokenId();
      const sessionId = payload.sessionId || this.generateSessionId();

      // Enhanced payload with security metadata
      const enhancedPayload = {
        ...payload,
        sessionId,
        tokenId,
        iat: Math.floor(Date.now() / 1000),
        jti: tokenId, // JWT ID for tracking
        deviceFingerprint: options?.deviceFingerprint,
        geoLocation: options?.geoLocation,
      };

      // Generate access token
      const accessTokenExpiry = options?.rememberMe
        ? Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // 30 days
        : Math.floor(Date.now() / 1000) + 15 * 60; // 15 minutes

      const accessToken = jwt.sign(
        { ...enhancedPayload, type: 'access' },
        this.config.accessTokenSecret,
        {
          expiresIn: this.config.accessTokenExpiry,
          issuer: this.config.issuer,
          audience: this.config.audience,
          algorithm: this.config.algorithm,
        } as jwt.SignOptions
      );

      // Generate refresh token
      const refreshTokenExpiry = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days

      const refreshToken = jwt.sign(
        { ...enhancedPayload, type: 'refresh' },
        this.config.refreshTokenSecret,
        {
          expiresIn: this.config.refreshTokenExpiry,
          issuer: this.config.issuer,
          audience: this.config.audience,
          algorithm: this.config.algorithm,
        } as jwt.SignOptions
      );

      const tokenPair: TokenPair = {
        accessToken,
        refreshToken,
        accessTokenExpiry,
        refreshTokenExpiry,
        tokenId,
      };

      // Store token metadata in cache
      await this.storeTokenMetadata(tokenId, {
        userId: payload.userId,
        sessionId,
        deviceId: payload.deviceId,
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        isActive: true,
      });

      // Enforce token limits per user
      await this.enforceTokenLimits(payload.userId);

      // Log token generation
      logger.info('JWT token pair generated', {
        userId: payload.userId,
        tokenId,
        sessionId,
        deviceId: payload.deviceId,
        ipAddress: payload.ipAddress,
      });

      return tokenPair;
    } catch (error) {
      logger.error('JWT token generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: payload.userId,
      });
      throw new Error('Token generation failed');
    }
  }

  /**
   * Verify and decode JWT token with security checks
   */
  async verifyToken(token: string, type: 'access' | 'refresh' = 'access'): Promise<TokenPayload> {
    try {
      const secret =
        type === 'access' ? this.config.accessTokenSecret : this.config.refreshTokenSecret;

      const decoded = jwt.verify(token, secret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: [this.config.algorithm],
      }) as any;

      // Verify token type
      if (decoded.type !== type) {
        throw new Error(`Invalid token type. Expected ${type}, got ${decoded.type}`);
      }

      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(decoded.jti);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      // Check token metadata
      const metadata = await this.getTokenMetadata(decoded.jti);
      if (!metadata || !metadata.isActive) {
        throw new Error('Token is inactive');
      }

      // Update last used timestamp
      await this.updateTokenLastUsed(decoded.jti);

      // Security checks
      await this.performSecurityChecks(decoded);

      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || [],
        sessionId: decoded.sessionId,
        deviceId: decoded.deviceId,
        ipAddress: decoded.ipAddress,
        userAgent: decoded.userAgent,
      };
    } catch (error) {
      logger.warn('JWT token verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        token: token.substring(0, 20) + '...',
      });
      throw new Error('Token verification failed');
    }
  }

  /**
   * Refresh token with rotation
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      const decoded = await this.verifyToken(refreshToken, 'refresh');

      // Blacklist old refresh token
      await this.blacklistToken(refreshToken);

      // Generate new token pair
      const newTokenPair = await this.generateTokenPair(decoded);

      logger.info('Token refreshed successfully', {
        userId: decoded.userId,
        oldTokenId: (jwt.decode(refreshToken) as any)?.jti,
        newTokenId: newTokenPair.tokenId,
      });

      return newTokenPair;
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Token refresh failed');
    }
  }

  /**
   * Revoke token (logout)
   */
  async revokeToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.jti) {
        await this.blacklistToken(decoded.jti);
        await this.deactivateTokenMetadata(decoded.jti);

        logger.info('Token revoked successfully', {
          tokenId: decoded.jti,
          userId: decoded.userId,
        });
      }
    } catch (error) {
      logger.error('Token revocation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      const userTokens = await this.getUserTokens(userId);

      for (const tokenId of userTokens) {
        await this.blacklistToken(tokenId);
        await this.deactivateTokenMetadata(tokenId);
      }

      logger.info('All user tokens revoked', {
        userId,
        tokenCount: userTokens.length,
      });
    } catch (error) {
      logger.error('Failed to revoke all user tokens', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
    }
  }

  /**
   * Check for suspicious activity
   */
  private async performSecurityChecks(decoded: any): Promise<void> {
    const userId = decoded.userId;
    const currentTime = Math.floor(Date.now() / 1000);

    // Check for token age
    if (currentTime - decoded.iat > 24 * 60 * 60) {
      // 24 hours
      logger.warn('Old token detected', {
        userId,
        tokenAge: currentTime - decoded.iat,
        tokenId: decoded.jti,
      });
    }

    // Check for unusual activity patterns
    const recentActivity = await this.getRecentActivity(userId);
    if (recentActivity.length > this.suspiciousActivityThreshold) {
      logger.warn('Suspicious activity detected', {
        userId,
        activityCount: recentActivity.length,
        tokenId: decoded.jti,
      });

      // Optionally trigger additional security measures
      await this.triggerSecurityAlert(userId, 'HIGH_ACTIVITY');
    }
  }

  /**
   * Generate cryptographically secure token ID
   */
  private generateTokenId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Store token metadata in cache
   */
  private async storeTokenMetadata(tokenId: string, metadata: any): Promise<void> {
    const key = `token:metadata:${tokenId}`;
    await this.cache.set(key, metadata, 7 * 24 * 60 * 60); // 7 days
  }

  /**
   * Get token metadata
   */
  private async getTokenMetadata(tokenId: string): Promise<any> {
    const key = `token:metadata:${tokenId}`;
    return await this.cache.get(key);
  }

  /**
   * Update token last used timestamp
   */
  private async updateTokenLastUsed(tokenId: string): Promise<void> {
    const metadata = await this.getTokenMetadata(tokenId);
    if (metadata) {
      metadata.lastUsed = new Date().toISOString();
      await this.storeTokenMetadata(tokenId, metadata);
    }
  }

  /**
   * Deactivate token metadata
   */
  private async deactivateTokenMetadata(tokenId: string): Promise<void> {
    const metadata = await this.getTokenMetadata(tokenId);
    if (metadata) {
      metadata.isActive = false;
      metadata.deactivatedAt = new Date().toISOString();
      await this.storeTokenMetadata(tokenId, metadata);
    }
  }

  /**
   * Blacklist token
   */
  private async blacklistToken(tokenId: string): Promise<void> {
    const key = `token:blacklist:${tokenId}`;
    await this.cache.set(key, true, 7 * 24 * 60 * 60); // 7 days
  }

  /**
   * Check if token is blacklisted
   */
  private async isTokenBlacklisted(tokenId: string): Promise<boolean> {
    const key = `token:blacklist:${tokenId}`;
    return await this.cache.exists(key);
  }

  /**
   * Get all active tokens for a user
   */
  private async getUserTokens(userId: string): Promise<string[]> {
    const key = `user:tokens:${userId}`;
    const tokens = await this.cache.get(key);
    return tokens || [];
  }

  /**
   * Enforce token limits per user
   */
  private async enforceTokenLimits(userId: string): Promise<void> {
    const userTokens = await this.getUserTokens(userId);

    if (userTokens.length >= this.maxTokensPerUser) {
      // Remove oldest tokens
      const tokensToRemove = userTokens.slice(0, userTokens.length - this.maxTokensPerUser + 1);

      for (const tokenId of tokensToRemove) {
        await this.blacklistToken(tokenId);
        await this.deactivateTokenMetadata(tokenId);
      }

      logger.info('Token limit enforced', {
        userId,
        removedTokens: tokensToRemove.length,
      });
    }
  }

  /**
   * Get recent activity for security monitoring
   */
  private async getRecentActivity(userId: string): Promise<any[]> {
    const key = `user:activity:${userId}`;
    const activity = await this.cache.get(key);
    return activity || [];
  }

  /**
   * Trigger security alert
   */
  private async triggerSecurityAlert(userId: string, alertType: string): Promise<void> {
    const alert = {
      userId,
      alertType,
      timestamp: new Date().toISOString(),
      severity: 'HIGH',
    };

    const key = `security:alert:${userId}:${Date.now()}`;
    await this.cache.set(key, alert, 24 * 60 * 60); // 24 hours

    logger.warn('Security alert triggered', alert);
  }

  /**
   * Get token statistics
   */
  async getTokenStatistics(): Promise<{
    activeTokens: number;
    blacklistedTokens: number;
    recentActivity: number;
  }> {
    // This would typically query your database or cache
    // For now, returning mock data
    return {
      activeTokens: 0,
      blacklistedTokens: 0,
      recentActivity: 0,
    };
  }

  /**
   * Cleanup expired tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      // This would typically run as a scheduled job
      logger.info('Token cleanup started');

      // Implementation would scan for expired tokens and remove them
      // For now, this is a placeholder

      logger.info('Token cleanup completed');
    } catch (error) {
      logger.error('Token cleanup failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// Export singleton instance
let jwtManager: JWTManager;

export function initializeJWTManager(config: JWTConfig): JWTManager {
  jwtManager = new JWTManager(config);
  return jwtManager;
}

export function getJWTManager(): JWTManager {
  if (!jwtManager) {
    throw new Error('JWT Manager not initialized. Call initializeJWTManager() first.');
  }
  return jwtManager;
}

// Token validation middleware
export function validateJWTToken(requiredPermissions?: string[]) {
  return async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Access token required',
          },
        });
      }

      const token = authHeader.substring(7);
      const payload = await jwtManager.verifyToken(token, 'access');

      // Check permissions if required
      if (requiredPermissions && requiredPermissions.length > 0) {
        const hasPermission = requiredPermissions.some((permission) =>
          payload.permissions.includes(permission)
        );

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'AUTHORIZATION_ERROR',
              message: 'Insufficient permissions',
            },
          });
        }
      }

      req.user = payload;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Invalid or expired token',
        },
      });
    }
  };
}
