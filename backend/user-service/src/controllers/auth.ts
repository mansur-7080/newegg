import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  hashPassword, 
  comparePassword, 
  generateTokens, 
  generateRandomToken,
  generateOTP,
  verifyRefreshToken,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  BadRequestError,
  logger,
  eventService,
  EventType
} from '@newegg/common';
import { UserRole } from '@newegg/common';

export class AuthController {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  // Register new user
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, firstName, lastName, phoneNumber, role = UserRole.CUSTOMER } = req.body;

      // Check if user already exists
      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username: email.split('@')[0] }
          ]
        }
      });

      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const user = await this.prisma.user.create({
        data: {
          email,
          username: email.split('@')[0],
          passwordHash,
          firstName,
          lastName,
          phoneNumber,
          role
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          createdAt: true
        }
      });

      // Generate verification token
      const verificationToken = generateRandomToken();
      await this.prisma.emailVerification.create({
        data: {
          email,
          token: verificationToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      });

      // Publish user created event
      await eventService.publishUserCreated(user.id, user, req.headers['x-correlation-id'] as string);

      // Send verification email (would be handled by notification service)
      logger.info(`Verification email sent to ${email}`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user,
          message: 'Please check your email to verify your account'
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Login user
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          addresses: true
        }
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedError('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid credentials');
      }

      // Generate tokens
      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      // Create session
      const session = await this.prisma.session.create({
        data: {
          userId: user.id,
          token: tokens.accessToken,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      });

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Publish user updated event
      await eventService.publishUserUpdated(user.id, { lastLoginAt: new Date() }, req.headers['x-correlation-id'] as string);

      res.json({
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
            addresses: user.addresses
          },
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Refresh access token
  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new BadRequestError('Refresh token is required');
      }

      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);

      // Check if refresh token exists in database
      const refreshTokenRecord = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken }
      });

      if (!refreshTokenRecord || refreshTokenRecord.expiresAt < new Date()) {
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId }
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedError('User not found or inactive');
      }

      // Generate new tokens
      const newTokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      // Update refresh token
      await this.prisma.refreshToken.update({
        where: { id: refreshTokenRecord.id },
        data: {
          token: newTokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens: {
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Logout user
  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user!;
      const { refreshToken } = req.body;

      // Delete current session
      await this.prisma.session.deleteMany({
        where: {
          userId,
          token: req.headers.authorization?.replace('Bearer ', '')
        }
      });

      // Delete refresh token if provided
      if (refreshToken) {
        await this.prisma.refreshToken.deleteMany({
          where: {
            userId,
            token: refreshToken
          }
        });
      }

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  };

  // Verify email
  verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;

      const verification = await this.prisma.emailVerification.findUnique({
        where: { token }
      });

      if (!verification || verification.expiresAt < new Date()) {
        throw new BadRequestError('Invalid or expired verification token');
      }

      // Update user
      await this.prisma.user.update({
        where: { email: verification.email },
        data: { isEmailVerified: true }
      });

      // Delete verification record
      await this.prisma.emailVerification.delete({
        where: { id: verification.id }
      });

      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Forgot password
  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      const user = await this.prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        // Don't reveal if user exists
        res.json({
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent'
        });
        return;
      }

      // Generate reset token
      const resetToken = generateRandomToken();
      await this.prisma.passwordReset.create({
        data: {
          email,
          token: resetToken,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        }
      });

      // Send reset email (would be handled by notification service)
      logger.info(`Password reset email sent to ${email}`);

      res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent'
      });
    } catch (error) {
      next(error);
    }
  };

  // Reset password
  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body;

      const resetRecord = await this.prisma.passwordReset.findUnique({
        where: { token }
      });

      if (!resetRecord || resetRecord.expiresAt < new Date() || resetRecord.used) {
        throw new BadRequestError('Invalid or expired reset token');
      }

      // Hash new password
      const passwordHash = await hashPassword(password);

      // Update user password
      await this.prisma.user.update({
        where: { email: resetRecord.email },
        data: { passwordHash }
      });

      // Mark reset token as used
      await this.prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true }
      });

      // Revoke all sessions for this user
      await this.prisma.session.deleteMany({
        where: { user: { email: resetRecord.email } }
      });

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Change password
  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user!;
      const { currentPassword, newPassword } = req.body;

      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        throw new BadRequestError('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash }
      });

      // Revoke all sessions except current one
      await this.prisma.session.deleteMany({
        where: {
          userId,
          token: {
            not: req.headers.authorization?.replace('Bearer ', '')
          }
        }
      });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Get current user
  getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user!;

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          addresses: true
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
          addresses: true,
          createdAt: true,
          lastLoginAt: true
        }
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  };

  // Revoke all sessions (admin only)
  revokeAllSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Delete all sessions
      await this.prisma.session.deleteMany({
        where: { userId }
      });

      // Delete all refresh tokens
      await this.prisma.refreshToken.deleteMany({
        where: { userId }
      });

      res.json({
        success: true,
        message: 'All sessions revoked successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Get user sessions (admin only)
  getUserSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      const sessions = await this.prisma.session.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userAgent: true,
          ipAddress: true,
          createdAt: true,
          expiresAt: true
        }
      });

      res.json({
        success: true,
        data: { sessions }
      });
    } catch (error) {
      next(error);
    }
  };
}