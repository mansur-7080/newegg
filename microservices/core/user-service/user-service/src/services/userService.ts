import { User, UserRole, AuthProvider } from '@ultramarket/common';
import type { UserResponse } from '@ultramarket/common';
import {
  hashPassword,
  comparePassword,
  generateTokens,
  verifyRefreshToken,
  createSession,
  cache,
} from '@ultramarket/common';
import { ConflictError, NotFoundError, UnauthorizedError } from '@ultramarket/common';
import { userRepository } from '../repositories/userRepository';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import { randomBytes } from 'crypto';

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export class UserService {
  async registerUser(userData: CreateUserData) {
    const existingUser = await userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    const hashedPassword = await hashPassword(userData.password);

    const user: Omit<User, 'createdAt' | 'updatedAt'> = {
      id: uuidv4(),
      email: userData.email,
      username: userData.email.split('@')[0],
      firstName: userData.firstName,
      lastName: userData.lastName,
      phoneNumber: userData.phoneNumber,
      passwordHash: hashedPassword,
      role: UserRole.CUSTOMER,
      isActive: true,
      isEmailVerified: false,
      isPhoneVerified: false,
      loginAttempts: 0,
      mfaEnabled: false,
      authProvider: AuthProvider.LOCAL,
    };

    const createdUser = await userRepository.create(user);

    // Generate email verification token
    const verificationToken = randomBytes(32).toString('hex');
    await cache.setex(`email_verify:${verificationToken}`, 24 * 60 * 60, createdUser.id); // 24h expiry

    // Mock email sending (replace with nodemailer in prod)
    console.log(
      `[MOCK EMAIL] To: ${createdUser.email} | Verify: http://localhost:3001/api/v1/users/verify-email/${verificationToken}`
    );

    const tokens = await generateTokens({
      userId: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
    });

    const { passwordHash, ...userWithoutPassword } = createdUser;

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  async loginUser(email: string, password: string, req?: Request) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Update last login
    await userRepository.updateLastLogin(user.id);

    // Create session (deviceInfo and ip can be extracted from req)
    if (req) {
      await createSession(
        user.id,
        { userAgent: String(req.headers['user-agent'] || 'Unknown') },
        req.ip || ''
      );
    }

    const tokens = await generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      // sessionId: session?.sessionId,
    });

    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens,
      // sessionId: session?.sessionId,
    };
  }

  async getUserById(userId: string): Promise<UserResponse> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUser(userId: string, updateData: UpdateUserData): Promise<UserResponse> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updatedUser = await userRepository.update(userId, updateData);
    const { passwordHash, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async deleteUser(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await userRepository.delete(userId);
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = verifyRefreshToken(refreshToken);

      const user = await userRepository.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      // Optionally: check session in Redis
      // const session = await cache.getJson(`session:${decoded.sessionId}`);
      // if (!session || !session.isActive) {
      //   throw new UnauthorizedError('Session expired or invalid');
      // }

      const tokens = await generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
        // sessionId: decoded.sessionId,
      });

      return tokens;
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  async logoutUser(userId: string, accessToken?: string, sessionId?: string) {
    // Verify user exists
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Blacklist access token (if provided)
    if (accessToken) {
      // Blacklist for the remaining TTL (example: 15 min)
      await cache.setex(`blacklist:${accessToken}`, 15 * 60, '1');
    }

    // Remove session from Redis (if provided)
    if (sessionId) {
      await cache.del(`session:${sessionId}`);
      await cache.srem(`user_sessions:${userId}`, sessionId);
    }

    // Optionally: remove all refresh tokens for user
    // await cache.del(`user_sessions:${userId}`);
  }

  async verifyEmail(token: string) {
    // 1. Find userId by token in Redis
    const userId = await cache.get(`email_verify:${token}`);
    if (!userId) {
      throw new UnauthorizedError('Invalid or expired verification token');
    }
    // 2. Update user isEmailVerified
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    if (user.isEmailVerified) {
      throw new ConflictError('Email already verified');
    }
    await userRepository.update(userId, { isEmailVerified: true });
    // 3. Remove token from Redis
    await cache.del(`email_verify:${token}`);
    return true;
  }

  async forgotPassword(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not
      return;
    }
    // Generate password reset token
    const resetToken = randomBytes(32).toString('hex');
    await cache.setex(`reset_password:${resetToken}`, 60 * 60, user.id); // 1h expiry
    // Mock email sending (replace with nodemailer in prod)
    console.log(
      `[MOCK EMAIL] To: ${user.email} | Reset: http://localhost:3001/api/v1/users/reset-password?token=${resetToken}`
    );
  }

  async resetPassword(token: string, newPassword: string) {
    // 1. Find userId by token in Redis
    const userId = await cache.get(`reset_password:${token}`);
    if (!userId) {
      throw new UnauthorizedError('Invalid or expired reset token');
    }
    // 2. Hash new password
    const hashedPassword = await hashPassword(newPassword);
    // 3. Update user password
    await userRepository.update(userId, { passwordHash: hashedPassword });
    // 4. Invalidate token
    await cache.del(`reset_password:${token}`);
    return true;
  }
}

export const userService = new UserService();
