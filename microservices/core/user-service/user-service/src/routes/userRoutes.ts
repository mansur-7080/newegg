import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/userValidators';
import { UserRole } from '@ultramarket/common';

const router = Router();

// Public routes
router.post('/register', validateRequest(registerSchema), userController.register);
router.post('/login', validateRequest(loginSchema), userController.login);
router.post('/refresh-token', validateRequest(refreshTokenSchema), userController.refreshToken);
router.post(
  '/forgot-password',
  validateRequest(forgotPasswordSchema),
  userController.forgotPassword
);
router.post('/reset-password', validateRequest(resetPasswordSchema), userController.resetPassword);
router.get('/verify-email/:token', userController.verifyEmail);

// Protected routes
router.use(authenticate); // All routes below require authentication

router.get('/profile', userController.getProfile);
router.put('/profile', validateRequest(updateProfileSchema), userController.updateProfile);
router.delete('/account', userController.deleteAccount);
router.post('/logout', userController.logout);

// Admin routes
router.get('/admin/users', authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), userController.getAdminUsers);
router.get('/admin/users/:id', authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), userController.getAdminUserById);
router.put('/admin/users/:id', authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), userController.updateAdminUser);
router.delete('/admin/users/:id', authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), userController.deleteAdminUser);
router.post('/admin/users/:id/activate', authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), userController.activateUser);
router.post('/admin/users/:id/deactivate', authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), userController.deactivateUser);
router.get('/admin/statistics', authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), userController.getAdminStatistics);

export default router;
