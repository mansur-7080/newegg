import { Router } from 'express';
import { authenticate, authorize, validateRequest } from '@newegg/common';
import { userSchemas } from '@newegg/common';
import { AuthController } from '../controllers/auth';
import { UserRole } from '@newegg/common';

const router = Router();
const authController = new AuthController();

// Register new user
router.post('/register', 
  validateRequest(userSchemas.register),
  authController.register
);

// Login user
router.post('/login',
  validateRequest(userSchemas.login),
  authController.login
);

// Refresh access token
router.post('/refresh',
  authController.refreshToken
);

// Logout user
router.post('/logout',
  authenticate,
  authController.logout
);

// Verify email
router.post('/verify-email',
  validateRequest(userSchemas.verifyEmail),
  authController.verifyEmail
);

// Request password reset
router.post('/forgot-password',
  validateRequest(userSchemas.resetPassword),
  authController.forgotPassword
);

// Reset password with token
router.post('/reset-password',
  validateRequest(userSchemas.resetPassword),
  authController.resetPassword
);

// Change password (authenticated)
router.post('/change-password',
  authenticate,
  validateRequest(userSchemas.changePassword),
  authController.changePassword
);

// Get current user session
router.get('/me',
  authenticate,
  authController.getCurrentUser
);

// Revoke all sessions (admin only)
router.post('/revoke-sessions/:userId',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  authController.revokeAllSessions
);

// Get user sessions (admin only)
router.get('/sessions/:userId',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  authController.getUserSessions
);

export { router as authRoutes };