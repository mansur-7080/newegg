/**
 * UltraMarket Product Service - Professional Production Implementation
 * Real microservice with complete functionality
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { DatabaseManager } from './config/database';
import { CacheManager } from './shared/cache';
import { Logger } from './shared/logger';
import productRoutes from './routes/productRoutes';

const app = express();
const logger = new Logger('ProductService');
const port = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(compression());

// Rate limiting with different limits for different endpoints
const createLimiter = (windowMs: number, max: number) => rateLimit({
  windowMs,
  max,
  message: {
    error: 'Too many requests from this IP',
    retryAfter: Math.ceil(windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General rate limiting
app.use('/api/', createLimiter(15 * 60 * 1000, 1000)); // 1000 requests per 15 minutes

// Stricter rate limiting for mutations
app.use('/api/v1/products', express.json({ limit: '10mb' }), (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return createLimiter(15 * 60 * 1000, 100)(req, res, next); // 100 mutations per 15 minutes
  }
  next();
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const db = DatabaseManager.getInstance();
    const dbHealth = await db.checkHealth();
    
    res.status(200).json({
      status: 'healthy',
      service: 'product-service',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: dbHealth ? 'connected' : 'disconnected',
      uptime: process.uptime()
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(500).json({
      status: 'unhealthy',
      service: 'product-service',
      error: 'Health check failed'
    });
  }
});

// API routes
app.use('/api/v1/products', productRoutes);

// API info endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    service: 'UltraMarket Product Service',
    version: '1.0.0',
    description: 'Professional Product Management API',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      products: '/api/v1/products',
      health: '/health',
      documentation: '/api/v1/docs' // Future swagger docs
    },
    features: [
      'Complete CRUD operations',
      'Advanced search and filtering',
      'Inventory management',
      'Bulk operations',
      'Real-time caching',
      'Production-ready logging',
      'Rate limiting',
      'Input validation',
      'Error handling'
    ]
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { 
    error: err.message, 
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });

  // Determine error type and status code
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  
  if (err.message.includes('not found')) {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
  } else if (err.message.includes('validation') || err.message.includes('Invalid')) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
  } else if (err.message.includes('unauthorized') || err.message.includes('permission')) {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
  }

  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
    code: errorCode,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    availableEndpoints: [
      'GET /health',
      'GET /api/v1',
      'GET /api/v1/products',
      'POST /api/v1/products',
      'GET /api/v1/products/:id',
      'PUT /api/v1/products/:id',
      'DELETE /api/v1/products/:id'
    ]
  });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  try {
    // Close database connection
    const db = DatabaseManager.getInstance();
    await db.disconnect();
    logger.info('✅ Database disconnected');
    
    // Close cache connection
    const cache = new CacheManager();
    await cache.disconnect();
    logger.info('✅ Cache disconnected');
    
    logger.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    // Initialize database
    logger.info('🔄 Initializing database connection...');
    const db = DatabaseManager.getInstance();
    await db.connect();
    await db.runMigrations();
    
    // Initialize cache
    logger.info('🔄 Initializing cache connection...');
    const cache = new CacheManager();
    // Cache will auto-connect on first use
    
    // Start HTTP server
    const server = app.listen(port, () => {
      logger.info('🚀 Product Service started successfully', {
        port,
        environment: process.env.NODE_ENV || 'development',
        pid: process.pid,
        memory: process.memoryUsage(),
        endpoints: {
          health: `http://localhost:${port}/health`,
          api: `http://localhost:${port}/api/v1`,
          products: `http://localhost:${port}/api/v1/products`
        }
      });
    });

    // Handle server errors
    server.on('error', (error) => {
      logger.error('Server error', { error });
      process.exit(1);
    });

  } catch (error) {
    logger.fatal('❌ Failed to start server', { error });
    process.exit(1);
  }
};

// Start the application
startServer();
