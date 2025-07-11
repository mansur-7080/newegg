/**
 * UltraMarket Auth Service
 * Professional authentication and authorization service
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { validateEnvironmentOnStartup } from '@ultramarket/shared/validation/environment';
import { logger } from '@ultramarket/shared/logging/logger';
import { errorHandler } from '@ultramarket/shared/middleware/error-handler';
import { securityMiddleware } from '@ultramarket/shared/middleware/security';
import authRoutes from './routes/authRoutes';

// Validate environment on startup
validateEnvironmentOnStartup('auth-service');

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;
const HOST = process.env.HOST ?? 'localhost';

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? '*',
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100', 10),
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use(securityMiddleware());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION ?? '1.0.0',
    environment: process.env.NODE_ENV ?? 'development',
    database: 'PostgreSQL',
  });
});

// API documentation endpoint
app.get('/api/v1', (req, res) => {
  res.status(200).json({
    message: 'Auth service is running',
    version: '1.0.0',
    endpoints: [
      'POST /api/v1/auth/register',
      'POST /api/v1/auth/login',
      'POST /api/v1/auth/refresh',
      'POST /api/v1/auth/logout',
      'GET /api/v1/auth/profile',
      'PUT /api/v1/auth/profile',
      'PUT /api/v1/auth/change-password',
      'POST /api/v1/auth/verify',
      'GET /api/v1/auth/stats',
    ],
    documentation: '/api/v1/docs',
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Start server
app.listen(PORT, HOST, () => {
  logger.info('🚀 Auth Service started successfully!', {
    port: PORT,
    host: HOST,
    environment: process.env.NODE_ENV ?? 'development',
    version: process.env.APP_VERSION ?? '1.0.0',
  });
  
  logger.info(`🌐 Server running on http://${HOST}:${PORT}`);
  logger.info(`🔗 Health check: http://${HOST}:${PORT}/health`);
  logger.info(`📚 API: http://${HOST}:${PORT}/api/v1`);
  logger.info(`🔐 Auth endpoints: http://${HOST}:${PORT}/api/v1/auth`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
