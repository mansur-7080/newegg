/**
 * UltraMarket Product Service - Prisma Based
 * Professional product catalog and inventory management service
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';

// Database and utilities
import { connectDatabase, disconnectDatabase } from './lib/database';
import { logger } from './utils/logger';
import { validateEnv } from './config/env.validation';
import { swaggerSpec } from './config/swagger';

// Routes
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import healthRoutes from './routes/health.routes';

// Middleware
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logger.middleware';
import { securityMiddleware } from './middleware/security.middleware';

// Load environment variables
dotenv.config();

// Validate environment variables
validateEnv();

const app = express();
const PORT = process.env.PORT || 3003;
const HOST = process.env.HOST || '0.0.0.0';

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1);

// Apply security middleware with enhanced configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// Compression middleware
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
    });
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
    });
  },
});

app.use(globalLimiter);

// Body parsing middleware
app.use(express.json({ 
  limit: process.env.REQUEST_SIZE_LIMIT || '10mb',
  strict: true,
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.REQUEST_SIZE_LIMIT || '10mb',
}));

// Security middleware
app.use(securityMiddleware());

// Request logging middleware
app.use(requestLogger);

// API documentation with Swagger
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'product-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);

// API info endpoint
app.get('/api/v1', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'UltraMarket Product Service',
    version: process.env.APP_VERSION || '1.0.0',
    description: 'Professional product catalog and inventory management service',
    endpoints: {
      health: '/health',
      documentation: process.env.NODE_ENV !== 'production' ? '/api-docs' : null,
      products: '/api/v1/products',
      categories: '/api/v1/categories',
    },
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
  });
  
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Initialize database connection and start server
 */
async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();
    
    // Start HTTP server
    const server = app.listen(PORT, HOST, () => {
      logger.info('Product service started successfully', {
        port: PORT,
        host: HOST,
        environment: process.env.NODE_ENV || 'development',
        database: 'PostgreSQL (Prisma)',
        documentation: process.env.NODE_ENV !== 'production' ? `http://${HOST}:${PORT}/api-docs` : null,
      });
    });

    // Server error handling
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      } else {
        logger.error('Server error', { error: error.message });
      }
      process.exit(1);
    });

    // Handle server shutdown gracefully
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await disconnectDatabase();
          logger.info('Database disconnected successfully');
          process.exit(0);
        } catch (error) {
          logger.error('Error during database shutdown', { error });
          process.exit(1);
        }
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Listen for shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    logger.error('Failed to start product service', { error });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

// Start the server
startServer();

export default app;
