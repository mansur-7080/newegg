import { UserService } from '../services/user.service';
import { prismaMock } from '../utils/prismaMock';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const hashedPassword = 'hashedPassword123';
      const mockUser = {
        id: '1',
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockBcrypt.hash.mockResolvedValue(hashedPassword);
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(mockUser);

      const result = await userService.register(userData);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: userData.email },
      });
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: 'user',
        },
      });
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        isActive: mockUser.isActive,
      });
    });

    it('should throw error if user already exists', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const existingUser = {
        id: '1',
        email: userData.email,
        password: 'hashedPassword',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.findUnique.mockResolvedValue(existingUser);

      await expect(userService.register(userData)).rejects.toThrow(
        'User with this email already exists'
      );
    });

    it('should throw error if password is too weak', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        firstName: 'John',
        lastName: 'Doe',
      };

      await expect(userService.register(userData)).rejects.toThrow(
        'Password must be at least 6 characters long'
      );
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: '1',
        email: loginData.email,
        password: 'hashedPassword123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockToken = 'mockJwtToken';
      const mockRefreshToken = 'mockRefreshToken';

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJwt.sign.mockReturnValueOnce(mockToken).mockReturnValueOnce(mockRefreshToken);

      const result = await userService.login(loginData);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginData.email },
      });
      expect(mockBcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
      expect(mockJwt.sign).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
          isActive: mockUser.isActive,
        },
        token: mockToken,
        refreshToken: mockRefreshToken,
      });
    });

    it('should throw error if user not found', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(userService.login(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error if password is incorrect', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: '1',
        email: loginData.email,
        password: 'hashedPassword123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(userService.login(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error if user is not active', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: '1',
        email: loginData.email,
        password: 'hashedPassword123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);

      await expect(userService.login(loginData)).rejects.toThrow('User account is deactivated');
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const userId = '1';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        password: 'hashedPassword',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await userService.getUserById(userId);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        isActive: mockUser.isActive,
      });
    });

    it('should throw error if user not found', async () => {
      const userId = 'nonexistent';

      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(userService.getUserById(userId)).rejects.toThrow('User not found');
    });
  });

  describe('updateUser', () => {
    it('should successfully update user', async () => {
      const userId = '1';
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const existingUser = {
        id: userId,
        email: 'test@example.com',
        password: 'hashedPassword',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedUser = {
        ...existingUser,
        firstName: updateData.firstName,
        lastName: updateData.lastName,
      };

      prismaMock.user.findUnique.mockResolvedValue(existingUser);
      prismaMock.user.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUser(userId, updateData);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData,
      });
      expect(result).toEqual({
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
      });
    });
  });

  describe('deleteUser', () => {
    it('should successfully delete user', async () => {
      const userId = '1';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        password: 'hashedPassword',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.delete.mockResolvedValue(mockUser);

      const result = await userService.deleteUser(userId);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).toEqual({ message: 'User deleted successfully' });
    });
  });
});
