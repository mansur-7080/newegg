import { PrismaClient } from '@prisma/client';
import { logger } from '../../../../libs/shared/src/logging/logger';
import bcrypt from 'bcryptjs';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  avatar?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  preferredLanguage: 'UZ' | 'RU' | 'EN';
  preferredCurrency: 'UZS' | 'USD';
  marketingOptIn: boolean;
  twoFactorEnabled: boolean;
  addresses: UserAddress[];
  orderCount: number;
  totalSpent: number;
  loyaltyPoints: number;
  accountLevel: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

interface UserAddress {
  id: string;
  type: 'HOME' | 'WORK' | 'OTHER';
  title: string;
  firstName: string;
  lastName: string;
  phone: string;
  region: string;
  district: string;
  address: string;
  postalCode?: string;
  landmark?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  preferredLanguage?: 'UZ' | 'RU' | 'EN';
  preferredCurrency?: 'UZS' | 'USD';
  marketingOptIn?: boolean;
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface AddAddressRequest {
  type: 'HOME' | 'WORK' | 'OTHER';
  title: string;
  firstName: string;
  lastName: string;
  phone: string;
  region: string;
  district: string;
  address: string;
  postalCode?: string;
  landmark?: string;
  isDefault?: boolean;
}

export class RealUserProfileService {
  private db: PrismaClient;

  constructor() {
    this.db = new PrismaClient();
  }

  /**
   * Get complete user profile with all related data
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        include: {
          addresses: {
            orderBy: { isDefault: 'desc' },
          },
          orders: {
            select: {
              total: true,
              status: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Calculate user statistics
      const completedOrders = user.orders.filter(order => order.status === 'DELIVERED');
      const totalSpent = completedOrders.reduce((sum, order) => sum + order.total.toNumber(), 0);
      const loyaltyPoints = Math.floor(totalSpent / 1000); // 1 point per 1000 som
      const accountLevel = this.calculateAccountLevel(totalSpent, completedOrders.length);

      const profile: UserProfile = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth,
        gender: user.gender as any,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        preferredLanguage: (user.preferredLanguage as any) || 'UZ',
        preferredCurrency: (user.preferredCurrency as any) || 'UZS',
        marketingOptIn: user.marketingOptIn,
        twoFactorEnabled: user.twoFactorEnabled,
        addresses: user.addresses.map(this.mapPrismaAddressToUserAddress),
        orderCount: completedOrders.length,
        totalSpent,
        loyaltyPoints,
        accountLevel,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
      };

      return profile;
    } catch (error) {
      logger.error('Failed to get user profile', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * Update user profile information
   */
  async updateProfile(userId: string, updates: UpdateProfileRequest): Promise<UserProfile> {
    try {
      // Validate phone number if provided
      if (updates.phone && !/^\+998\d{9}$/.test(updates.phone.replace(/\s/g, ''))) {
        throw new Error('Invalid phone number format');
      }

      // Validate date of birth if provided
      if (updates.dateOfBirth) {
        const birthDate = new Date(updates.dateOfBirth);
        const minAge = new Date();
        minAge.setFullYear(minAge.getFullYear() - 13); // Minimum 13 years old

        if (birthDate > minAge) {
          throw new Error('User must be at least 13 years old');
        }
      }

      const updatedUser = await this.db.user.update({
        where: { id: userId },
        data: {
          ...updates,
          dateOfBirth: updates.dateOfBirth ? new Date(updates.dateOfBirth) : undefined,
          updatedAt: new Date(),
          // Reset phone verification if phone changed
          ...(updates.phone && { isPhoneVerified: false }),
        },
      });

      logger.info('User profile updated successfully', {
        userId,
        updatedFields: Object.keys(updates),
      });

      return this.getUserProfile(userId);
    } catch (error) {
      logger.error('Failed to update user profile', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        updates,
      });
      throw error;
    }
  }

  /**
   * Change user password with validation
   */
  async changePassword(userId: string, request: ChangePasswordRequest): Promise<void> {
    try {
      const { currentPassword, newPassword, confirmPassword } = request;

      // Validate new password
      if (newPassword !== confirmPassword) {
        throw new Error('New password and confirmation do not match');
      }

      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
        throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      }

      // Get current user
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: { password: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await this.db.user.update({
        where: { id: userId },
        data: {
          password: hashedNewPassword,
          updatedAt: new Date(),
        },
      });

      // Log password change
      await this.db.userActivity.create({
        data: {
          userId,
          action: 'PASSWORD_CHANGED',
          details: 'User changed their password',
          ipAddress: 'system', // Should be passed from request
          userAgent: 'system',
        },
      });

      logger.info('User password changed successfully', { userId });
    } catch (error) {
      logger.error('Failed to change user password', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * Add new address to user profile
   */
  async addAddress(userId: string, addressData: AddAddressRequest): Promise<UserAddress> {
    try {
      // Validate required fields
      if (!addressData.firstName || !addressData.lastName || !addressData.phone || 
          !addressData.region || !addressData.district || !addressData.address) {
        throw new Error('All required address fields must be provided');
      }

      // Validate phone number
      if (!/^\+998\d{9}$/.test(addressData.phone.replace(/\s/g, ''))) {
        throw new Error('Invalid phone number format');
      }

      // If this is set as default, remove default from other addresses
      if (addressData.isDefault) {
        await this.db.userAddress.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      // Create new address
      const newAddress = await this.db.userAddress.create({
        data: {
          userId,
          ...addressData,
          isDefault: addressData.isDefault || false,
        },
      });

      logger.info('Address added successfully', {
        userId,
        addressId: newAddress.id,
        type: addressData.type,
      });

      return this.mapPrismaAddressToUserAddress(newAddress);
    } catch (error) {
      logger.error('Failed to add address', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        addressData,
      });
      throw error;
    }
  }

  /**
   * Update existing address
   */
  async updateAddress(userId: string, addressId: string, updates: Partial<AddAddressRequest>): Promise<UserAddress> {
    try {
      // Verify address belongs to user
      const existingAddress = await this.db.userAddress.findFirst({
        where: { id: addressId, userId },
      });

      if (!existingAddress) {
        throw new Error('Address not found or does not belong to user');
      }

      // Validate phone number if provided
      if (updates.phone && !/^\+998\d{9}$/.test(updates.phone.replace(/\s/g, ''))) {
        throw new Error('Invalid phone number format');
      }

      // If setting as default, remove default from other addresses
      if (updates.isDefault) {
        await this.db.userAddress.updateMany({
          where: { userId, id: { not: addressId } },
          data: { isDefault: false },
        });
      }

      // Update address
      const updatedAddress = await this.db.userAddress.update({
        where: { id: addressId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });

      logger.info('Address updated successfully', {
        userId,
        addressId,
        updatedFields: Object.keys(updates),
      });

      return this.mapPrismaAddressToUserAddress(updatedAddress);
    } catch (error) {
      logger.error('Failed to update address', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        addressId,
        updates,
      });
      throw error;
    }
  }

  /**
   * Delete user address
   */
  async deleteAddress(userId: string, addressId: string): Promise<void> {
    try {
      // Verify address belongs to user
      const existingAddress = await this.db.userAddress.findFirst({
        where: { id: addressId, userId },
      });

      if (!existingAddress) {
        throw new Error('Address not found or does not belong to user');
      }

      // Check if this is the only address
      const addressCount = await this.db.userAddress.count({
        where: { userId },
      });

      if (addressCount === 1) {
        throw new Error('Cannot delete the only address. Please add another address first.');
      }

      // Delete address
      await this.db.userAddress.delete({
        where: { id: addressId },
      });

      // If deleted address was default, set another address as default
      if (existingAddress.isDefault) {
        const firstAddress = await this.db.userAddress.findFirst({
          where: { userId },
        });

        if (firstAddress) {
          await this.db.userAddress.update({
            where: { id: firstAddress.id },
            data: { isDefault: true },
          });
        }
      }

      logger.info('Address deleted successfully', {
        userId,
        addressId,
        wasDefault: existingAddress.isDefault,
      });
    } catch (error) {
      logger.error('Failed to delete address', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        addressId,
      });
      throw error;
    }
  }

  /**
   * Upload and update user avatar
   */
  async updateAvatar(userId: string, avatarFile: Buffer, fileName: string): Promise<string> {
    try {
      // Validate file type
      const allowedTypes = ['.jpg', '.jpeg', '.png', '.webp'];
      const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
      
      if (!allowedTypes.includes(fileExtension)) {
        throw new Error('Invalid file type. Only JPG, PNG, and WebP are allowed.');
      }

      // Validate file size (max 5MB)
      if (avatarFile.length > 5 * 1024 * 1024) {
        throw new Error('File size too large. Maximum 5MB allowed.');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const newFileName = `avatar_${userId}_${timestamp}_${randomString}${fileExtension}`;

      // In production, upload to S3/CloudFlare/etc.
      // For now, simulate upload
      const avatarUrl = `/uploads/avatars/${newFileName}`;

      // Update user avatar URL
      await this.db.user.update({
        where: { id: userId },
        data: {
          avatar: avatarUrl,
          updatedAt: new Date(),
        },
      });

      logger.info('User avatar updated successfully', {
        userId,
        fileName: newFileName,
        fileSize: avatarFile.length,
      });

      return avatarUrl;
    } catch (error) {
      logger.error('Failed to update user avatar', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        fileName,
      });
      throw error;
    }
  }

  /**
   * Get user activity history
   */
  async getUserActivity(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    activities: any[];
    total: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [activities, total] = await Promise.all([
        this.db.userActivity.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.db.userActivity.count({
          where: { userId },
        }),
      ]);

      return {
        activities,
        total,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Failed to get user activity', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateAccount(userId: string, reason?: string): Promise<void> {
    try {
      await this.db.$transaction(async (prisma) => {
        // Mark user as inactive
        await prisma.user.update({
          where: { id: userId },
          data: {
            isActive: false,
            deactivatedAt: new Date(),
            deactivationReason: reason,
          },
        });

        // Cancel pending orders
        await prisma.order.updateMany({
          where: {
            userId,
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
          data: {
            status: 'CANCELLED',
            updatedAt: new Date(),
          },
        });

        // Clear cart
        await prisma.cartItem.deleteMany({
          where: { userId },
        });

        // Log deactivation
        await prisma.userActivity.create({
          data: {
            userId,
            action: 'ACCOUNT_DEACTIVATED',
            details: `Account deactivated. Reason: ${reason || 'Not specified'}`,
            ipAddress: 'system',
            userAgent: 'system',
          },
        });
      });

      logger.info('User account deactivated', {
        userId,
        reason,
      });
    } catch (error) {
      logger.error('Failed to deactivate user account', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        reason,
      });
      throw error;
    }
  }

  /**
   * Calculate account level based on spending and order count
   */
  private calculateAccountLevel(totalSpent: number, orderCount: number): 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' {
    if (totalSpent >= 10000000 && orderCount >= 50) return 'PLATINUM'; // 10M som + 50 orders
    if (totalSpent >= 5000000 && orderCount >= 25) return 'GOLD';      // 5M som + 25 orders
    if (totalSpent >= 2000000 && orderCount >= 10) return 'SILVER';    // 2M som + 10 orders
    return 'BRONZE';
  }

  /**
   * Map Prisma address to UserAddress interface
   */
  private mapPrismaAddressToUserAddress(prismaAddress: any): UserAddress {
    return {
      id: prismaAddress.id,
      type: prismaAddress.type,
      title: prismaAddress.title,
      firstName: prismaAddress.firstName,
      lastName: prismaAddress.lastName,
      phone: prismaAddress.phone,
      region: prismaAddress.region,
      district: prismaAddress.district,
      address: prismaAddress.address,
      postalCode: prismaAddress.postalCode,
      landmark: prismaAddress.landmark,
      isDefault: prismaAddress.isDefault,
      createdAt: prismaAddress.createdAt,
      updatedAt: prismaAddress.updatedAt,
    };
  }
}