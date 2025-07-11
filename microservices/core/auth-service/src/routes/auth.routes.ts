import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validationMiddleware } from '../middleware/validation.middleware';
import { body, param } from 'express-validator';

const router = Router();

// Validation schemas
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('phone').optional().isMobilePhone('any').withMessage('Valid phone number is required'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const refreshTokenValidation = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];

const updateProfileValidation = [
  body('firstName').optional().trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
  body('lastName').optional().trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('phone').optional().isMobilePhone('any').withMessage('Valid phone number is required'),
];

const passwordResetRequestValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const passwordResetValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];

const emailVerificationValidation = [
  param('token').notEmpty().withMessage('Verification token is required'),
];

// Public routes
router.post('/register', registerValidation, validationMiddleware, AuthController.register);
router.post('/login', loginValidation, validationMiddleware, AuthController.login);
router.post('/refresh-token', refreshTokenValidation, validationMiddleware, AuthController.refreshToken);
router.post('/password-reset/request', passwordResetRequestValidation, validationMiddleware, AuthController.requestPasswordReset);
router.post('/password-reset', passwordResetValidation, validationMiddleware, AuthController.resetPassword);
router.get('/verify-email/:token', emailVerificationValidation, validationMiddleware, AuthController.verifyEmail);

// Protected routes
router.post('/logout', authMiddleware, AuthController.logout);
router.get('/profile', authMiddleware, AuthController.getProfile);
router.put('/profile', authMiddleware, updateProfileValidation, validationMiddleware, AuthController.updateProfile);
router.post('/change-password', authMiddleware, changePasswordValidation, validationMiddleware, AuthController.changePassword);

export default router;