import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '@newegg/common';
import { authController } from '../controllers/auth.controller';

const router = Router();

// Register new user
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('username').isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  body('firstName').optional().isLength({ min: 1, max: 50 }),
  body('lastName').optional().isLength({ min: 1, max: 50 }),
  body('phone').optional().isMobilePhone(),
  validateRequest
], authController.register);

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validateRequest
], authController.login);

// Refresh token
router.post('/refresh', [
  body('refreshToken').notEmpty(),
  validateRequest
], authController.refreshToken);

// Logout
router.post('/logout', authController.logout);

// Verify email
router.get('/verify-email/:token', authController.verifyEmail);

// Resend verification email
router.post('/resend-verification', [
  body('email').isEmail().normalizeEmail(),
  validateRequest
], authController.resendVerificationEmail);

// Forgot password
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
  validateRequest
], authController.forgotPassword);

// Reset password
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  validateRequest
], authController.resetPassword);

// Change password (authenticated)
router.post('/change-password', [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  validateRequest
], authController.changePassword);

// Get current user session
router.get('/me', authController.getCurrentUser);

export { router as authRoutes };