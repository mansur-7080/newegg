import { Request } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { EmailService } from '../services/email.service';
import { RedisService } from '../services/redis.service';

export class UserController {
  private emailService: EmailService;
  private redisService: RedisService;

  constructor() {
    this.emailService = new EmailService();
    this.redisService = new RedisService();
  }

  /**
   * Get all users (Admin only)
   */
  async getAllUsers(options: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    try {
      const { page, limit, search, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Get users with pagination
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            emailVerified: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true,
          },
        }),
        prisma.user.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
      };
    } catch (error) {
      logger.error('Failed to get all users', { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string, currentUserId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          addresses: true,
          preferences: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check if current user can access this user's data
      if (currentUserId !== userId) {
        // Remove sensitive information for other users
        const { password, ...safeUser } = user;
        return safeUser;
      }

      const { password, ...safeUser } = user;
      return safeUser;
    } catch (error) {
      logger.error('Failed to get user by ID', { error: error instanceof Error ? error.message : error, userId });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateData: any) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        include: {
          addresses: true,
          preferences: true,
        },
      });

      const { password, ...safeUser } = updatedUser;

      logger.info('User profile updated', { userId });

      return safeUser;
    } catch (error) {
      logger.error('Failed to update user profile', { error: error instanceof Error ? error.message : error, userId });
      throw error;
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          addresses: true,
          preferences: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      const { password, ...safeUser } = user;
      return safeUser;
    } catch (error) {
      logger.error('Failed to get user profile', { error: error instanceof Error ? error.message : error, userId });
      throw error;
    }
  }

  /**
   * Add new address
   */
  async addAddress(userId: string, addressData: any) {
    try {
      // If this is the first address, make it default
      const existingAddresses = await prisma.address.count({
        where: { userId },
      });

      const address = await prisma.address.create({
        data: {
          ...addressData,
          userId,
          isDefault: existingAddresses === 0 || addressData.isDefault,
        },
      });

      // If this address is default, unset other addresses as default
      if (address.isDefault) {
        await prisma.address.updateMany({
          where: {
            userId,
            id: { not: address.id },
          },
          data: { isDefault: false },
        });
      }

      logger.info('Address added', { userId, addressId: address.id });

      return address;
    } catch (error) {
      logger.error('Failed to add address', { error: error instanceof Error ? error.message : error, userId });
      throw error;
    }
  }

  /**
   * Get user addresses
   */
  async getAddresses(userId: string) {
    try {
      const addresses = await prisma.address.findMany({
        where: { userId },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      return addresses;
    } catch (error) {
      logger.error('Failed to get user addresses', { error: error instanceof Error ? error.message : error, userId });
      throw error;
    }
  }

  /**
   * Update address
   */
  async updateAddress(userId: string, addressId: string, updateData: any) {
    try {
      const address = await prisma.address.findFirst({
        where: {
          id: addressId,
          userId,
        },
      });

      if (!address) {
        throw new AppError('Address not found', 404);
      }

      const updatedAddress = await prisma.address.update({
        where: { id: addressId },
        data: updateData,
      });

      // If this address is now default, unset other addresses as default
      if (updatedAddress.isDefault) {
        await prisma.address.updateMany({
          where: {
            userId,
            id: { not: addressId },
          },
          data: { isDefault: false },
        });
      }

      logger.info('Address updated', { userId, addressId });

      return updatedAddress;
    } catch (error) {
      logger.error('Failed to update address', { error: error instanceof Error ? error.message : error, userId, addressId });
      throw error;
    }
  }

  /**
   * Delete address
   */
  async deleteAddress(userId: string, addressId: string) {
    try {
      const address = await prisma.address.findFirst({
        where: {
          id: addressId,
          userId,
        },
      });

      if (!address) {
        throw new AppError('Address not found', 404);
      }

      await prisma.address.delete({
        where: { id: addressId },
      });

      logger.info('Address deleted', { userId, addressId });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete address', { error: error instanceof Error ? error.message : error, userId, addressId });
      throw error;
    }
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(userId: string, file: any) {
    try {
      // This would typically involve uploading to S3 or similar
      // For now, we'll just return a placeholder
      const avatarUrl = `https://ultramarket-avatars.s3.amazonaws.com/${userId}/${file.filename}`;

      // Update user with avatar URL
      await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl },
      });

      logger.info('Avatar uploaded', { userId, avatarUrl });

      return { avatarUrl };
    } catch (error) {
      logger.error('Failed to upload avatar', { error: error instanceof Error ? error.message : error, userId });
      throw error;
    }
  }

  /**
   * Delete user avatar
   */
  async deleteAvatar(userId: string) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: null },
      });

      logger.info('Avatar deleted', { userId });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete avatar', { error: error instanceof Error ? error.message : error, userId });
      throw error;
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateAccount(userId: string, reason?: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      await prisma.user.update({
        where: { id: userId },
        data: { 
          status: 'DEACTIVATED',
          deactivatedAt: new Date(),
          deactivationReason: reason,
        },
      });

      // Send deactivation email
      await this.emailService.sendDeactivationEmail(user.email, user.firstName, reason);

      logger.info('Account deactivated', { userId, reason });

      return { success: true };
    } catch (error) {
      logger.error('Failed to deactivate account', { error: error instanceof Error ? error.message : error, userId });
      throw error;
    }
  }

  /**
   * Reactivate user account
   */
  async reactivateAccount(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      await prisma.user.update({
        where: { id: userId },
        data: { 
          status: 'ACTIVE',
          deactivatedAt: null,
          deactivationReason: null,
        },
      });

      logger.info('Account reactivated', { userId });

      return { success: true };
    } catch (error) {
      logger.error('Failed to reactivate account', { error: error instanceof Error ? error.message : error, userId });
      throw error;
    }
  }

  /**
   * Get user orders
   */
  async getUserOrders(userId: string, options: {
    page: number;
    limit: number;
    status?: string;
  }) {
    try {
      const { page, limit, status } = options;
      const skip = (page - 1) * limit;

      // This would typically call the order service
      // For now, return mock data
      const orders = [];
      const total = 0;

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to get user orders', { error: error instanceof Error ? error.message : error, userId });
      throw error;
    }
  }

  /**
   * Get user reviews
   */
  async getUserReviews(userId: string, options: {
    page: number;
    limit: number;
  }) {
    try {
      const { page, limit } = options;
      const skip = (page - 1) * limit;

      // This would typically call the review service
      // For now, return mock data
      const reviews = [];
      const total = 0;

      return {
        reviews,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to get user reviews', { error: error instanceof Error ? error.message : error, userId });
      throw error;
    }
  }
}