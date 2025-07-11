/**
 * UltraMarket Auth Service - Authentication Controller
 * Professional authentication and authorization endpoints
 */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { logger } from '@ultramarket/shared/logging/logger';
import { ApiError } from '@ultramarket/shared/errors/api-error';
import { validateRequest } from '@ultramarket/shared/validation/request-validator';
import { authSchemas } from '../schemas/auth.schemas';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { TokenService } from '../services/token.service';

const prisma = new PrismaClient();
const authService = new AuthService();
const userService = new UserService();
const tokenService = new TokenService();

export class AuthController {
  /**
   * User registration endpoint
   * POST /api/v1/auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { error, value } = validateRequest(req.body, authSchemas.register);
      if (error) {
        throw new ApiError(400, 'Validation error', error.details);
      }

      const { email, password, firstName, lastName, phone } = value;

      // Check if user already exists
      const existingUser = await userService.findByEmail(email);
      if (existingUser) {
        throw new ApiError(409, 'User already exists with this email');
      }

      // Create new user
      const user = await authService.register({
        email,
        password,
        firstName,
        lastName,
        phone,
      });

      // Generate JWT tokens
      const { accessToken, refreshToken } = await tokenService.generateTokens(user.id);

      // Log successful registration
      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        operation: 'user_registration',
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
            isActive: user.isActive,
            createdAt: user.createdAt,
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
          },
        },
      });
    } catch (error) {
      logger.error('Registration failed', {
        error: error.message,
        email: req.body.email,
        operation: 'user_registration',
      });
      throw error;
    }
  }

  /**
   * User login endpoint
   * POST /api/v1/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { error, value } = validateRequest(req.body, authSchemas.login);
      if (error) {
        throw new ApiError(400, 'Validation error', error.details);
      }

      const { email, password } = value;

      // Find user by email
      const user = await userService.findByEmail(email);
      if (!user) {
        throw new ApiError(401, 'Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new ApiError(401, 'Account is deactivated');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid credentials');
      }

      // Generate JWT tokens
      const { accessToken, refreshToken } = await tokenService.generateTokens(user.id);

      // Update last login
      await userService.updateLastLogin(user.id);

      // Log successful login
      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        operation: 'user_login',
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
            lastLoginAt: user.lastLoginAt,
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
          },
        },
      });
    } catch (error) {
      logger.error('Login failed', {
        error: error.message,
        email: req.body.email,
        operation: 'user_login',
      });
      throw error;
    }
  }

  /**
   * Refresh token endpoint
   * POST /api/v1/auth/refresh
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ApiError(400, 'Refresh token is required');
      }

      // Verify refresh token
      const decoded = await tokenService.verifyRefreshToken(refreshToken);
      const user = await userService.findById(decoded.userId);

      if (!user || !user.isActive) {
        throw new ApiError(401, 'Invalid refresh token');
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = await tokenService.generateTokens(user.id);

      logger.info('Token refreshed successfully', {
        userId: user.id,
        operation: 'token_refresh',
      });

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken,
          refreshToken: newRefreshToken,
          expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        },
      });
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error.message,
        operation: 'token_refresh',
      });
      throw error;
    }
  }

  /**
   * Logout endpoint
   * POST /api/v1/auth/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const userId = req.user?.id;

      if (refreshToken) {
        await tokenService.invalidateRefreshToken(refreshToken);
      }

      if (userId) {
        await userService.updateLastLogout(userId);
      }

      logger.info('User logged out successfully', {
        userId,
        operation: 'user_logout',
      });

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      logger.error('Logout failed', {
        error: error.message,
        operation: 'user_logout',
      });
      throw error;
    }
  }

  /**
   * Get user profile endpoint
   * GET /api/v1/auth/profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      const user = await userService.findById(userId);
      if (!user) {
        throw new ApiError(404, 'User not found');
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
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        },
      });
    } catch (error) {
      logger.error('Get profile failed', {
        error: error.message,
        userId: req.user?.id,
        operation: 'get_profile',
      });
      throw error;
    }
  }

  /**
   * Update user profile endpoint
   * PUT /api/v1/auth/profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      // Validate request body
      const { error, value } = validateRequest(req.body, authSchemas.updateProfile);
      if (error) {
        throw new ApiError(400, 'Validation error', error.details);
      }

      const updatedUser = await userService.updateProfile(userId, value);

      logger.info('Profile updated successfully', {
        userId,
        operation: 'update_profile',
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
            isActive: updatedUser.isActive,
            updatedAt: updatedUser.updatedAt,
          },
        },
      });
    } catch (error) {
      logger.error('Update profile failed', {
        error: error.message,
        userId: req.user?.id,
        operation: 'update_profile',
      });
      throw error;
    }
  }

  /**
   * Change password endpoint
   * POST /api/v1/auth/change-password
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      // Validate request body
      const { error, value } = validateRequest(req.body, authSchemas.changePassword);
      if (error) {
        throw new ApiError(400, 'Validation error', error.details);
      }

      const { currentPassword, newPassword } = value;

      // Verify current password
      const user = await userService.findById(userId);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new ApiError(400, 'Current password is incorrect');
      }

      // Update password
      await authService.changePassword(userId, newPassword);

      // Invalidate all refresh tokens
      await tokenService.invalidateAllUserTokens(userId);

      logger.info('Password changed successfully', {
        userId,
        operation: 'change_password',
      });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      logger.error('Change password failed', {
        error: error.message,
        userId: req.user?.id,
        operation: 'change_password',
      });
      throw error;
    }
  }

  /**
   * Forgot password endpoint
   * POST /api/v1/auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { error, value } = validateRequest(req.body, authSchemas.forgotPassword);
      if (error) {
        throw new ApiError(400, 'Validation error', error.details);
      }

      const { email } = value;

      const user = await userService.findByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not
        res.status(200).json({
          success: true,
          message: 'If the email exists, a password reset link has been sent',
        });
        return;
      }

      // Generate password reset token
      const resetToken = await authService.generatePasswordResetToken(user.id);

      // Send password reset email
      await authService.sendPasswordResetEmail(user.email, resetToken);

      logger.info('Password reset email sent', {
        userId: user.id,
        email: user.email,
        operation: 'forgot_password',
      });

      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      });
    } catch (error) {
      logger.error('Forgot password failed', {
        error: error.message,
        email: req.body.email,
        operation: 'forgot_password',
      });
      throw error;
    }
  }

  /**
   * Reset password endpoint
   * POST /api/v1/auth/reset-password
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { error, value } = validateRequest(req.body, authSchemas.resetPassword);
      if (error) {
        throw new ApiError(400, 'Validation error', error.details);
      }

      const { token, newPassword } = value;

      // Verify reset token and update password
      await authService.resetPassword(token, newPassword);

      logger.info('Password reset successfully', {
        operation: 'reset_password',
      });

      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      logger.error('Reset password failed', {
        error: error.message,
        operation: 'reset_password',
      });
      throw error;
    }
  }

  /**
   * Verify email endpoint
   * POST /api/v1/auth/verify-email
   */
  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        throw new ApiError(400, 'Verification token is required');
      }

      await authService.verifyEmail(token);

      logger.info('Email verified successfully', {
        operation: 'verify_email',
      });

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
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
   * Health check endpoint
   * GET /api/v1/auth/health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Check database connection
      await prisma.$queryRaw`SELECT 1`;

      res.status(200).json({
        success: true,
        message: 'Auth service is healthy',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        version: process.env.APP_VERSION || '1.0.0',
      });
    } catch (error) {
      logger.error('Health check failed', {
        error: error.message,
        operation: 'health_check',
      });
      throw error;
    }
  }
}