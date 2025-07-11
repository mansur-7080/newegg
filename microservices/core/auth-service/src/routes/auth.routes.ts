/**
 * UltraMarket Auth Service - Authentication Routes
 * Professional authentication endpoints with middleware
 */

import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';
import { validateRequest } from '@ultramarket/shared/validation/request-validator';
import { authSchemas } from '../schemas/auth.schemas';

const router = Router();
const authController = new AuthController();

// Apply rate limiting to all auth routes
router.use(rateLimitMiddleware);

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res, next) => {
  try {
    await authController.register(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', async (req, res, next) => {
  try {
    await authController.login(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', async (req, res, next) => {
  try {
    await authController.refreshToken(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    await authController.logout(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authMiddleware, async (req, res, next) => {
  try {
    await authController.getProfile(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authMiddleware, async (req, res, next) => {
  try {
    await authController.updateProfile(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', authMiddleware, async (req, res, next) => {
  try {
    await authController.changePassword(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/forgot-password', async (req, res, next) => {
  try {
    await authController.forgotPassword(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
router.post('/reset-password', async (req, res, next) => {
  try {
    await authController.resetPassword(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post('/verify-email', async (req, res, next) => {
  try {
    await authController.verifyEmail(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/auth/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', async (req, res, next) => {
  try {
    await authController.healthCheck(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;