/**
 * UltraMarket Store Service
 * Multi-vendor store management service
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import storeRoutes from './routes/store.routes';
import vendorRoutes from './routes/vendor.routes';
import { validateEnvironment } from './config/environment';

// Validate environment variables
validateEnvironment();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3004;
const HOST = process.env.HOST ?? 'localhost';

// Initialize Prisma client
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Security middleware
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? '*',
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '500', 10),
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'store-service',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION ?? '1.0.0',
  });
});

// API routes
app.use('/api/v1/stores', storeRoutes);
app.use('/api/v1/vendors', vendorRoutes);

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

// Initialize database connection and start server
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Start server
    app.listen(PORT, HOST, () => {
      logger.info('Store service started successfully', {
        port: PORT,
        host: HOST,
        environment: process.env.NODE_ENV ?? 'development',
      });
    });
  } catch (error) {
    logger.error('Failed to start store service', { error });
    process.exit(1);
  }
}

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
export { prisma };