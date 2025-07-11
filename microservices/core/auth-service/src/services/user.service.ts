/**
 * UltraMarket Auth Service - User Service
 * Professional user management operations
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@ultramarket/shared/logging/logger';
import { ApiError } from '@ultramarket/shared/errors/api-error';

const prisma = new PrismaClient();

export interface UserProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: Date;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  lastLogoutAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  profile?: UserProfile;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: Date;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

export class UserService {
  /**
   * Find user by ID
   */
  async findById(userId: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
        },
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        lastLoginAt: user.lastLoginAt,
        lastLogoutAt: user.lastLogoutAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profile: user.profile ? {
          id: user.profile.id,
          userId: user.profile.userId,
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          phone: user.profile.phone,
          avatar: user.profile.avatar,
          dateOfBirth: user.profile.dateOfBirth,
          address: user.profile.address,
          city: user.profile.city,
          country: user.profile.country,
          postalCode: user.profile.postalCode,
          createdAt: user.profile.createdAt,
          updatedAt: user.profile.updatedAt,
        } : undefined,
      };
    } catch (error) {
      logger.error('Failed to find user by ID', {
        error: error.message,
        userId,
        operation: 'find_user_by_id',
      });
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          profile: true,
        },
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        lastLoginAt: user.lastLoginAt,
        lastLogoutAt: user.lastLogoutAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profile: user.profile ? {
          id: user.profile.id,
          userId: user.profile.userId,
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          phone: user.profile.phone,
          avatar: user.profile.avatar,
          dateOfBirth: user.profile.dateOfBirth,
          address: user.profile.address,
          city: user.profile.city,
          country: user.profile.country,
          postalCode: user.profile.postalCode,
          createdAt: user.profile.createdAt,
          updatedAt: user.profile.updatedAt,
        } : undefined,
      };
    } catch (error) {
      logger.error('Failed to find user by email', {
        error: error.message,
        email,
        operation: 'find_user_by_email',
      });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: UpdateProfileData): Promise<User> {
    try {
      // Update user basic info
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          updatedAt: new Date(),
        },
        include: {
          profile: true,
        },
      });

      // Update or create user profile
      const profile = await prisma.userProfile.upsert({
        where: { userId },
        update: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          avatar: data.avatar,
          dateOfBirth: data.dateOfBirth,
          address: data.address,
          city: data.city,
          country: data.country,
          postalCode: data.postalCode,
          updatedAt: new Date(),
        },
        create: {
          userId,
          firstName: data.firstName || user.firstName,
          lastName: data.lastName || user.lastName,
          phone: data.phone,
          avatar: data.avatar,
          dateOfBirth: data.dateOfBirth,
          address: data.address,
          city: data.city,
          country: data.country,
          postalCode: data.postalCode,
        },
      });

      logger.info('User profile updated successfully', {
        userId,
        operation: 'update_user_profile',
      });

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        lastLoginAt: user.lastLoginAt,
        lastLogoutAt: user.lastLogoutAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profile: {
          id: profile.id,
          userId: profile.userId,
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
          avatar: profile.avatar,
          dateOfBirth: profile.dateOfBirth,
          address: profile.address,
          city: profile.city,
          country: profile.country,
          postalCode: profile.postalCode,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        },
      };
    } catch (error) {
      logger.error('Failed to update user profile', {
        error: error.message,
        userId,
        operation: 'update_user_profile',
      });
      throw error;
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.info('Last login updated', {
        userId,
        operation: 'update_last_login',
      });
    } catch (error) {
      logger.error('Failed to update last login', {
        error: error.message,
        userId,
        operation: 'update_last_login',
      });
      throw error;
    }
  }

  /**
   * Update last logout timestamp
   */
  async updateLastLogout(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastLogoutAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.info('Last logout updated', {
        userId,
        operation: 'update_last_logout',
      });
    } catch (error) {
      logger.error('Failed to update last logout', {
        error: error.message,
        userId,
        operation: 'update_last_logout',
      });
      throw error;
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      logger.info('User account deactivated', {
        userId,
        operation: 'deactivate_user',
      });
    } catch (error) {
      logger.error('Failed to deactivate user', {
        error: error.message,
        userId,
        operation: 'deactivate_user',
      });
      throw error;
    }
  }

  /**
   * Activate user account
   */
  async activateUser(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: true,
          updatedAt: new Date(),
        },
      });

      logger.info('User account activated', {
        userId,
        operation: 'activate_user',
      });
    } catch (error) {
      logger.error('Failed to activate user', {
        error: error.message,
        userId,
        operation: 'activate_user',
      });
      throw error;
    }
  }

  /**
   * Change user role
   */
  async changeUserRole(userId: string, newRole: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          role: newRole,
          updatedAt: new Date(),
        },
      });

      logger.info('User role changed', {
        userId,
        newRole,
        operation: 'change_user_role',
      });
    } catch (error) {
      logger.error('Failed to change user role', {
        error: error.message,
        userId,
        newRole,
        operation: 'change_user_role',
      });
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    newUsersThisMonth: number;
  }> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [totalUsers, activeUsers, verifiedUsers, newUsersThisMonth] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isEmailVerified: true } }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: startOfMonth,
            },
          },
        }),
      ]);

      return {
        totalUsers,
        activeUsers,
        verifiedUsers,
        newUsersThisMonth,
      };
    } catch (error) {
      logger.error('Failed to get user statistics', {
        error: error.message,
        operation: 'get_user_stats',
      });
      throw error;
    }
  }

  /**
   * Search users
   */
  async searchUsers(query: string, limit = 10, offset = 0): Promise<User[]> {
    try {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          profile: true,
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      });

      return users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        lastLoginAt: user.lastLoginAt,
        lastLogoutAt: user.lastLogoutAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profile: user.profile ? {
          id: user.profile.id,
          userId: user.profile.userId,
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          phone: user.profile.phone,
          avatar: user.profile.avatar,
          dateOfBirth: user.profile.dateOfBirth,
          address: user.profile.address,
          city: user.profile.city,
          country: user.profile.country,
          postalCode: user.profile.postalCode,
          createdAt: user.profile.createdAt,
          updatedAt: user.profile.updatedAt,
        } : undefined,
      }));
    } catch (error) {
      logger.error('Failed to search users', {
        error: error.message,
        query,
        operation: 'search_users',
      });
      throw error;
    }
  }

  /**
   * Delete user account
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      // Soft delete - mark as inactive instead of hard delete
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          email: `deleted_${Date.now()}_${userId}@deleted.com`,
          updatedAt: new Date(),
        },
      });

      logger.info('User account deleted', {
        userId,
        operation: 'delete_user',
      });
    } catch (error) {
      logger.error('Failed to delete user', {
        error: error.message,
        userId,
        operation: 'delete_user',
      });
      throw error;
    }
  }
}