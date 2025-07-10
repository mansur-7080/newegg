import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { logger } from '@newegg/common';
import { createError } from '@newegg/common';
import { sendEmail } from '../services/email.service';

const prisma = new PrismaClient();

export const authController = {
  // Register new user
  async register(req: Request, res: Response) {
    try {
      const { email, username, password, firstName, lastName, phone } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      });

      if (existingUser) {
        throw createError(400, 'User with this email or username already exists');
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          username,
          passwordHash,
          firstName,
          lastName,
          phone
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      });

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      await prisma.emailVerification.create({
        data: {
          userId: user.id,
          token: verificationToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      });

      // Send verification email
      await sendEmail({
        to: user.email,
        subject: 'Verify your email address',
        template: 'email-verification',
        data: {
          username: user.username,
          verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
        }
      });

      // Generate JWT tokens
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );

      // Save refresh token
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please check your email to verify your account.',
        data: {
          user,
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  },

  // Login user
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          sessions: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      if (!user || !user.isActive) {
        throw createError(401, 'Invalid credentials');
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw createError(423, 'Account is temporarily locked. Please try again later.');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        // Increment login attempts
        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: user.loginAttempts + 1,
            lockedUntil: user.loginAttempts >= 4 ? new Date(Date.now() + 15 * 60 * 1000) : null // Lock for 15 minutes after 5 failed attempts
          }
        });

        throw createError(401, 'Invalid credentials');
      }

      // Reset login attempts on successful login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date()
        }
      });

      // Generate JWT tokens
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );

      // Save refresh token
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      // Create session
      await prisma.session.create({
        data: {
          userId: user.id,
          token: accessToken,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
        }
      });

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
            isVerified: user.isVerified,
            emailVerified: user.emailVerified
          },
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  },

  // Refresh token
  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
      
      // Check if token exists and is not revoked
      const tokenRecord = await prisma.refreshToken.findFirst({
        where: {
          token: refreshToken,
          userId: decoded.userId,
          isRevoked: false,
          expiresAt: { gt: new Date() }
        }
      });

      if (!tokenRecord) {
        throw createError(401, 'Invalid refresh token');
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
        throw createError(401, 'User not found or inactive');
      }

      // Generate new tokens
      const newAccessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      );

      const newRefreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );

      // Revoke old refresh token
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { isRevoked: true }
      });

      // Save new refresh token
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      res.json({
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      logger.error('Refresh token error:', error);
      throw error;
    }
  },

  // Logout
  async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Revoke refresh token
        await prisma.refreshToken.updateMany({
          where: { token: refreshToken },
          data: { isRevoked: true }
        });
      }

      // Invalidate current session
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await prisma.session.updateMany({
          where: { token },
          data: { isActive: false }
        });
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  },

  // Verify email
  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.params;

      const verification = await prisma.emailVerification.findFirst({
        where: {
          token,
          isUsed: false,
          expiresAt: { gt: new Date() }
        },
        include: { user: true }
      });

      if (!verification) {
        throw createError(400, 'Invalid or expired verification token');
      }

      // Update user and verification
      await prisma.$transaction([
        prisma.user.update({
          where: { id: verification.userId },
          data: {
            emailVerified: true,
            isVerified: true
          }
        }),
        prisma.emailVerification.update({
          where: { id: verification.id },
          data: { isUsed: true }
        })
      ]);

      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error) {
      logger.error('Email verification error:', error);
      throw error;
    }
  },

  // Resend verification email
  async resendVerificationEmail(req: Request, res: Response) {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        throw createError(404, 'User not found');
      }

      if (user.emailVerified) {
        throw createError(400, 'Email is already verified');
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      await prisma.emailVerification.create({
        data: {
          userId: user.id,
          token: verificationToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });

      // Send verification email
      await sendEmail({
        to: user.email,
        subject: 'Verify your email address',
        template: 'email-verification',
        data: {
          username: user.username,
          verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
        }
      });

      res.json({
        success: true,
        message: 'Verification email sent successfully'
      });
    } catch (error) {
      logger.error('Resend verification error:', error);
      throw error;
    }
  },

  // Forgot password
  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({
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
      const resetToken = crypto.randomBytes(32).toString('hex');
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour
        }
      });

      // Send reset email
      await sendEmail({
        to: user.email,
        subject: 'Reset your password',
        template: 'password-reset',
        data: {
          username: user.username,
          resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
        }
      });

      res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent'
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      throw error;
    }
  },

  // Reset password
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, password } = req.body;

      const resetRecord = await prisma.passwordReset.findFirst({
        where: {
          token,
          isUsed: false,
          expiresAt: { gt: new Date() }
        },
        include: { user: true }
      });

      if (!resetRecord) {
        throw createError(400, 'Invalid or expired reset token');
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Update password and mark token as used
      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetRecord.userId },
          data: {
            passwordHash,
            loginAttempts: 0,
            lockedUntil: null
          }
        }),
        prisma.passwordReset.update({
          where: { id: resetRecord.id },
          data: { isUsed: true }
        })
      ]);

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      logger.error('Reset password error:', error);
      throw error;
    }
  },

  // Change password (authenticated)
  async changePassword(req: Request, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = (req as any).user?.userId;

      if (!userId) {
        throw createError(401, 'Authentication required');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw createError(404, 'User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        throw createError(400, 'Current password is incorrect');
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
      });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  },

  // Get current user
  async getCurrentUser(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        throw createError(401, 'Authentication required');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          dateOfBirth: true,
          gender: true,
          avatar: true,
          role: true,
          isActive: true,
          isVerified: true,
          emailVerified: true,
          phoneVerified: true,
          preferences: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        throw createError(404, 'User not found');
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      logger.error('Get current user error:', error);
      throw error;
    }
  }
};