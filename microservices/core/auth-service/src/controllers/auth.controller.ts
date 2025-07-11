/**
 * Authentication Controller
 * Professional JWT-based authentication with RBAC
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { logger } from '@ultramarket/shared/logging/logger';
import { 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError 
} from '@ultramarket/shared/errors';
import { 
  validateLoginInput, 
  validateRegistrationInput,
  validatePasswordResetInput 
} from '../validators/auth.validator';
import { 
  generateAccessToken, 
  generateRefreshToken,
  verifyToken,
  decodeToken 
} from '../services/jwt.service';
import { 
  createUser, 
  findUserByEmail, 
  findUserById,
  updateUserLastLogin,
  createRefreshToken,
  deleteRefreshToken,
  validateRefreshToken 
} from '../services/user.service';
import { 
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEmailVerification 
} from '../services/email.service';
import { rateLimiter } from '../middleware/rate-limiter';
import { auditLog } from '../services/audit.service';

const prisma = new PrismaClient();

export class AuthController {
  /**
   * User Registration
   * POST /api/v1/auth/register
   */
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      // Rate limiting
      await rateLimiter.checkLimit(req, 'register', 5, 3600000); // 5 attempts per hour

      // Validate input
      const { error, value } = validateRegistrationInput(req.body);
      if (error) {
        throw new ValidationError('Invalid registration data', error.details);
      }

      const { email, password, firstName, lastName, phone } = value;

      // Check if user already exists
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        throw new AuthenticationError('User with this email already exists');
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: 'CUSTOMER',
        isEmailVerified: false,
        isPhoneVerified: false,
        status: 'ACTIVE'
      });

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Save refresh token
      await createRefreshToken(user.id, refreshToken);

      // Update last login
      await updateUserLastLogin(user.id);

      // Send welcome email
      await sendWelcomeEmail(user.email, user.firstName);

      // Send email verification
      await sendEmailVerification(user.email, user.id);

      // Audit log
      await auditLog('USER_REGISTRATION', {
        userId: user.id,
        email: user.email,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        operation: 'user_registration'
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            createdAt: user.createdAt
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN || '3600')
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * User Login
   * POST /api/v1/auth/login
   */
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      // Rate limiting
      await rateLimiter.checkLimit(req, 'login', 10, 900000); // 10 attempts per 15 minutes

      // Validate input
      const { error, value } = validateLoginInput(req.body);
      if (error) {
        throw new ValidationError('Invalid login data', error.details);
      }

      const { email, password } = value;

      // Find user
      const user = await findUserByEmail(email);
      if (!user) {
        throw new AuthenticationError('Invalid credentials');
      }

      // Check if user is active
      if (user.status !== 'ACTIVE') {
        throw new AuthenticationError('Account is not active');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new AuthenticationError('Invalid credentials');
      }

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Save refresh token
      await createRefreshToken(user.id, refreshToken);

      // Update last login
      await updateUserLastLogin(user.id);

      // Audit log
      await auditLog('USER_LOGIN', {
        userId: user.id,
        email: user.email,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        operation: 'user_login'
      });

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
            isEmailVerified: user.isEmailVerified,
            lastLoginAt: user.lastLoginAt
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN || '3600')
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh Token
   * POST /api/v1/auth/refresh
   */
  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
      }

      // Verify refresh token
      const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET!);
      if (!decoded) {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Check if refresh token exists in database
      const tokenExists = await validateRefreshToken(refreshToken);
      if (!tokenExists) {
        throw new AuthenticationError('Refresh token not found');
      }

      // Get user
      const user = await findUserById(decoded.userId);
      if (!user || user.status !== 'ACTIVE') {
        throw new AuthenticationError('User not found or inactive');
      }

      // Generate new tokens
      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      // Update refresh token in database
      await deleteRefreshToken(refreshToken);
      await createRefreshToken(user.id, newRefreshToken);

      logger.info('Token refreshed successfully', {
        userId: user.id,
        operation: 'token_refresh'
      });

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN || '3600')
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout
   * POST /api/v1/auth/logout
   */
  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Delete refresh token from database
        await deleteRefreshToken(refreshToken);
      }

      // Get user from token if available
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const decoded = decodeToken(token);
          if (decoded) {
            await auditLog('USER_LOGOUT', {
              userId: decoded.userId,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            });
          }
        } catch (error) {
          // Token might be expired, continue with logout
        }
      }

      logger.info('User logged out successfully', {
        operation: 'user_logout'
      });

      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get User Profile
   * GET /api/v1/auth/profile
   */
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new AuthenticationError('User not authenticated');
      }

      const user = await findUserById(userId);
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified,
            status: user.status,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Update User Profile
   * PUT /api/v1/auth/profile
   */
  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new AuthenticationError('User not authenticated');
      }

      const { firstName, lastName, phone } = req.body;

      // Update user profile
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          phone: phone || undefined,
          updatedAt: new Date()
        }
      });

      logger.info('User profile updated', {
        userId,
        operation: 'profile_update'
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            phone: updatedUser.phone,
            role: updatedUser.role,
            isEmailVerified: updatedUser.isEmailVerified,
            isPhoneVerified: updatedUser.isPhoneVerified,
            status: updatedUser.status,
            lastLoginAt: updatedUser.lastLoginAt,
            createdAt: updatedUser.createdAt,
            updatedAt: updatedUser.updatedAt
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Change Password
   * PUT /api/v1/auth/change-password
   */
  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new AuthenticationError('User not authenticated');
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new ValidationError('Current password and new password are required');
      }

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new AuthenticationError('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new AuthenticationError('Current password is incorrect');
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedNewPassword,
          updatedAt: new Date()
        }
      });

      // Invalidate all refresh tokens
      await prisma.refreshToken.deleteMany({
        where: { userId }
      });

      logger.info('Password changed successfully', {
        userId,
        operation: 'password_change'
      });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Request Password Reset
   * POST /api/v1/auth/forgot-password
   */
  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      // Rate limiting
      await rateLimiter.checkLimit(req, 'forgot-password', 3, 3600000); // 3 attempts per hour

      const { error, value } = validatePasswordResetInput(req.body);
      if (error) {
        throw new ValidationError('Invalid email', error.details);
      }

      const { email } = value;

      const user = await findUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not for security
        res.status(200).json({
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent'
        });
        return;
      }

      // Generate password reset token
      const resetToken = jwt.sign(
        { userId: user.id, type: 'password_reset' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      // Save reset token
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt: new Date(Date.now() + 3600000) // 1 hour
        }
      });

      // Send password reset email
      await sendPasswordResetEmail(user.email, resetToken);

      logger.info('Password reset requested', {
        userId: user.id,
        email: user.email,
        operation: 'password_reset_request'
      });

      res.status(200).json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset Password
   * POST /api/v1/auth/reset-password
   */
  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        throw new ValidationError('Token and new password are required');
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      if (!decoded || decoded.type !== 'password_reset') {
        throw new AuthenticationError('Invalid or expired reset token');
      }

      // Check if reset token exists and is not expired
      const resetRecord = await prisma.passwordReset.findFirst({
        where: {
          token,
          expiresAt: { gt: new Date() }
        }
      });

      if (!resetRecord) {
        throw new AuthenticationError('Invalid or expired reset token');
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: resetRecord.userId },
        data: {
          password: hashedPassword,
          updatedAt: new Date()
        }
      });

      // Delete reset token
      await prisma.passwordReset.delete({
        where: { id: resetRecord.id }
      });

      // Invalidate all refresh tokens
      await prisma.refreshToken.deleteMany({
        where: { userId: resetRecord.userId }
      });

      logger.info('Password reset successfully', {
        userId: resetRecord.userId,
        operation: 'password_reset'
      });

      res.status(200).json({
        success: true,
        message: 'Password reset successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify Email
   * GET /api/v1/auth/verify-email/:token
   */
  static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;

      if (!token) {
        throw new ValidationError('Verification token is required');
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      if (!decoded || decoded.type !== 'email_verification') {
        throw new AuthenticationError('Invalid or expired verification token');
      }

      // Update user email verification status
      await prisma.user.update({
        where: { id: decoded.userId },
        data: {
          isEmailVerified: true,
          updatedAt: new Date()
        }
      });

      logger.info('Email verified successfully', {
        userId: decoded.userId,
        operation: 'email_verification'
      });

      res.status(200).json({
        success: true,
        message: 'Email verified successfully'
      });

    } catch (error) {
      next(error);
    }
  }
}