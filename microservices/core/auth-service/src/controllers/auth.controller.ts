import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { logger } from '@ultramarket/shared/logging/logger';
import { ApiError } from '@ultramarket/shared/errors';
import { generateTokens, verifyToken } from '@ultramarket/shared/auth/jwt-utils';

const prisma = new PrismaClient();

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const { email, password, username, first_name, last_name, phone_number } = req.body;

      // Check if user already exists
      const existingUser = await prisma.users.findFirst({
        where: {
          OR: [
            { email: email.toLowerCase() },
            { username: username?.toLowerCase() }
          ]
        }
      });

      if (existingUser) {
        throw new ApiError(409, 'User already exists');
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await prisma.users.create({
        data: {
          email: email.toLowerCase(),
          username: username?.toLowerCase(),
          password_hash: passwordHash,
          first_name,
          last_name,
          phone_number,
          role: 'customer',
          is_active: true,
          is_email_verified: false
        },
        select: {
          id: true,
          email: true,
          username: true,
          first_name: true,
          last_name: true,
          role: true,
          is_email_verified: true,
          created_at: true
        }
      });

      // Generate tokens
      const { accessToken, refreshToken } = await generateTokens(user.id);

      // Create session
      await prisma.user_sessions.create({
        data: {
          user_id: user.id,
          token_jti: jwt.decode(accessToken) as any,
          refresh_token_hash: await bcrypt.hash(refreshToken, 10),
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      logger.info('User registered successfully', { userId: user.id, email: user.email });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user,
          tokens: {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: 3600 // 1 hour
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const { email, password } = req.body;

      // Find user
      const user = await prisma.users.findFirst({
        where: {
          email: email.toLowerCase(),
          is_active: true
        }
      });

      if (!user) {
        throw new ApiError(401, 'Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid credentials');
      }

      // Generate tokens
      const { accessToken, refreshToken } = await generateTokens(user.id);

      // Create session
      await prisma.user_sessions.create({
        data: {
          user_id: user.id,
          token_jti: jwt.decode(accessToken) as any,
          refresh_token_hash: await bcrypt.hash(refreshToken, 10),
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      // Update last login
      await prisma.users.update({
        where: { id: user.id },
        data: { last_login_at: new Date() }
      });

      logger.info('User logged in successfully', { userId: user.id, email: user.email });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            is_email_verified: user.is_email_verified
          },
          tokens: {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: 3600 // 1 hour
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        throw new ApiError(400, 'Refresh token is required');
      }

      // Verify refresh token
      const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET!) as any;
      
      // Find session
      const session = await prisma.user_sessions.findFirst({
        where: {
          user_id: decoded.userId,
          is_active: true,
          expires_at: { gt: new Date() }
        },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              username: true,
              first_name: true,
              last_name: true,
              role: true,
              is_email_verified: true,
              is_active: true
            }
          }
        }
      });

      if (!session || !session.users) {
        throw new ApiError(401, 'Invalid refresh token');
      }

      // Verify refresh token hash
      const isRefreshTokenValid = await bcrypt.compare(refresh_token, session.refresh_token_hash);
      if (!isRefreshTokenValid) {
        throw new ApiError(401, 'Invalid refresh token');
      }

      // Generate new tokens
      const { accessToken, refreshToken } = await generateTokens(session.users.id);

      // Update session
      await prisma.user_sessions.update({
        where: { id: session.id },
        data: {
          token_jti: jwt.decode(accessToken) as any,
          refresh_token_hash: await bcrypt.hash(refreshToken, 10),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      logger.info('Token refreshed successfully', { userId: session.users.id });

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens: {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: 3600 // 1 hour
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user
   */
  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        throw new ApiError(401, 'Access token required');
      }

      // Verify token
      const decoded = verifyToken(token) as any;
      
      // Deactivate session
      await prisma.user_sessions.updateMany({
        where: {
          user_id: decoded.userId,
          token_jti: decoded.jti,
          is_active: true
        },
        data: {
          is_active: false
        }
      });

      logger.info('User logged out successfully', { userId: decoded.userId });

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          first_name: true,
          last_name: true,
          phone_number: true,
          date_of_birth: true,
          role: true,
          is_active: true,
          is_email_verified: true,
          email_verified_at: true,
          last_login_at: true,
          created_at: true,
          updated_at: true
        }
      });

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const userId = (req as any).user.id;
      const { first_name, last_name, phone_number, date_of_birth } = req.body;

      const updatedUser = await prisma.users.update({
        where: { id: userId },
        data: {
          first_name,
          last_name,
          phone_number,
          date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined
        },
        select: {
          id: true,
          email: true,
          username: true,
          first_name: true,
          last_name: true,
          phone_number: true,
          date_of_birth: true,
          role: true,
          is_active: true,
          is_email_verified: true,
          updated_at: true
        }
      });

      logger.info('Profile updated successfully', { userId });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: updatedUser }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const userId = (req as any).user.id;
      const { current_password, new_password } = req.body;

      // Get current user
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { password_hash: true }
      });

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw new ApiError(400, 'Current password is incorrect');
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

      // Update password
      await prisma.users.update({
        where: { id: userId },
        data: { password_hash: newPasswordHash }
      });

      // Deactivate all sessions
      await prisma.user_sessions.updateMany({
        where: {
          user_id: userId,
          is_active: true
        },
        data: {
          is_active: false
        }
      });

      logger.info('Password changed successfully', { userId });

      res.json({
        success: true,
        message: 'Password changed successfully. Please login again.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email
   */
  static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;

      // Verify email verification token
      const decoded = jwt.verify(token, process.env.JWT_EMAIL_VERIFICATION_SECRET!) as any;

      const user = await prisma.users.findUnique({
        where: { id: decoded.userId }
      });

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      if (user.is_email_verified) {
        throw new ApiError(400, 'Email already verified');
      }

      // Update user
      await prisma.users.update({
        where: { id: decoded.userId },
        data: {
          is_email_verified: true,
          email_verified_at: new Date()
        }
      });

      logger.info('Email verified successfully', { userId: decoded.userId });

      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

// Validation middleware
export const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('username').optional().isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters'),
  body('first_name').optional().isLength({ max: 100 }).withMessage('First name must be less than 100 characters'),
  body('last_name').optional().isLength({ max: 100 }).withMessage('Last name must be less than 100 characters'),
  body('phone_number').optional().matches(/^\+?[1-9]\d{1,14}$/).withMessage('Valid phone number is required')
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

export const updateProfileValidation = [
  body('first_name').optional().isLength({ max: 100 }).withMessage('First name must be less than 100 characters'),
  body('last_name').optional().isLength({ max: 100 }).withMessage('Last name must be less than 100 characters'),
  body('phone_number').optional().matches(/^\+?[1-9]\d{1,14}$/).withMessage('Valid phone number is required'),
  body('date_of_birth').optional().isISO8601().withMessage('Valid date is required')
];

export const changePasswordValidation = [
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long')
];