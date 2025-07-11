import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { logger } from '@ultramarket/shared/logging/logger';
import { 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError 
} from '@ultramarket/shared/errors';
import { 
  validateRegistrationData, 
  validateLoginData,
  validateRefreshToken 
} from '../validators/auth.validator';
import { 
  generateAccessToken, 
  generateRefreshToken,
  verifyToken 
} from '../services/jwt.service';
import { 
  createUser, 
  findUserByEmail, 
  findUserById,
  updateUserLastLogin 
} from '../services/user.service';
import { 
  createRefreshToken, 
  deleteRefreshToken,
  findRefreshToken 
} from '../services/token.service';

const prisma = new PrismaClient();

export class AuthController {
  /**
   * User registration endpoint
   */
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate input data
      const { error, value } = validateRegistrationData(req.body);
      if (error) {
        throw new ValidationError('Invalid registration data', error.details);
      }

      const { email, password, firstName, lastName, phone } = value;

      // Check if user already exists
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        throw new ValidationError('User with this email already exists');
      }

      // Hash password
      const saltRounds = parseInt(process.env.SALT_ROUNDS ?? '12', 10);
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: 'USER'
      });

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Save refresh token
      await createRefreshToken({
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
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
            createdAt: user.createdAt
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN ?? '3600', 10)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * User login endpoint
   */
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate input data
      const { error, value } = validateLoginData(req.body);
      if (error) {
        throw new ValidationError('Invalid login data', error.details);
      }

      const { email, password } = value;

      // Find user by email
      const user = await findUserByEmail(email);
      if (!user) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new AuthenticationError('Account is deactivated');
      }

      // Update last login
      await updateUserLastLogin(user.id);

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Save refresh token
      await createRefreshToken({
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
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
            lastLoginAt: user.lastLoginAt
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN ?? '3600', 10)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Token refresh endpoint
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
      const tokenRecord = await findRefreshToken(refreshToken);
      if (!tokenRecord) {
        throw new AuthenticationError('Refresh token not found');
      }

      // Check if token is expired
      if (tokenRecord.expiresAt < new Date()) {
        await deleteRefreshToken(refreshToken);
        throw new AuthenticationError('Refresh token expired');
      }

      // Get user
      const user = await findUserById(decoded.userId);
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      // Generate new tokens
      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      // Update refresh token
      await deleteRefreshToken(refreshToken);
      await createRefreshToken({
        userId: user.id,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

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
            expiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN ?? '3600', 10)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * User logout endpoint
   */
  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Delete refresh token from database
        await deleteRefreshToken(refreshToken);
      }

      logger.info('User logged out successfully', {
        userId: req.user?.id,
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
   * Get user profile endpoint
   */
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AuthenticationError('User not authenticated');
      }

      const user = await findUserById(userId);
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            lastLoginAt: user.lastLoginAt
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile endpoint
   */
  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
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
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true
        }
      });

      logger.info('User profile updated successfully', {
        userId: updatedUser.id,
        operation: 'profile_update'
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: updatedUser
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password endpoint
   */
  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AuthenticationError('User not authenticated');
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new ValidationError('Current password and new password are required');
      }

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true }
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
      const saltRounds = parseInt(process.env.SALT_ROUNDS ?? '12', 10);
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedNewPassword,
          updatedAt: new Date()
        }
      });

      // Delete all refresh tokens for this user
      await prisma.refreshToken.deleteMany({
        where: { userId }
      });

      logger.info('Password changed successfully', {
        userId,
        operation: 'password_change'
      });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully. Please login again.'
      });
    } catch (error) {
      next(error);
    }
  }
}