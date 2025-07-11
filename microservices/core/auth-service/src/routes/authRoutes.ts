import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();
const authController = new AuthController();

// Validation schemas
const registerSchema = {
  body: {
    email: { type: 'string', required: true, validate: 'email' },
    password: { type: 'string', required: true, minLength: 8 },
    firstName: { type: 'string', required: true, minLength: 2, maxLength: 50 },
    lastName: { type: 'string', required: true, minLength: 2, maxLength: 50 },
    username: { type: 'string', required: true, minLength: 3, maxLength: 30 },
    phoneNumber: { type: 'string', required: false },
  },
};

const loginSchema = {
  body: {
    email: { type: 'string', required: true, validate: 'email' },
    password: { type: 'string', required: true },
    rememberMe: { type: 'boolean', required: false },
    deviceFingerprint: { type: 'string', required: false },
  },
};

const refreshTokenSchema = {
  body: {
    refreshToken: { type: 'string', required: true },
  },
};

const updateProfileSchema = {
  body: {
    firstName: { type: 'string', required: false, minLength: 2, maxLength: 50 },
    lastName: { type: 'string', required: false, minLength: 2, maxLength: 50 },
    phoneNumber: { type: 'string', required: false },
    bio: { type: 'string', required: false, maxLength: 500 },
  },
};

const requestPasswordResetSchema = {
  body: {
    email: { type: 'string', required: true, validate: 'email' },
  },
};

const resetPasswordSchema = {
  body: {
    token: { type: 'string', required: true },
    newPassword: { type: 'string', required: true, minLength: 8 },
  },
};

// Public routes
router.post('/register', 
  rateLimiter('register', 5, 300), // 5 attempts per 5 minutes
  validateRequest(registerSchema),
  authController.register.bind(authController)
);

router.post('/login',
  rateLimiter('login', 10, 900), // 10 attempts per 15 minutes
  validateRequest(loginSchema),
  authController.login.bind(authController)
);

router.post('/refresh',
  rateLimiter('refresh', 20, 900), // 20 attempts per 15 minutes
  validateRequest(refreshTokenSchema),
  authController.refreshToken.bind(authController)
);

router.post('/logout',
  authenticateToken,
  authController.logout.bind(authController)
);

router.get('/verify-email/:token',
  authController.verifyEmail.bind(authController)
);

router.post('/request-password-reset',
  rateLimiter('password-reset', 3, 3600), // 3 attempts per hour
  validateRequest(requestPasswordResetSchema),
  authController.requestPasswordReset.bind(authController)
);

router.post('/reset-password',
  rateLimiter('password-reset', 3, 3600), // 3 attempts per hour
  validateRequest(resetPasswordSchema),
  authController.resetPassword.bind(authController)
);

// Protected routes
router.get('/profile',
  authenticateToken,
  authController.getProfile.bind(authController)
);

router.put('/profile',
  authenticateToken,
  validateRequest(updateProfileSchema),
  authController.updateProfile.bind(authController)
);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
  });
});

export default router;