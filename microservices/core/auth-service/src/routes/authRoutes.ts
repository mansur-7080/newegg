import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { 
  authenticateToken, 
  requireCustomer, 
  validateRefreshToken 
} from '../middleware/authMiddleware';
import { validatePasswordChange } from '../validators/authValidator';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', AuthController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', AuthController.login);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', validateRefreshToken, AuthController.refreshToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticateToken, AuthController.logout);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, requireCustomer, AuthController.getProfile);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticateToken, requireCustomer, AuthController.updateProfile);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', authenticateToken, requireCustomer, AuthController.changePassword);

/**
 * @route   POST /api/v1/auth/request-password-reset
 * @desc    Request password reset
 * @access  Public
 */
router.post('/request-password-reset', AuthController.requestPasswordReset);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', AuthController.resetPassword);

/**
 * @route   GET /api/v1/auth/verify-email/:token
 * @desc    Verify email with token
 * @access  Public
 */
router.get('/verify-email/:token', AuthController.verifyEmail);

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post('/resend-verification', AuthController.resendVerification);

export default router;