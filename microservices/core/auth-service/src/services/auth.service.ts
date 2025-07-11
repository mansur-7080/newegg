/**
 * UltraMarket Auth Service - Authentication Service
 * Professional authentication business logic
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { logger } from '@ultramarket/shared/logging/logger';
import { ApiError } from '@ultramarket/shared/errors/api-error';

const prisma = new PrismaClient();

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<User> {
    try {
      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: 'USER',
          isActive: true,
          isEmailVerified: false,
        },
      });

      // Create user profile
      await prisma.userProfile.create({
        data: {
          userId: user.id,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
        },
      });

      // Send verification email
      await this.sendVerificationEmail(user.email, user.id);

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        operation: 'user_registration',
      });

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      logger.error('User registration failed', {
        error: error.message,
        email: data.email,
        operation: 'user_registration',
      });
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, newPassword: string): Promise<void> {
    try {
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      });

      logger.info('Password changed successfully', {
        userId,
        operation: 'change_password',
      });
    } catch (error) {
      logger.error('Password change failed', {
        error: error.message,
        userId,
        operation: 'change_password',
      });
      throw error;
    }
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(userId: string): Promise<string> {
    try {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Store reset token
      await prisma.passwordResetToken.create({
        data: {
          userId,
          token: hashedToken,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      return resetToken;
    } catch (error) {
      logger.error('Password reset token generation failed', {
        error: error.message,
        userId,
        operation: 'generate_password_reset_token',
      });
      throw error;
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Find valid reset token
      const resetToken = await prisma.passwordResetToken.findFirst({
        where: {
          token: hashedToken,
          expiresAt: {
            gt: new Date(),
          },
          isUsed: false,
        },
        include: {
          user: true,
        },
      });

      if (!resetToken) {
        throw new ApiError(400, 'Invalid or expired reset token');
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update user password
      await prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      });

      // Mark token as used
      await prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: {
          isUsed: true,
        },
      });

      logger.info('Password reset successfully', {
        userId: resetToken.userId,
        operation: 'reset_password',
      });
    } catch (error) {
      logger.error('Password reset failed', {
        error: error.message,
        operation: 'reset_password',
      });
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    try {
      // In a real implementation, this would send an email
      // For now, we'll just log it
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      logger.info('Password reset email sent', {
        email,
        resetUrl,
        operation: 'send_password_reset_email',
      });

      // TODO: Integrate with email service
      // await emailService.sendPasswordResetEmail(email, resetUrl);
    } catch (error) {
      logger.error('Failed to send password reset email', {
        error: error.message,
        email,
        operation: 'send_password_reset_email',
      });
      throw error;
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, userId: string): Promise<void> {
    try {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

      // Store verification token
      await prisma.emailVerificationToken.create({
        data: {
          userId,
          token: hashedToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

      logger.info('Verification email sent', {
        email,
        verificationUrl,
        operation: 'send_verification_email',
      });

      // TODO: Integrate with email service
      // await emailService.sendVerificationEmail(email, verificationUrl);
    } catch (error) {
      logger.error('Failed to send verification email', {
        error: error.message,
        email,
        operation: 'send_verification_email',
      });
      throw error;
    }
  }

  /**
   * Verify email using token
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Find valid verification token
      const verificationToken = await prisma.emailVerificationToken.findFirst({
        where: {
          token: hashedToken,
          expiresAt: {
            gt: new Date(),
          },
          isUsed: false,
        },
      });

      if (!verificationToken) {
        throw new ApiError(400, 'Invalid or expired verification token');
      }

      // Update user email verification status
      await prisma.user.update({
        where: { id: verificationToken.userId },
        data: {
          isEmailVerified: true,
          updatedAt: new Date(),
        },
      });

      // Mark token as used
      await prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: {
          isUsed: true,
        },
      });

      logger.info('Email verified successfully', {
        userId: verificationToken.userId,
        operation: 'verify_email',
      });
    } catch (error) {
      logger.error('Email verification failed', {
        error: error.message,
        operation: 'verify_email',
      });
      throw error;
    }
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<any> {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET is not configured');
      }

      const decoded = jwt.verify(token, secret) as any;
      return decoded;
    } catch (error) {
      logger.error('Token validation failed', {
        error: error.message,
        operation: 'validate_token',
      });
      throw new ApiError(401, 'Invalid token');
    }
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              permissions: true,
            },
          },
        },
      });

      if (!user) {
        return [];
      }

      return user.role.permissions.map((permission) => permission.name);
    } catch (error) {
      logger.error('Failed to get user permissions', {
        error: error.message,
        userId,
        operation: 'get_user_permissions',
      });
      return [];
    }
  }

  /**
   * Check if user has permission
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId);
      return permissions.includes(permission);
    } catch (error) {
      logger.error('Permission check failed', {
        error: error.message,
        userId,
        permission,
        operation: 'check_permission',
      });
      return false;
    }
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const now = new Date();

      // Clean up expired password reset tokens
      await prisma.passwordResetToken.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      });

      // Clean up expired email verification tokens
      await prisma.emailVerificationToken.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      });

      logger.info('Expired tokens cleaned up', {
        operation: 'cleanup_expired_tokens',
      });
    } catch (error) {
      logger.error('Failed to cleanup expired tokens', {
        error: error.message,
        operation: 'cleanup_expired_tokens',
      });
    }
  }
}