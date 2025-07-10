import { User } from '@ultramarket/common';
import { PrismaClient } from '@prisma/client';
import { AuthProvider } from '@ultramarket/common';

const prisma = new PrismaClient();

// Utility function to convert null to undefined
const nullToUndefined = <T>(value: T | null): T | undefined => {
  return value === null ? undefined : value;
};

// Transform Prisma user to our User interface
const transformUser = (user: any): User => ({
  id: user.id,
  email: user.email,
  username: user.username,
  passwordHash: user.passwordHash,
  firstName: user.firstName,
  lastName: user.lastName,
  phoneNumber: nullToUndefined(user.phoneNumber),
  role: user.role as any,
  isActive: user.isActive,
  isEmailVerified: user.isEmailVerified,
  profileImage: nullToUndefined(user.profileImage),
  bio: nullToUndefined(user.bio),
  lastLoginAt: nullToUndefined(user.lastLoginAt),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  isPhoneVerified: user.isPhoneVerified ?? false,
  loginAttempts: user.loginAttempts ?? 0,
  mfaEnabled: user.mfaEnabled ?? false,
  authProvider: user.authProvider ?? AuthProvider.LOCAL,
});

export interface UserRepository {
  create(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  update(id: string, data: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
  findAll(options?: {
    page?: number;
    limit?: number;
    role?: string;
    isActive?: boolean;
  }): Promise<{ users: User[]; total: number }>;
  updateLastLogin(id: string): Promise<void>;
  findByEmailOrUsername(emailOrUsername: string): Promise<User | null>;
}

class PrismaUserRepository implements UserRepository {
  async create(userData: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
    try {
      const user = await prisma.user.create({
        data: {
          id: userData.id,
          email: userData.email,
          username: userData.username,
          passwordHash: userData.passwordHash,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phoneNumber: userData.phoneNumber,
          role: userData.role,
          isActive: userData.isActive,
          isEmailVerified: userData.isEmailVerified,
          profileImage: userData.profileImage,
          bio: userData.bio,
        },
      });

      return transformUser(user);
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          addresses: true,
        },
      });

      if (!user) return null;

      return transformUser(user);
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw new Error('Failed to find user');
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) return null;

      return transformUser(user);
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw new Error('Failed to find user');
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { username },
      });

      if (!user) return null;

      return transformUser(user);
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw new Error('Failed to find user');
    }
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    try {
      const updateData: any = {};

      if (data.email) updateData.email = data.email;
      if (data.username) updateData.username = data.username;
      if (data.passwordHash) updateData.passwordHash = data.passwordHash;
      if (data.firstName) updateData.firstName = data.firstName;
      if (data.lastName) updateData.lastName = data.lastName;
      if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
      if (data.role) updateData.role = data.role;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.isEmailVerified !== undefined) updateData.isEmailVerified = data.isEmailVerified;
      if (data.profileImage !== undefined) updateData.profileImage = data.profileImage;
      if (data.bio !== undefined) updateData.bio = data.bio;

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
      });

      return transformUser(user);
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id },
        data: { isActive: false }, // Soft delete
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  async findAll(
    options: {
      page?: number;
      limit?: number;
      role?: string;
      isActive?: boolean;
    } = {}
  ): Promise<{ users: User[]; total: number }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (options.role) where.role = options.role;
      if (options.isActive !== undefined) where.isActive = options.isActive;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      const transformedUsers: User[] = users.map(transformUser);

      return { users: transformedUsers, total };
    } catch (error) {
      console.error('Error finding all users:', error);
      throw new Error('Failed to find users');
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id },
        data: { lastLoginAt: new Date() },
      });
    } catch (error) {
      console.error('Error updating last login:', error);
      throw new Error('Failed to update last login');
    }
  }

  async findByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
        },
      });

      if (!user) return null;

      return transformUser(user);
    } catch (error) {
      console.error('Error finding user by email or username:', error);
      throw new Error('Failed to find user');
    }
  }
}

// Use Prisma repository for production
export const userRepository: UserRepository = new PrismaUserRepository();
