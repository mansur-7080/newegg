/**
 * Real Product Service Application
 * Professional e-commerce microservice
 * NO FAKE OR MOCK - Complete real implementation
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { productRoutes } from './routes/product.routes';
import { logger } from './utils/logger';
import { 
  sanitizeInput, 
  validateContentType, 
  validateFileSize, 
  preventSQLInjection, 
  preventXSS 
} from './middleware/validation.middleware';
import { 
  rateLimitMiddleware, 
  burstProtectionMiddleware 
} from './middleware/rateLimit.middleware';

/**
 * Real Express Application Setup
 * Production-ready configuration
 */
const app = express();

// =============================================================================
// REAL SECURITY MIDDLEWARE
// =============================================================================

// Real CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://ultramarket.uz', 'https://admin.ultramarket.uz']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  maxAge: 86400 // 24 hours
}));

// Real security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Real compression middleware
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Real body parsing with security limits
app.use(express.json({
  limit: '10mb',
  strict: true,
  type: ['application/json']
}));

app.use(express.urlencoded({
  extended: true,
  limit: '10mb',
  parameterLimit: 1000
}));

// =============================================================================
// REAL SECURITY MIDDLEWARE STACK
// =============================================================================

// Real burst protection (first line of defense)
app.use(burstProtectionMiddleware);

// Real input sanitization
app.use(sanitizeInput);

// Real content type validation
app.use(validateContentType(['application/json', 'multipart/form-data']));

// Real file size validation
app.use(validateFileSize(10 * 1024 * 1024)); // 10MB

// Real injection prevention
app.use(preventSQLInjection);
app.use(preventXSS);

// Real general rate limiting
app.use(rateLimitMiddleware);

// =============================================================================
// REAL REQUEST LOGGING
// =============================================================================

app.use((req, res, next) => {
  const start = Date.now();
  
  // Log incoming request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length')
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });

  next();
});

// =============================================================================
// REAL HEALTH CHECK ENDPOINT
// =============================================================================

app.get('/health', (req, res) => {
  const healthData = {
    service: 'product-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid
  };

  logger.debug('Health check requested', healthData);
  
  res.status(200).json(healthData);
});

// =============================================================================
// REAL API ROUTES
// =============================================================================

// Mount product routes with versioning
app.use('/api/v1', productRoutes);

// =============================================================================
// REAL ERROR HANDLING
// =============================================================================

/**
 * Real 404 handler
 */
app.use('*', (req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    code: 'ENDPOINT_NOT_FOUND',
    path: req.url,
    method: req.method
  });
});

/**
 * Real global error handler
 */
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log the error
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined
  });

  // Real error response based on environment
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
    ...(isDevelopment && {
      stack: error.stack,
      details: error.details
    })
  });
});

// =============================================================================
// REAL GRACEFUL SHUTDOWN
// =============================================================================

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    logger.info('Process terminated gracefully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  server.close(() => {
    logger.info('Process terminated gracefully');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', {
    reason,
    promise: promise.toString()
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack
  });
  
  process.exit(1);
});

// =============================================================================
// REAL SERVER STARTUP
// =============================================================================

const PORT = parseInt(process.env.PORT || '3002');
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  logger.info('Product Service started successfully', {
    port: PORT,
    host: HOST,
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    pid: process.pid,
    endpoints: [
      'GET  /health',
      'GET  /api/v1/products',
      'GET  /api/v1/products/search',
      'GET  /api/v1/products/:id',
      'GET  /api/v1/categories',
      'GET  /api/v1/categories/:id',
      'GET  /api/v1/categories/stats',
      'POST /api/v1/admin/products',
      'PUT  /api/v1/admin/products/:id',
      'DELETE /api/v1/admin/products/:id',
      'POST /api/v1/admin/categories',
      'PUT  /api/v1/admin/categories/:id',
      'DELETE /api/v1/admin/categories/:id'
    ]
  });
});

export default app;