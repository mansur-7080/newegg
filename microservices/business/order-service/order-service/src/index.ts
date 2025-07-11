/**
 * UltraMarket Order Service
 * Professional order management microservice
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import { validateEnvironmentOnStartup } from '@ultramarket/shared/validation/environment';
import { logger } from '@ultramarket/shared/logging/logger';
import { errorHandler } from '@ultramarket/shared/middleware/error-handler';
import { securityMiddleware } from '@ultramarket/shared/middleware/security';
import { validateToken } from '@ultramarket/shared/auth/jwt';
import { requireAdmin } from '@ultramarket/shared/auth/jwt';

// Import routes
import orderRoutes from './routes/order.routes';
import cartRoutes from './routes/cart.routes';
import checkoutRoutes from './routes/checkout.routes';

// Validate environment on startup
validateEnvironmentOnStartup('order-service');

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3004;
const HOST = process.env.HOST ?? 'localhost';

// Initialize Prisma
const prisma = new PrismaClient();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? '*',
    credentials: true,
  })
);

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100', 10),
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use(securityMiddleware());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'healthy',
      service: 'order-service',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION ?? '1.0.0',
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'order-service',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API routes
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/checkout', checkoutRoutes);

// Admin routes (protected)
app.use('/api/v1/admin/orders', validateToken, requireAdmin, orderRoutes);

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
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Connected to PostgreSQL successfully');
    
    app.listen(PORT, HOST, () => {
      logger.info('Order service started successfully', {
        port: PORT,
        host: HOST,
        environment: process.env.NODE_ENV ?? 'development',
      });
    });
  } catch (error) {
    logger.error('Failed to start order service', { error: error instanceof Error ? error.message : 'Unknown error' });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

export default app;