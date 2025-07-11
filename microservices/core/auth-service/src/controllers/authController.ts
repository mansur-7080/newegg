import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { JWTManager, TokenPayload } from '@ultramarket/shared/auth/jwt-manager';
import { logger } from '@ultramarket/shared/logging/logger';
import { validateEmail, validatePassword } from '@ultramarket/shared/validation/validation';
import { EmailService } from '@ultramarket/shared/services/email';
import { RedisService } from '@ultramarket/shared/services/redis';

const prisma = new PrismaClient();
const jwtManager = new JWTManager({
  accessTokenSecret: process.env.JWT_SECRET!,
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET!,
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  issuer: 'ultramarket-auth',
  audience: 'ultramarket-users',
  algorithm: 'HS256',
});

const emailService = new EmailService();
const redisService = new RedisService();

export class AuthController {
  /**
   * User registration
   */
  async register(req: Request, res: Response) {
    try {
      const { email, password, firstName, lastName, username, phoneNumber } = req.body;

      // Validation
      if (!validateEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
        });
      }

      if (!validatePassword(password)) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long with uppercase, lowercase, number, and special character',
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email or username already exists',
        });
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          username,
          passwordHash,
          firstName,
          lastName,
          phoneNumber,
          role: 'CUSTOMER',
        },
      });

      // Generate verification token
      const verificationToken = await emailService.generateVerificationToken(email);

      // Send verification email
      await emailService.sendVerificationEmail(email, verificationToken, user.firstName);

      // Log registration
      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please check your email for verification.',
        data: {
          userId: user.id,
          email: user.email,
          username: user.username,
        },
      });
    } catch (error) {
      logger.error('Registration failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body,
      });
      res.status(500).json({
        success: false,
        message: 'Registration failed',
      });
    }
  }

  /**
   * User login
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password, rememberMe, deviceFingerprint } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated',
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        // Log failed login attempt
        await this.logLoginAttempt(email, req.ip, req.get('User-Agent'), false, 'Invalid password');
        
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Check for suspicious activity
      const recentAttempts = await this.getRecentLoginAttempts(email, req.ip);
      if (recentAttempts.failed >= 5) {
        return res.status(429).json({
          success: false,
          message: 'Too many failed login attempts. Please try again later.',
        });
      }

      // Generate tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        permissions: this.getPermissionsForRole(user.role),
        sessionId: this.generateSessionId(),
        deviceId: deviceFingerprint,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      };

      const tokenPair = await jwtManager.generateTokenPair(tokenPayload, {
        rememberMe,
        deviceFingerprint,
      });

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Log successful login
      await this.logLoginAttempt(email, req.ip, req.get('User-Agent'), true);

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
          },
          tokens: tokenPair,
        },
      });
    } catch (error) {
      logger.error('Login failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: req.body.email,
      });
      res.status(500).json({
        success: false,
        message: 'Login failed',
      });
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required',
        });
      }

      const tokenPair = await jwtManager.refreshToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: tokenPair,
      });
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }
  }

  /**
   * User logout
   */
  async logout(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (token) {
        await jwtManager.revokeToken(token);
      }

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Logout failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({
        success: false,
        message: 'Logout failed',
      });
    }
  }

  /**
   * Get user profile
   */
  async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          profileImage: true,
          bio: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Get profile failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get profile',
      });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const { firstName, lastName, phoneNumber, bio } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          firstName,
          lastName,
          phoneNumber,
          bio,
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          profileImage: true,
          bio: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      logger.error('Update profile failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
      });
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.params;

      const verification = await prisma.emailVerification.findUnique({
        where: { token },
      });

      if (!verification) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification token',
        });
      }

      if (verification.expiresAt < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Verification token has expired',
        });
      }

      // Update user email verification status
      await prisma.user.update({
        where: { email: verification.email },
        data: { isEmailVerified: true },
      });

      // Delete verification token
      await prisma.emailVerification.delete({
        where: { id: verification.id },
      });

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      logger.error('Email verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({
        success: false,
        message: 'Email verification failed',
      });
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Don't reveal if user exists or not
        return res.status(200).json({
          success: true,
          message: 'If the email exists, a password reset link has been sent',
        });
      }

      // Generate reset token
      const resetToken = await emailService.generatePasswordResetToken(email);

      // Send reset email
      await emailService.sendPasswordResetEmail(email, resetToken, user.firstName);

      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      });
    } catch (error) {
      logger.error('Password reset request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({
        success: false,
        message: 'Failed to process password reset request',
      });
    }
  }

  /**
   * Reset password
   */
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;

      if (!validatePassword(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long with uppercase, lowercase, number, and special character',
        });
      }

      const resetRecord = await prisma.passwordReset.findUnique({
        where: { token },
      });

      if (!resetRecord) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reset token',
        });
      }

      if (resetRecord.expiresAt < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Reset token has expired',
        });
      }

      if (resetRecord.used) {
        return res.status(400).json({
          success: false,
          message: 'Reset token has already been used',
        });
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update user password
      await prisma.user.update({
        where: { email: resetRecord.email },
        data: { passwordHash },
      });

      // Mark reset token as used
      await prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true },
      });

      // Revoke all user sessions
      await jwtManager.revokeAllUserTokens(resetRecord.email);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      logger.error('Password reset failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({
        success: false,
        message: 'Password reset failed',
      });
    }
  }

  // Helper methods
  private getPermissionsForRole(role: string): string[] {
    const permissions = {
      CUSTOMER: ['read:products', 'read:orders', 'write:cart', 'read:profile'],
      SELLER: ['read:products', 'write:products', 'read:orders', 'read:analytics'],
      ADMIN: ['read:products', 'write:products', 'read:orders', 'write:orders', 'read:users', 'write:users'],
      SUPER_ADMIN: ['*'],
    };
    return permissions[role as keyof typeof permissions] || [];
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async logLoginAttempt(
    email: string,
    ipAddress: string,
    userAgent: string | undefined,
    success: boolean,
    failureReason?: string
  ) {
    await prisma.loginAttempt.create({
      data: {
        email,
        ipAddress,
        userAgent,
        success,
        failureReason,
      },
    });
  }

  private async getRecentLoginAttempts(email: string, ipAddress: string) {
    const attempts = await prisma.loginAttempt.findMany({
      where: {
        OR: [{ email }, { ipAddress }],
        createdAt: {
          gte: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
        },
      },
    });

    return {
      total: attempts.length,
      failed: attempts.filter(a => !a.success).length,
      successful: attempts.filter(a => a.success).length,
    };
  }
}