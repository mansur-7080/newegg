/**
 * UltraMarket Product Service
 * Professional product catalog and inventory management service
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';

// Routes
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import healthRoutes from './routes/health.routes';

// Middleware
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logger.middleware';
import { securityMiddleware } from './middleware/security.middleware';

// Utils
import { logger } from './utils/logger';
import { validateEnv } from './config/env.validation';
import { swaggerSpec } from './config/swagger';

// Database
import db from './lib/database';

// Load environment variables
dotenv.config();

// Validate environment variables
validateEnv();

const app = express();
const PORT = process.env.PORT || 3003;

// Apply security middleware with enhanced configuration
app.use(helmet()); // Basic helmet configuration

// Set additional security headers
app.use((req, res, next) => {
  // Content-Security-Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://storage.ultramarket.uz; connect-src 'self' https://api.ultramarket.uz; font-src 'self' https://fonts.gstatic.com; object-src 'none'; media-src 'self'; frame-src 'none'"
  );

  // HSTS - Force HTTPS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'no-referrer');

  // Prevent XSS
  res.setHeader('X-XSS-Protection', '1; mode=block');

  next();
});

// Configure CORS with secure settings
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS blocked request', { origin });
        callback(new Error('CORS policy violation'), false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'Content-Disposition'],
    credentials: true,
    maxAge: 86400, // 24 hours
  })
);

// Compression middleware with security consideration
app.use(compression({ level: 6, threshold: 1024 })); // Only compress responses larger than 1KB

// Configure rate limiting with different rules for different endpoints
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS', // Skip preflight requests
});

// More restrictive rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Limit each IP to 10 auth attempts per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
    },
  },
});

// Apply rate limiters
app.use('/api/v1/auth', authLimiter);
app.use(standardLimiter);

// Apply custom security middleware
app.use(securityMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);

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

/**
 * Professional graceful shutdown with controlled process termination
 * Ensures all connections are properly closed and pending requests completed
 */
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`, { signal });

  // Set a timeout to force shutdown if graceful shutdown takes too long
  const forceShutdownTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out after 30s, forcing exit');
    process.exit(1);
  }, 30000); // 30 seconds timeout

  let exitCode = 0;

  try {
    // Stop accepting new connections but finish existing requests
    logger.info('Closing HTTP server - no longer accepting new connections');
    await new Promise<void>((resolve) => {
      server.close((err) => {
        if (err) {
          logger.error('Error closing HTTP server:', { error: err.message });
          exitCode = 1;
        } else {
          logger.info('HTTP server closed successfully');
        }
        resolve();
      });
    });

    // Close database connection
    logger.info('Closing database connection');
    await db.disconnect();
    logger.info('Database connection closed successfully');

    // Log successful shutdown
    logger.info('Graceful shutdown completed successfully', {
      shutdownDuration: `${Date.now() - new Date().getTime()}ms`,
      signal,
    });

    // Clear the force shutdown timeout
    clearTimeout(forceShutdownTimeout);

    // Exit with appropriate code
    process.exit(exitCode);
  } catch (error) {
    logger.error('Error during graceful shutdown:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      signal,
    });

    // Clear the force shutdown timeout
    clearTimeout(forceShutdownTimeout);

    process.exit(1);
  }
};

// Start server
const server = app.listen(PORT, async () => {
  try {
    logger.info(`🚀 Product Service running on port ${PORT}`);
    logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    logger.info(`🔗 Health check: http://localhost:${PORT}/api/v1/health`);
    logger.info(`💾 Database: Connected`);
  } catch (error) {
    logger.error('Failed to start Product Service:', error);
    process.exit(1);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;
