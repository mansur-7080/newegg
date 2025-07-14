/**
 * Professional Auth Controller for UltraMarket
 * Comprehensive authentication and authorization with Uzbekistan-specific features
 */

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { 
  AuthError, 
  ValidationError, 
  NotFoundError, 
  ConflictError,
  asyncHandler 
} from '../middleware/errorHandler';
import { UserModel } from '../models/User';
import { TokenModel } from '../models/Token';
import { validateEnv } from '../config/env.validation';

// Get JWT configuration
const jwtConfig = {
  accessSecret: process.env.JWT_ACCESS_SECRET!,
  refreshSecret: process.env.JWT_REFRESH_SECRET!,
  emailVerificationSecret: process.env.JWT_EMAIL_VERIFICATION_SECRET!,
  passwordResetSecret: process.env.JWT_PASSWORD_RESET_SECRET!,
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  emailVerificationExpiry: '24h',
  passwordResetExpiry: '1h',
};

export class AuthController {
  /**
   * Register new user
   */
  static register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      dateOfBirth,
      address,
      city,
      region,
      postalCode,
      acceptTerms,
      marketingConsent 
    } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      throw new ValidationError('Email, password, first name, and last name are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    // Validate Uzbek phone number format
    if (phone) {
      const phoneRegex = /^\+998[0-9]{9}$/;
      if (!phoneRegex.test(phone)) {
        throw new ValidationError('Invalid phone number format. Use +998XXXXXXXXX');
      }
    }

    // Check if user already exists
    const existingUser = await UserModel.findOne({ 
      $or: [{ email }, { phone }] 
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictError('User with this email already exists');
      }
      if (phone && existingUser.phone === phone) {
        throw new ConflictError('User with this phone number already exists');
      }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await UserModel.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      address,
      city,
      region,
      postalCode,
      acceptTerms: acceptTerms || false,
      marketingConsent: marketingConsent || false,
      isEmailVerified: false,
      isPhoneVerified: false,
      status: 'active',
      role: 'customer',
      preferences: {
        language: 'uz',
        currency: 'UZS',
        timezone: 'Asia/Tashkent',
        notifications: {
          email: true,
          sms: true,
          push: true,
        },
      },
    });

    // Generate email verification token
    const emailVerificationToken = jwt.sign(
      { userId: user.id, email: user.email },
      jwtConfig.emailVerificationSecret,
      { expiresIn: jwtConfig.emailVerificationExpiry }
    );

    // Save verification token
    await TokenModel.create({
      userId: user.id,
      token: emailVerificationToken,
      type: 'email_verification',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    // Send verification email (implement email service)
    // await emailService.sendVerificationEmail(user.email, emailVerificationToken);

    // Generate access and refresh tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      jwtConfig.accessSecret,
      { expiresIn: jwtConfig.accessTokenExpiry }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email },
      jwtConfig.refreshSecret,
      { expiresIn: jwtConfig.refreshTokenExpiry }
    );

    // Save refresh token
    await TokenModel.create({
      userId: user.id,
      token: refreshToken,
      type: 'refresh',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Log registration
    logger.auth(user.id, 'user_registered', {
      email: user.email,
      phone: user.phone,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
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
          phone: user.phone,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          role: user.role,
          status: user.status,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  });

  /**
   * Login user
   */
  static login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, rememberMe } = req.body;

    // Validate required fields
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Find user by email
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AuthError('Invalid email or password');
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new AuthError('Account is not active. Please contact support.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AuthError('Invalid email or password');
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      jwtConfig.accessSecret,
      { expiresIn: jwtConfig.accessTokenExpiry }
    );

    const refreshTokenExpiry = rememberMe ? '30d' : jwtConfig.refreshTokenExpiry;
    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email },
      jwtConfig.refreshSecret,
      { expiresIn: refreshTokenExpiry }
    );

    // Save refresh token
    await TokenModel.create({
      userId: user.id,
      token: refreshToken,
      type: 'refresh',
      expiresAt: new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000),
    });

    // Update last login
    await UserModel.findByIdAndUpdate(user.id, {
      lastLoginAt: new Date(),
      loginCount: (user.loginCount || 0) + 1,
    });

    // Log login
    logger.auth(user.id, 'user_logged_in', {
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      rememberMe,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          role: user.role,
          status: user.status,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  });

  /**
   * Refresh access token
   */
  static refreshToken = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('Refresh token is required');
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret) as any;
      
      // Check if token exists in database
      const tokenDoc = await TokenModel.findOne({
        token: refreshToken,
        type: 'refresh',
        expiresAt: { $gt: new Date() },
      });

      if (!tokenDoc) {
        throw new AuthError('Invalid refresh token');
      }

      // Get user
      const user = await UserModel.findById(decoded.userId);
      if (!user || user.status !== 'active') {
        throw new AuthError('User not found or inactive');
      }

      // Generate new access token
      const newAccessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        jwtConfig.accessSecret,
        { expiresIn: jwtConfig.accessTokenExpiry }
      );

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newAccessToken,
        },
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError('Invalid refresh token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError('Refresh token expired');
      }
      throw error;
    }
  });

  /**
   * Logout user
   */
  static logout = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body;
    const userId = (req as any).user?.id;

    if (refreshToken) {
      // Invalidate refresh token
      await TokenModel.findOneAndUpdate(
        { token: refreshToken, type: 'refresh' },
        { isRevoked: true }
      );
    }

    if (userId) {
      // Log logout
      logger.auth(userId, 'user_logged_out', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
    }

    res.json({
      success: true,
      message: 'Logout successful',
    });
  });

  /**
   * Verify email
   */
  static verifyEmail = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params;

    if (!token) {
      throw new ValidationError('Verification token is required');
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, jwtConfig.emailVerificationSecret) as any;
      
      // Check if token exists and is valid
      const tokenDoc = await TokenModel.findOne({
        token,
        type: 'email_verification',
        expiresAt: { $gt: new Date() },
        isRevoked: false,
      });

      if (!tokenDoc) {
        throw new AuthError('Invalid or expired verification token');
      }

      // Update user
      await UserModel.findByIdAndUpdate(decoded.userId, {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      });

      // Revoke token
      await TokenModel.findByIdAndUpdate(tokenDoc.id, { isRevoked: true });

      // Log verification
      logger.auth(decoded.userId, 'email_verified', {
        email: decoded.email,
      });

      res.json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError('Invalid verification token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError('Verification token expired');
      }
      throw error;
    }
  });

  /**
   * Request password reset
   */
  static requestPasswordReset = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError('Email is required');
    }

    // Find user
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists or not
      res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent',
      });
      return;
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email },
      jwtConfig.passwordResetSecret,
      { expiresIn: jwtConfig.passwordResetExpiry }
    );

    // Save reset token
    await TokenModel.create({
      userId: user.id,
      token: resetToken,
      type: 'password_reset',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    // Send reset email (implement email service)
    // await emailService.sendPasswordResetEmail(user.email, resetToken);

    // Log password reset request
    logger.auth(user.id, 'password_reset_requested', {
      email: user.email,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent',
    });
  });

  /**
   * Reset password
   */
  static resetPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new ValidationError('Token and new password are required');
    }

    // Validate password strength
    if (newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, jwtConfig.passwordResetSecret) as any;
      
      // Check if token exists and is valid
      const tokenDoc = await TokenModel.findOne({
        token,
        type: 'password_reset',
        expiresAt: { $gt: new Date() },
        isRevoked: false,
      });

      if (!tokenDoc) {
        throw new AuthError('Invalid or expired reset token');
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update user password
      await UserModel.findByIdAndUpdate(decoded.userId, {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      });

      // Revoke all user tokens
      await TokenModel.updateMany(
        { userId: decoded.userId },
        { isRevoked: true }
      );

      // Log password reset
      logger.auth(decoded.userId, 'password_reset_completed', {
        email: decoded.email,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError('Invalid reset token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError('Reset token expired');
      }
      throw error;
    }
  });

  /**
   * Change password
   */
  static changePassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user?.id;

    if (!currentPassword || !newPassword) {
      throw new ValidationError('Current password and new password are required');
    }

    // Validate password strength
    if (newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    // Get user
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new AuthError('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await UserModel.findByIdAndUpdate(userId, {
      password: hashedPassword,
      passwordChangedAt: new Date(),
    });

    // Revoke all user tokens except current
    const currentToken = req.headers.authorization?.replace('Bearer ', '');
    if (currentToken) {
      await TokenModel.updateMany(
        { 
          userId,
          token: { $ne: currentToken }
        },
        { isRevoked: true }
      );
    }

    // Log password change
    logger.auth(userId, 'password_changed', {
      email: user.email,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  });

  /**
   * Get current user profile
   */
  static getProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;

    const user = await UserModel.findById(userId).select('-password');
    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          dateOfBirth: user.dateOfBirth,
          address: user.address,
          city: user.city,
          region: user.region,
          postalCode: user.postalCode,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          role: user.role,
          status: user.status,
          preferences: user.preferences,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  });

  /**
   * Update user profile
   */
  static updateProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;
    const {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      address,
      city,
      region,
      postalCode,
      preferences,
    } = req.body;

    // Validate phone number if provided
    if (phone) {
      const phoneRegex = /^\+998[0-9]{9}$/;
      if (!phoneRegex.test(phone)) {
        throw new ValidationError('Invalid phone number format. Use +998XXXXXXXXX');
      }

      // Check if phone is already used by another user
      const existingUser = await UserModel.findOne({ phone, _id: { $ne: userId } });
      if (existingUser) {
        throw new ConflictError('Phone number is already in use');
      }
    }

    // Update user
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        firstName,
        lastName,
        phone,
        dateOfBirth,
        address,
        city,
        region,
        postalCode,
        preferences,
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      throw new NotFoundError('User not found');
    }

    // Log profile update
    logger.auth(userId, 'profile_updated', {
      email: updatedUser.email,
      updatedFields: Object.keys(req.body),
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          phone: updatedUser.phone,
          dateOfBirth: updatedUser.dateOfBirth,
          address: updatedUser.address,
          city: updatedUser.city,
          region: updatedUser.region,
          postalCode: updatedUser.postalCode,
          isEmailVerified: updatedUser.isEmailVerified,
          isPhoneVerified: updatedUser.isPhoneVerified,
          role: updatedUser.role,
          status: updatedUser.status,
          preferences: updatedUser.preferences,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
      },
    });
  });

  /**
   * Delete user account
   */
  static deleteAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;
    const { password } = req.body;

    if (!password) {
      throw new ValidationError('Password is required to delete account');
    }

    // Get user
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AuthError('Password is incorrect');
    }

    // Soft delete user
    await UserModel.findByIdAndUpdate(userId, {
      status: 'deleted',
      deletedAt: new Date(),
    });

    // Revoke all user tokens
    await TokenModel.updateMany(
      { userId },
      { isRevoked: true }
    );

    // Log account deletion
    logger.auth(userId, 'account_deleted', {
      email: user.email,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  });
}
