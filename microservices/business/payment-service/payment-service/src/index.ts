/**
 * UltraMarket Payment Service
 * Professional payment processing with Click/Payme integration for Uzbekistan market
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

// Routes
import paymentRoutes from './routes/payment.routes';
import clickRoutes from './routes/click.routes';
import paymeRoutes from './routes/payme.routes';
import webhookRoutes from './routes/webhook.routes';
import healthRoutes from './routes/health.routes';

// Middleware
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logger.middleware';
import { securityMiddleware } from './middleware/security.middleware';

// Utils
import { logger } from './utils/logger';
import { validateEnv } from './config/env.validation';
import { swaggerSpec } from './config/swagger';
import { connectDB } from './config/database';

// Load environment variables
dotenv.config();

// Validate environment variables
validateEnv();

const app = express();
const PORT = process.env.PORT || 3006;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.ADMIN_URL || 'http://localhost:3001'
    ],
    credentials: true,
  })
);

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs (payment operations)
  message: {
    error: 'Too many payment requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(securityMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging
app.use(requestLogger);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/click', clickRoutes);
app.use('/api/v1/payme', paymeRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Close server
  server.close(() => {
    logger.info('HTTP server closed.');
  });

  try {
    // Close database connection
    await connectDB.close();
    logger.info('Database connection closed.');

    // Exit gracefully
    logger.info('Graceful shutdown completed.');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    // Don't exit immediately, give time for cleanup
    setTimeout(() => {
      logger.error('Forced shutdown due to error.');
      process.exit(1);
    }, 5000);
  }
};

// Start server
const server = app.listen(PORT, async () => {
  try {
    // Connect to database
    await connectDB();

    logger.info(`🚀 Payment Service running on port ${PORT}`);
    logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`📚 API Documentation: ${process.env.API_BASE_URL || `http://localhost:${PORT}`}/api-docs`);
    logger.info(`🔗 Health check: ${process.env.API_BASE_URL || `http://localhost:${PORT}`}/api/v1/health`);
    logger.info(`💳 Payments: ${process.env.API_BASE_URL || `http://localhost:${PORT}`}/api/v1/payments`);
    logger.info(`🔵 Click: ${process.env.API_BASE_URL || `http://localhost:${PORT}`}/api/v1/click`);
    logger.info(`🟢 Payme: ${process.env.API_BASE_URL || `http://localhost:${PORT}`}/api/v1/payme`);
    logger.info(`🔗 Webhooks: ${process.env.API_BASE_URL || `http://localhost:${PORT}`}/api/v1/webhooks`);
    logger.info(`💾 Database: PostgreSQL Connected`);
  } catch (error) {
    logger.error('Failed to start Payment Service:', error);
    // Don't exit immediately, log the error and continue
    logger.error('Service startup failed, but continuing...');
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit immediately, log and continue
  logger.error('Unhandled rejection logged, continuing...');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Log the error but don't exit immediately
  logger.error('Uncaught exception logged, attempting to continue...');
  // Only exit if it's a critical error
  if (error.message.includes('EADDRINUSE') || error.message.includes('ECONNREFUSED')) {
    logger.error('Critical error detected, shutting down...');
    process.exit(1);
  }
});

export default app;
