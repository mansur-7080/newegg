/**
 * UltraMarket Store Service
 * Multi-vendor store management service
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import winston from 'winston';

// Import routes
import storeRoutes from './routes/store.routes';
import productRoutes from './routes/product.routes';
import orderRoutes from './routes/order.routes';
import categoryRoutes from './routes/category.routes';
import analyticsRoutes from './routes/analytics.routes';
import staffRoutes from './routes/staff.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import { loggerMiddleware } from './middleware/logger.middleware';

// Load environment variables
config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3004;

// Initialize Prisma
export const prisma = new PrismaClient();

// Initialize Redis
export const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Initialize Logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ],
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger middleware
app.use(loggerMiddleware);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Test Redis connection
    await redis.ping();
    
    res.status(200).json({
      status: 'healthy',
      service: 'store-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      redis: 'connected',
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'store-service',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable',
    });
  }
});

// API Routes
app.use('/api/stores', authMiddleware, storeRoutes);
app.use('/api/stores/:storeId/products', authMiddleware, productRoutes);
app.use('/api/stores/:storeId/orders', authMiddleware, orderRoutes);
app.use('/api/stores/:storeId/categories', authMiddleware, categoryRoutes);
app.use('/api/stores/:storeId/analytics', authMiddleware, analyticsRoutes);
app.use('/api/stores/:storeId/staff', authMiddleware, staffRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested resource was not found',
  });
});

// Database connection
async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    process.exit(1);
  }
}

// Redis connection
async function connectRedis() {
  try {
    await redis.connect();
    logger.info('Connected to Redis');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    // Redis is optional, continue without it
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down Store Service...');
  
  await prisma.$disconnect();
  await redis.disconnect();
  
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    await connectDatabase();
    await connectRedis();
    
    app.listen(PORT, () => {
      logger.info(`Store Service running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;