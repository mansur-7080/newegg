import { Router } from 'express';
import axios from 'axios';
import { logger } from '../../libs/shared/src/logger';
import { catchAsync } from '../middleware/error.middleware';
import { authRateLimit } from '../middleware/auth.middleware';

const router = Router();

// Microservices URLs
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';

// Apply rate limiting to auth routes
router.use(authRateLimit);

// Register new user
router.post('/register', catchAsync(async (req, res) => {
  logger.info('User registration attempt:', {
    email: req.body.email,
    ip: req.ip,
  });

  try {
    // Forward to auth microservice
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/register`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': req.ip,
        'User-Agent': req.get('User-Agent'),
      },
      timeout: 10000, // 10 second timeout
    });

    logger.info('User registered successfully:', {
      userId: response.data.data?.user?.id,
      email: req.body.email,
    });

    res.status(201).json(response.data);
  } catch (error) {
    logger.error('Registration failed:', {
      error: error.message,
      email: req.body.email,
      ip: req.ip,
    });

    if (error.response) {
      // Forward microservice error response
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_SERVICE_ERROR',
          message: 'Authentication service unavailable',
        },
      });
    }
  }
}));

// User login
router.post('/login', catchAsync(async (req, res) => {
  logger.info('User login attempt:', {
    email: req.body.email,
    ip: req.ip,
  });

  try {
    // Forward to auth microservice
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/login`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': req.ip,
        'User-Agent': req.get('User-Agent'),
      },
      timeout: 10000,
    });

    logger.info('User logged in successfully:', {
      userId: response.data.data?.user?.id,
      email: req.body.email,
    });

    // Set HTTP-only cookies for web browsers
    if (response.data.data?.tokens) {
      const { accessToken, refreshToken } = response.data.data.tokens;
      
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

    res.json(response.data);
  } catch (error) {
    logger.error('Login failed:', {
      error: error.message,
      email: req.body.email,
      ip: req.ip,
    });

    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_SERVICE_ERROR',
          message: 'Authentication service unavailable',
        },
      });
    }
  }
}));

// Refresh access token
router.post('/refresh', catchAsync(async (req, res) => {
  try {
    // Get refresh token from body or cookies
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token required',
        },
      });
    }

    // Forward to auth microservice
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/refresh`, 
      { refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': req.ip,
        },
        timeout: 10000,
      }
    );

    // Update cookies with new tokens
    if (response.data.data?.tokens) {
      const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
      
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    res.json(response.data);
  } catch (error) {
    logger.error('Token refresh failed:', {
      error: error.message,
      ip: req.ip,
    });

    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_SERVICE_ERROR',
          message: 'Authentication service unavailable',
        },
      });
    }
  }
}));

// User logout
router.post('/logout', catchAsync(async (req, res) => {
  try {
    // Get refresh token
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
    
    if (refreshToken) {
      // Forward to auth microservice to invalidate token
      try {
        await axios.post(`${AUTH_SERVICE_URL}/api/auth/logout`, 
          { refreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': req.headers.authorization,
            },
            timeout: 5000,
          }
        );
      } catch (error) {
        // Log but don't fail logout if service is down
        logger.warn('Auth service logout failed:', error.message);
      }
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    logger.info('User logged out');

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout failed:', error);

    // Clear cookies anyway
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }
}));

// Verify email
router.post('/verify-email', catchAsync(async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/verify-email`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization,
      },
      timeout: 10000,
    });

    res.json(response.data);
  } catch (error) {
    logger.error('Email verification failed:', error);

    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_SERVICE_ERROR',
          message: 'Authentication service unavailable',
        },
      });
    }
  }
}));

// Resend verification email
router.post('/resend-verification', catchAsync(async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/resend-verification`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization,
      },
      timeout: 10000,
    });

    res.json(response.data);
  } catch (error) {
    logger.error('Resend verification failed:', error);

    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_SERVICE_ERROR',
          message: 'Authentication service unavailable',
        },
      });
    }
  }
}));

// Forgot password
router.post('/forgot-password', catchAsync(async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/forgot-password`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': req.ip,
      },
      timeout: 10000,
    });

    res.json(response.data);
  } catch (error) {
    logger.error('Forgot password failed:', error);

    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_SERVICE_ERROR',
          message: 'Authentication service unavailable',
        },
      });
    }
  }
}));

// Reset password
router.post('/reset-password', catchAsync(async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/reset-password`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': req.ip,
      },
      timeout: 10000,
    });

    res.json(response.data);
  } catch (error) {
    logger.error('Reset password failed:', error);

    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_SERVICE_ERROR',
          message: 'Authentication service unavailable',
        },
      });
    }
  }
}));

// Change password (authenticated)
router.post('/change-password', catchAsync(async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/change-password`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization,
      },
      timeout: 10000,
    });

    res.json(response.data);
  } catch (error) {
    logger.error('Change password failed:', error);

    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_SERVICE_ERROR',
          message: 'Authentication service unavailable',
        },
      });
    }
  }
}));

// Get current user profile
router.get('/me', catchAsync(async (req, res) => {
  try {
    const response = await axios.get(`${AUTH_SERVICE_URL}/api/auth/me`, {
      headers: {
        'Authorization': req.headers.authorization,
      },
      timeout: 10000,
    });

    res.json(response.data);
  } catch (error) {
    logger.error('Get profile failed:', error);

    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_SERVICE_ERROR',
          message: 'Authentication service unavailable',
        },
      });
    }
  }
}));

export default router;