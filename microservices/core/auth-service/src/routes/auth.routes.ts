/**
 * Authentication Routes
 * Professional API routes with comprehensive error handling
 */

import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken, requireCustomer, requireAdmin } from '../middleware/auth.middleware';
import { 
  registrationRateLimit, 
  loginRateLimit, 
  passwordResetRateLimit 
} from '../middleware/rate-limiter';
import { logger } from '@ultramarket/shared/logging/logger';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', 
  registrationRateLimit(),
  async (req, res, next) => {
    try {
      await AuthController.register(req, res, next);
    } catch (error) {
      logger.error('Registration route error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.ip
      });
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', 
  loginRateLimit(),
  async (req, res, next) => {
    try {
      await AuthController.login(req, res, next);
    } catch (error) {
      logger.error('Login route error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.ip
      });
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', 
  async (req, res, next) => {
    try {
      await AuthController.refreshToken(req, res, next);
    } catch (error) {
      logger.error('Token refresh route error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.ip
      });
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', 
  async (req, res, next) => {
    try {
      await AuthController.logout(req, res, next);
    } catch (error) {
      logger.error('Logout route error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.ip
      });
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', 
  authenticateToken,
  requireCustomer,
  async (req, res, next) => {
    try {
      await AuthController.getProfile(req, res, next);
    } catch (error) {
      logger.error('Get profile route error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.ip
      });
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', 
  authenticateToken,
  requireCustomer,
  async (req, res, next) => {
    try {
      await AuthController.updateProfile(req, res, next);
    } catch (error) {
      logger.error('Update profile route error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.ip
      });
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', 
  authenticateToken,
  requireCustomer,
  async (req, res, next) => {
    try {
      await AuthController.changePassword(req, res, next);
    } catch (error) {
      logger.error('Change password route error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.ip
      });
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', 
  passwordResetRateLimit(),
  async (req, res, next) => {
    try {
      await AuthController.forgotPassword(req, res, next);
    } catch (error) {
      logger.error('Forgot password route error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.ip
      });
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', 
  async (req, res, next) => {
    try {
      await AuthController.resetPassword(req, res, next);
    } catch (error) {
      logger.error('Reset password route error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.ip
      });
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/auth/verify-email/:token
 * @desc    Verify email address
 * @access  Public
 */
router.get('/verify-email/:token', 
  async (req, res, next) => {
    try {
      await AuthController.verifyEmail(req, res, next);
    } catch (error) {
      logger.error('Verify email route error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.ip
      });
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/auth/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth service is healthy',
    timestamp: new Date().toISOString(),
    service: 'auth-service'
  });
});

/**
 * @route   GET /api/v1/auth/status
 * @desc    Get authentication status
 * @access  Public
 */
router.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth service is running',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /api/v1/auth/endpoints
 * @desc    Get available endpoints
 * @access  Public
 */
router.get('/endpoints', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Available authentication endpoints',
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/auth/register',
        description: 'Register a new user',
        access: 'Public'
      },
      {
        method: 'POST',
        path: '/api/v1/auth/login',
        description: 'Login user',
        access: 'Public'
      },
      {
        method: 'POST',
        path: '/api/v1/auth/refresh',
        description: 'Refresh access token',
        access: 'Public'
      },
      {
        method: 'POST',
        path: '/api/v1/auth/logout',
        description: 'Logout user',
        access: 'Public'
      },
      {
        method: 'GET',
        path: '/api/v1/auth/profile',
        description: 'Get user profile',
        access: 'Private'
      },
      {
        method: 'PUT',
        path: '/api/v1/auth/profile',
        description: 'Update user profile',
        access: 'Private'
      },
      {
        method: 'PUT',
        path: '/api/v1/auth/change-password',
        description: 'Change user password',
        access: 'Private'
      },
      {
        method: 'POST',
        path: '/api/v1/auth/forgot-password',
        description: 'Request password reset',
        access: 'Public'
      },
      {
        method: 'POST',
        path: '/api/v1/auth/reset-password',
        description: 'Reset password with token',
        access: 'Public'
      },
      {
        method: 'GET',
        path: '/api/v1/auth/verify-email/:token',
        description: 'Verify email address',
        access: 'Public'
      }
    ]
  });
});

export default router;