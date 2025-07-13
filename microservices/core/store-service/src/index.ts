/**
 * UltraMarket Store Service
 * Professional multi-vendor store management microservice
 * 
 * Features:
 * - Multi-vendor store management
 * - Store registration and verification
 * - Store analytics and reporting
 * - Inventory management integration
 * - Payment processing integration
 * - Real-time notifications
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
import { storeRoutes } from './routes/store.routes';
import { vendorRoutes } from './routes/vendor.routes';
import { analyticsRoutes } from './routes/analytics.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import { validationMiddleware } from './middleware/validation.middleware';
import { loggingMiddleware } from './middleware/logging.middleware';

// Load environment variables
config();

// Initialize services
const app = express();
const prisma = new PrismaClient();
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
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
  ]
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    retryAfter: 15 * 60 * 1000
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(loggingMiddleware);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis connection
    await redis.ping();
    
    res.status(200).json({
      status: 'healthy',
      service: 'store-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
      redis: 'connected'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'store-service',
      timestamp: new Date().toISOString(),
      error: 'Service dependencies unavailable'
    });
  }
});

// API routes
app.use('/api/stores', authMiddleware, storeRoutes);
app.use('/api/vendors', authMiddleware, vendorRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);

// API documentation
app.get('/api/docs', (req, res) => {
  res.json({
    service: 'UltraMarket Store Service',
    version: '1.0.0',
    description: 'Multi-vendor store management microservice',
    endpoints: {
      stores: '/api/stores',
      vendors: '/api/vendors',
      analytics: '/api/analytics',
      health: '/health'
    },
    documentation: 'https://docs.ultramarket.uz/store-service'
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Initialize connections
async function initializeServices() {
  try {
    // Connect to Redis
    await redis.connect();
    logger.info('Redis connected successfully');
    
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');
    
    // Start server
    const PORT = process.env.PORT || 3004;
    app.listen(PORT, () => {
      logger.info(`Store Service running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API documentation: http://localhost:${PORT}/api/docs`);
    });
    
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  
  try {
    await redis.disconnect();
    await prisma.$disconnect();
    logger.info('Services disconnected successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  
  try {
    await redis.disconnect();
    await prisma.$disconnect();
    logger.info('Services disconnected successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Initialize and start the service
initializeServices();

export default app;