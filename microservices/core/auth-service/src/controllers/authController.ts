import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { 
  hashPassword, 
  comparePassword, 
  generateTokens, 
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader 
} from '@ultramarket/shared/auth';
import { logger } from '@ultramarket/shared/logging/logger';
import { prisma } from '@ultramarket/shared/database';
import { 
  BadRequestError, 
  UnauthorizedError, 
  NotFoundError,
  ValidationError 
} from '@ultramarket/shared/errors';
import { UserRole } from '@ultramarket/shared/types';

export class AuthController {
  // Register new user
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Invalid input data', errors.array());
      }

      const { email, password, firstName, lastName, phone, role = UserRole.CUSTOMER } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new BadRequestError('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role,
          isActive: true,
          emailVerified: false,
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
          updatedAt: true,
        }
      });

      // Generate tokens
      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Store refresh token
      await prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        }
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
          user,
          tokens
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Login user
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Invalid input data', errors.array());
      }

      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          refreshTokens: {
            where: {
              expiresAt: {
                gt: new Date()
              }
            }
          }
        }
      });

      if (!user) {
        throw new UnauthorizedError('Invalid credentials');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('Account is deactivated');
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid credentials');
      }

      // Generate tokens
      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Store refresh token
      await prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        }
      });

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
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
            phone: user.phone,
            role: user.role,
            isActive: user.isActive,
            emailVerified: user.emailVerified,
          },
          tokens
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Refresh access token
  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new BadRequestError('Refresh token is required');
      }

      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);

      // Check if token exists in database
      const storedToken = await prisma.refreshToken.findFirst({
        where: {
          token: refreshToken,
          userId: payload.userId,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      if (!storedToken) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: payload.userId }
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedError('User not found or inactive');
      }

      // Generate new tokens
      const newTokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Update refresh token
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          token: newTokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        }
      });

      logger.info('Token refreshed successfully', {
        userId: user.id,
        operation: 'token_refresh'
      });

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens: newTokens
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Logout user
  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Invalidate refresh token
        await prisma.refreshToken.deleteMany({
          where: { token: refreshToken }
        });
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

  // Get user profile
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const token = extractTokenFromHeader(req.headers.authorization);
      const payload = verifyAccessToken(token);

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        }
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      res.status(200).json({
        success: true,
        data: { user }
      });

    } catch (error) {
      next(error);
    }
  }

  // Update user profile
  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Invalid input data', errors.array());
      }

      const token = extractTokenFromHeader(req.headers.authorization);
      const payload = verifyAccessToken(token);

      const { firstName, lastName, phone } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: payload.userId },
        data: {
          firstName,
          lastName,
          phone,
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
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        }
      });

      logger.info('User profile updated successfully', {
        userId: updatedUser.id,
        operation: 'profile_update'
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: updatedUser }
      });

    } catch (error) {
      next(error);
    }
  }

  // Change password
  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Invalid input data', errors.array());
      }

      const token = extractTokenFromHeader(req.headers.authorization);
      const payload = verifyAccessToken(token);

      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: payload.userId }
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new UnauthorizedError('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: payload.userId },
        data: { password: hashedNewPassword }
      });

      // Invalidate all refresh tokens
      await prisma.refreshToken.deleteMany({
        where: { userId: payload.userId }
      });

      logger.info('Password changed successfully', {
        userId: user.id,
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

  // Verify email
  static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;

      // Find user by verification token
      const user = await prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerified: false
        }
      });

      if (!user) {
        throw new NotFoundError('Invalid verification token');
      }

      // Update user
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
        }
      });

      logger.info('Email verified successfully', {
        userId: user.id,
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

  // Forgot password
  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Invalid input data', errors.array());
      }

      const { email } = req.body;

      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (user) {
        // Generate reset token
        const resetToken = Math.random().toString(36).substring(2, 15) + 
                          Math.random().toString(36).substring(2, 15);

        // Store reset token
        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordResetToken: resetToken,
            passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          }
        });

        // TODO: Send email with reset link
        logger.info('Password reset token generated', {
          userId: user.id,
          operation: 'password_reset_request'
        });
      }

      // Always return success to prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });

    } catch (error) {
      next(error);
    }
  }

  // Reset password
  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Invalid input data', errors.array());
      }

      const { token, newPassword } = req.body;

      // Find user by reset token
      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpires: {
            gt: new Date()
          }
        }
      });

      if (!user) {
        throw new NotFoundError('Invalid or expired reset token');
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
        }
      });

      // Invalidate all refresh tokens
      await prisma.refreshToken.deleteMany({
        where: { userId: user.id }
      });

      logger.info('Password reset successfully', {
        userId: user.id,
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
}

// Validation middleware
export const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('phone').optional().isMobilePhone(),
  body('role').optional().isIn(Object.values(UserRole)),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

export const refreshTokenValidation = [
  body('refreshToken').notEmpty(),
];

export const logoutValidation = [
  body('refreshToken').optional(),
];

export const updateProfileValidation = [
  body('firstName').optional().trim(),
  body('lastName').optional().trim(),
  body('phone').optional().isMobilePhone(),
];

export const changePasswordValidation = [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

export const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail(),
];

export const resetPasswordValidation = [
  body('token').notEmpty(),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];