import { Router } from 'express';
import { AuthController, 
  registerValidation, 
  loginValidation, 
  refreshTokenValidation, 
  logoutValidation,
  updateProfileValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation 
} from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Public routes
router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);
router.post('/refresh', refreshTokenValidation, AuthController.refreshToken);
router.post('/logout', logoutValidation, AuthController.logout);
router.post('/forgot-password', forgotPasswordValidation, AuthController.forgotPassword);
router.post('/reset-password', resetPasswordValidation, AuthController.resetPassword);
router.get('/verify-email/:token', AuthController.verifyEmail);

// Protected routes
router.get('/profile', authenticateToken, AuthController.getProfile);
router.put('/profile', authenticateToken, updateProfileValidation, AuthController.updateProfile);
router.put('/change-password', authenticateToken, changePasswordValidation, AuthController.changePassword);

export default router;