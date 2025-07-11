import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { logger } from '@ultramarket/shared/logging/logger';
import { ApiError } from '@ultramarket/shared/errors/ApiError';
import { validateRegistration, validateLogin, validatePasswordChange, validatePasswordReset } from '../validators/authValidator';
import { sendEmail } from '../services/emailService';
import { generateVerificationToken, generatePasswordResetToken } from '../utils/tokenUtils';

const prisma = new PrismaClient();

export class AuthController {
  /**
   * User registration endpoint
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const { error, value } = validateRegistration(req.body);
      if (error) {
        throw new ApiError(400, 'Validation error', error.details);
      }

      const { email, password, firstName, lastName, phone } = value;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true }
      });

      if (existingUser) {
        throw new ApiError(409, 'User with this email already exists');
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Generate email verification token
      const verificationToken = generateVerificationToken();

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role: 'CUSTOMER',
          isActive: true,
          emailVerified: false,
          verificationToken,
          verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true
        }
      });

      // Send verification email
      await sendEmail({
        to: email,
        subject: 'Welcome to UltraMarket - Verify Your Email',
        template: 'email-verification',
        data: {
          firstName,
          verificationToken,
          verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
        }
      });

      // Generate JWT tokens
      const accessToken = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      );

      const refreshToken = jwt.sign(
        { 
          userId: user.id, 
          tokenVersion: 0 
        },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );

      // Store refresh token
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          isRevoked: false
        }
      });

      logger.info('User registered successfully', { userId: user.id, email });

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please check your email to verify your account.',
        data: {
          user,
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: 15 * 60 // 15 minutes in seconds
          }
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Registration error', { error: error.message });
      throw new ApiError(500, 'Internal server error during registration');
    }
  }

  /**
   * User login endpoint
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const { error, value } = validateLogin(req.body);
      if (error) {
        throw new ApiError(400, 'Validation error', error.details);
      }

      const { email, password } = value;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          emailVerified: true
        }
      });

      if (!user) {
        throw new ApiError(401, 'Invalid email or password');
      }

      if (!user.isActive) {
        throw new ApiError(403, 'Account is deactivated');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid email or password');
      }

      // Generate JWT tokens
      const accessToken = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      );

      const refreshToken = jwt.sign(
        { 
          userId: user.id, 
          tokenVersion: 0 
        },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );

      // Store refresh token
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isRevoked: false
        }
      });

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      logger.info('User logged in successfully', { userId: user.id, email });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            emailVerified: user.emailVerified
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: 15 * 60 // 15 minutes in seconds
          }
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Login error', { error: error.message });
      throw new ApiError(500, 'Internal server error during login');
    }
  }

  /**
   * Refresh token endpoint
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ApiError(400, 'Refresh token is required');
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
      
      // Check if token exists and is not revoked
      const storedToken = await prisma.refreshToken.findFirst({
        where: {
          token: refreshToken,
          userId: decoded.userId,
          isRevoked: false,
          expiresAt: { gt: new Date() }
        }
      });

      if (!storedToken) {
        throw new ApiError(401, 'Invalid or expired refresh token');
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true
        }
      });

      if (!user || !user.isActive) {
        throw new ApiError(401, 'User not found or inactive');
      }

      // Generate new tokens
      const newAccessToken = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      );

      const newRefreshToken = jwt.sign(
        { 
          userId: user.id, 
          tokenVersion: decoded.tokenVersion + 1 
        },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );

      // Revoke old refresh token
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true }
      });

      // Store new refresh token
      await prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isRevoked: false
        }
      });

      logger.info('Token refreshed successfully', { userId: user.id });

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: 15 * 60
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new ApiError(401, 'Invalid refresh token');
      }
      logger.error('Token refresh error', { error: error.message });
      throw new ApiError(500, 'Internal server error during token refresh');
    }
  }

  /**
   * Logout endpoint
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const userId = (req as any).user?.userId;

      if (refreshToken) {
        // Revoke refresh token
        await prisma.refreshToken.updateMany({
          where: {
            token: refreshToken,
            userId: userId,
            isRevoked: false
          },
          data: { isRevoked: true }
        });
      }

      logger.info('User logged out successfully', { userId });

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Logout error', { error: error.message });
      throw new ApiError(500, 'Internal server error during logout');
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true
        }
      });

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      res.status(200).json({
        success: true,
        data: { user }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Get profile error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { firstName, lastName, phone } = req.body;

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          firstName,
          lastName,
          phone
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          emailVerified: true,
          updatedAt: true
        }
      });

      logger.info('Profile updated successfully', { userId });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user }
      });
    } catch (error) {
      logger.error('Update profile error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = validatePasswordChange(req.body);
      if (error) {
        throw new ApiError(400, 'Validation error', error.details);
      }

      const userId = (req as any).user?.userId;
      const { currentPassword, newPassword } = value;

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          password: true
        }
      });

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new ApiError(400, 'Current password is incorrect');
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword }
      });

      // Revoke all refresh tokens for this user
      await prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true }
      });

      logger.info('Password changed successfully', { userId });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully. Please login again.'
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Change password error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, firstName: true }
      });

      if (!user) {
        // Don't reveal if user exists or not
        res.status(200).json({
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent.'
        });
        return;
      }

      // Generate reset token
      const resetToken = generatePasswordResetToken();
      const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpires
        }
      });

      // Send reset email
      await sendEmail({
        to: email,
        subject: 'UltraMarket - Password Reset Request',
        template: 'password-reset',
        data: {
          firstName: user.firstName,
          resetToken,
          resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
        }
      });

      logger.info('Password reset requested', { userId: user.id, email });

      res.status(200).json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      });
    } catch (error) {
      logger.error('Password reset request error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = validatePasswordReset(req.body);
      if (error) {
        throw new ApiError(400, 'Validation error', error.details);
      }

      const { token, newPassword } = value;

      // Find user with valid reset token
      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpires: { gt: new Date() }
        }
      });

      if (!user) {
        throw new ApiError(400, 'Invalid or expired reset token');
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpires: null
        }
      });

      // Revoke all refresh tokens
      await prisma.refreshToken.updateMany({
        where: { userId: user.id },
        data: { isRevoked: true }
      });

      logger.info('Password reset successfully', { userId: user.id });

      res.status(200).json({
        success: true,
        message: 'Password reset successfully. Please login with your new password.'
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Password reset error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      const user = await prisma.user.findFirst({
        where: {
          verificationToken: token,
          verificationTokenExpires: { gt: new Date() },
          emailVerified: false
        }
      });

      if (!user) {
        throw new ApiError(400, 'Invalid or expired verification token');
      }

      // Verify email
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpires: null
        }
      });

      logger.info('Email verified successfully', { userId: user.id });

      res.status(200).json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Email verification error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Resend verification email
   */
  static async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, firstName: true, emailVerified: true }
      });

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      if (user.emailVerified) {
        throw new ApiError(400, 'Email is already verified');
      }

      // Generate new verification token
      const verificationToken = generateVerificationToken();

      // Update verification token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationToken,
          verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });

      // Send verification email
      await sendEmail({
        to: email,
        subject: 'UltraMarket - Verify Your Email',
        template: 'email-verification',
        data: {
          firstName: user.firstName,
          verificationToken,
          verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
        }
      });

      logger.info('Verification email resent', { userId: user.id });

      res.status(200).json({
        success: true,
        message: 'Verification email sent successfully'
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Resend verification error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }
}