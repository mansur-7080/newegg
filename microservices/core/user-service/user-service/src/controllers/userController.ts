import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@ultramarket/common';
import * as userService from '../services/userService';
import { HTTP_STATUS } from '@ultramarket/common';
import { UserRole } from '@ultramarket/common';

export class UserController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName, phoneNumber } = req.body;

      const result = await userService.registerUser({
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      const result = await userService.loginUser(email, password);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const user = await userService.getUserById(userId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const updateData = req.body;

      const updatedUser = await userService.updateUser(userId, updateData);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      await userService.deleteUser(userId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      const result = await userService.refreshToken(refreshToken);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      await userService.logoutUser(userId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;

      await userService.verifyEmail(token);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      await userService.forgotPassword(email);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Password reset instructions sent to email',
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;

      await userService.resetPassword(token, password);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin functions
  async getAdminUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, search, role, isActive } = req.query;
      
      const users = await userService.getAdminUsers({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        role: role as UserRole,
        isActive: isActive === 'true'
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAdminUserById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const user = await userService.getAdminUserById(id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAdminUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const user = await userService.updateAdminUser(id, updateData);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'User updated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAdminUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      await userService.deleteAdminUser(id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async activateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      await userService.activateUser(id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'User activated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async deactivateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      await userService.deactivateUser(id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'User deactivated successfully',
      });
    } catch (next: NextFunction) {
      next(error);
    }
  }

  async getAdminStatistics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const statistics = await userService.getAdminStatistics();

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
