import { PrismaClient, User, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { 
  BadRequestError, 
  NotFoundError, 
  ConflictError, 
  UnauthorizedError,
  InternalServerError 
} from '@newegg/common';
import { ErrorCode } from '@newegg/common';
import { EmailService } from './email.service';
import { RedisService } from './redis.service';

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  bio?: string;
  profileImage?: string;
  dateOfBirth?: Date;
  gender?: string;
  preferences?: Record<string, unknown>;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken: string;
}

export interface PasswordResetData {
  email: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export class UserService {
  private prisma: PrismaClient;
  private emailService: EmailService;
  private redisService: RedisService;

  constructor() {
    this.prisma = new PrismaClient();
    this.emailService = new EmailService();
    this.redisService = new RedisService();
  }

  /**
   * Create a new user
   */
  async createUser(data: CreateUserData): Promise<Omit<User, 'password'>> {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email }
      });

      if (existingUser) {
        throw new ConflictError('User with this email already exists', ErrorCode.USER_ALREADY_EXISTS);
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);

      // Create user
      const user = await this.prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          phoneNumber: data.phoneNumber,
          role: data.role || 'CUSTOMER',
          emailVerified: false,
          isActive: true
        }
      });

      // Send welcome email
      await this.emailService.sendWelcomeEmail(user.email, user.firstName);

      // Send verification email
      await this.sendVerificationEmail(user);

      logger.info(`User created successfully: ${user.id}`);
      return this.excludePassword(user);
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Authenticate user login
   */
  async login(data: LoginData): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email: data.email }
      });

      if (!user) {
        throw new UnauthorizedError('Invalid credentials', ErrorCode.INVALID_CREDENTIALS);
      }

      if (!user.isActive) {
        throw new UnauthorizedError('Account is deactivated', ErrorCode.ACCOUNT_DEACTIVATED);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(data.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid credentials', ErrorCode.INVALID_CREDENTIALS);
      }

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // Store refresh token in Redis
      await this.redisService.setRefreshToken(user.id, refreshToken);

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      logger.info(`User logged in successfully: ${user.id}`);
      return {
        user: this.excludePassword(user),
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('Error during login:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<Omit<User, 'password'>> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          addresses: true,
          orders: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!user) {
        throw new NotFoundError('User not found', ErrorCode.USER_NOT_FOUND);
      }

      return this.excludePassword(user);
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw error;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<Omit<User, 'password'>> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        throw new NotFoundError('User not found', ErrorCode.USER_NOT_FOUND);
      }

      return this.excludePassword(user);
    } catch (error) {
      logger.error('Error getting user by email:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, data: UpdateUserData): Promise<Omit<User, 'password'>> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new NotFoundError('User not found', ErrorCode.USER_NOT_FOUND);
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });

      logger.info(`User updated successfully: ${userId}`);
      return this.excludePassword(updatedUser);
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, data: ChangePasswordData): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new NotFoundError('User not found', ErrorCode.USER_NOT_FOUND);
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new BadRequestError('Current password is incorrect');
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(data.newPassword, saltRounds);

      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedNewPassword,
          updatedAt: new Date()
        }
      });

      // Invalidate all refresh tokens
      await this.redisService.invalidateUserTokens(userId);

      // Send password change notification email
      await this.emailService.sendPasswordChangeNotification(user.email);

      logger.info(`Password changed successfully for user: ${userId}`);
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(data: PasswordResetData): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: data.email }
      });

      if (!user) {
        // Don't reveal if user exists or not
        logger.info(`Password reset requested for non-existent email: ${data.email}`);
        return;
      }

      // Generate reset token
      const resetToken = this.generateResetToken(user);
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token in database
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry
        }
      });

      // Send password reset email
      await this.emailService.sendPasswordResetEmail(user.email, resetToken);

      logger.info(`Password reset requested for user: ${user.id}`);
    } catch (error) {
      logger.error('Error requesting password reset:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: {
            gt: new Date()
          }
        }
      });

      if (!user) {
        throw new BadRequestError('Invalid or expired reset token');
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password and clear reset token
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
          updatedAt: new Date()
        }
      });

      // Invalidate all refresh tokens
      await this.redisService.invalidateUserTokens(user.id);

      // Send password reset confirmation email
      await this.emailService.sendPasswordResetConfirmation(user.email);

      logger.info(`Password reset successfully for user: ${user.id}`);
    } catch (error) {
      logger.error('Error resetting password:', error);
      throw error;
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          verificationToken: token,
          emailVerified: false
        }
      });

      if (!user) {
        throw new BadRequestError('Invalid verification token');
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verificationToken: null,
          updatedAt: new Date()
        }
      });

      logger.info(`Email verified successfully for user: ${user.id}`);
    } catch (error) {
      logger.error('Error verifying email:', error);
      throw error;
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(userId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new NotFoundError('User not found', ErrorCode.USER_NOT_FOUND);
      }

      if (user.emailVerified) {
        throw new BadRequestError('Email is already verified', ErrorCode.EMAIL_ALREADY_VERIFIED);
      }

      await this.sendVerificationEmail(user);
      logger.info(`Verification email resent for user: ${userId}`);
    } catch (error) {
      logger.error('Error resending verification email:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
      
      // Check if token exists in Redis
      const storedToken = await this.redisService.getRefreshToken(decoded.userId);
      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedError('Invalid refresh token', ErrorCode.TOKEN_INVALID);
      }

      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedError('User not found or inactive');
      }

      // Generate new access token
      const accessToken = this.generateAccessToken(user);

      logger.info(`Token refreshed for user: ${user.id}`);
      return { accessToken };
    } catch (error) {
      logger.error('Error refreshing token:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string): Promise<void> {
    try {
      // Remove refresh token from Redis
      await this.redisService.removeRefreshToken(userId);
      
      logger.info(`User logged out: ${userId}`);
    } catch (error) {
      logger.error('Error during logout:', error);
      throw error;
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(userId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new NotFoundError('User not found', ErrorCode.USER_NOT_FOUND);
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      // Invalidate all refresh tokens
      await this.redisService.invalidateUserTokens(userId);

      logger.info(`User deactivated: ${userId}`);
    } catch (error) {
      logger.error('Error deactivating user:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<Record<string, unknown>> {
    try {
      const [
        totalOrders,
        totalSpent,
        favoriteCategories,
        lastOrderDate
      ] = await Promise.all([
        this.prisma.order.count({
          where: { userId, status: 'COMPLETED' }
        }),
        this.prisma.order.aggregate({
          where: { userId, status: 'COMPLETED' },
          _sum: { totalAmount: true }
        }),
        this.prisma.order.findMany({
          where: { userId },
          include: {
            items: {
              include: {
                product: {
                  include: { category: true }
                }
              }
            }
          },
          take: 10
        }),
        this.prisma.order.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        })
      ]);

      return {
        totalOrders,
        totalSpent: totalSpent._sum.totalAmount || 0,
        lastOrderDate: lastOrderDate?.createdAt,
        favoriteCategories: this.extractFavoriteCategories(favoriteCategories)
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Search users (admin only)
   */
  async searchUsers(query: string, page: number = 1, limit: number = 20): Promise<{
    users: Omit<User, 'password'>[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where: {
            OR: [
              { email: { contains: query, mode: 'insensitive' } },
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } }
            ]
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.user.count({
          where: {
            OR: [
              { email: { contains: query, mode: 'insensitive' } },
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } }
            ]
          }
        })
      ]);

      return {
        users: users.map(user => this.excludePassword(user)),
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }

  // Private helper methods

  private generateAccessToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '15m' }
    );
  }

  private generateRefreshToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id
      },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );
  }

  private generateResetToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email
      },
      process.env.JWT_RESET_SECRET!,
      { expiresIn: '1h' }
    );
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    const verificationToken = jwt.sign(
      {
        userId: user.id,
        email: user.email
      },
      process.env.JWT_VERIFICATION_SECRET!,
      { expiresIn: '24h' }
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationToken }
    });

    await this.emailService.sendVerificationEmail(user.email, verificationToken);
  }

  private excludePassword(user: User): Omit<User, 'password'> {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  private extractFavoriteCategories(orders: any[]): string[] {
    const categoryCount: Record<string, number> = {};
    
    orders.forEach(order => {
      order.items.forEach((item: any) => {
        const categoryName = item.product.category.name;
        categoryCount[categoryName] = (categoryCount[categoryName] || 0) + 1;
      });
    });

    return Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category]) => category);
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}