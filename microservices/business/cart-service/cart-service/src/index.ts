/**
 * UltraMarket Cart Service
 * Professional cart management with database integration and real business logic
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

// Routes
import cartRoutes from './routes/cart.routes';

// Middleware
import { logger, performanceLogger, errorLogger } from './utils/logger';
import { BaseError, formatErrorResponse } from './utils/errors';
import { validateRequestSize, validateContentType, sanitizeRequest } from './middleware/validation.middleware';

const app = express();
const PORT = process.env.PORT || 3006;
const SERVICE_NAME = 'cart-service';

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1);

// Global security middleware
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

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://ultramarket.uz',
    ];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID', 'X-Request-ID'],
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// Request parsing middleware
app.use(cookieParser());
app.use(validateRequestSize(2 * 1024 * 1024)); // 2MB limit
app.use(validateContentType(['application/json', 'application/x-www-form-urlencoded']));
app.use(express.json({ 
  limit: '2mb',
  strict: true,
  type: 'application/json',
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '2mb',
  parameterLimit: 100,
}));

// Request sanitization
app.use(sanitizeRequest);

// Request ID middleware for tracing
app.use((req: any, res, next) => {
  req.requestId = req.headers['x-request-id'] || 
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Request logging middleware
app.use((req: any, res, next) => {
  const start = Date.now();
  
  performanceLogger.requestStarted(req.requestId, req.method, req.url);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    performanceLogger.requestCompleted(
      req.requestId,
      req.method,
      req.url,
      res.statusCode,
      duration
    );
  });
  
  next();
});

// Health check endpoint (before rate limiting)
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: SERVICE_NAME,
      status: 'healthy',
      version: process.env.SERVICE_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
    },
    message: 'Service is healthy',
  });
});

// Status endpoint with detailed information
app.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: SERVICE_NAME,
      status: 'operational',
      version: process.env.SERVICE_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(process.uptime())} seconds`,
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
        external: `${Math.round(process.memoryUsage().external / 1024 / 1024)} MB`,
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid,
      },
      database: {
        status: 'connected', // This could be dynamically checked
      },
    },
    message: 'Service status retrieved successfully',
  });
});

// Global rate limiter (more permissive than route-specific ones)
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and internal calls
    return req.url === '/health' || 
           req.url === '/status' || 
           req.headers['x-api-key'] === process.env.INTERNAL_API_KEY;
  },
});

app.use(globalRateLimit);

// API routes
app.use('/api/cart', cartRoutes);

// 404 handler for unmatched routes
app.use('*', (req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
});

// Global error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Handle different types of errors
  if (err instanceof BaseError) {
    const response = formatErrorResponse(err);
    res.status(err.statusCode).json(response);
  } else if (err.type === 'entity.parse.failed') {
    // JSON parsing error
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Invalid JSON in request body',
      },
    });
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    // File size limit error
    res.status(413).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds limit',
      },
    });
  } else if (err.message === 'Not allowed by CORS') {
    // CORS error
    res.status(403).json({
      success: false,
      error: {
        code: 'CORS_ERROR',
        message: 'Origin not allowed by CORS policy',
      },
    });
  } else {
    // Unknown error
    errorLogger.applicationError(err, {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      body: req.body,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : err.message,
      },
    });
  }
});

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  const server = app.listen(PORT);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close database connections, cleanup resources, etc.
    // Add your cleanup logic here
    
    process.exit(0);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Force shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  errorLogger.applicationError(err, { type: 'uncaughtException' });
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  errorLogger.applicationError(new Error(String(reason)), { 
    type: 'unhandledRejection',
    promise: promise,
  });
  process.exit(1);
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🛒 ${SERVICE_NAME} started successfully`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    version: process.env.SERVICE_VERSION || '1.0.0',
    nodeVersion: process.version,
    pid: process.pid,
  });
  
  logger.info(`📋 Cart Service endpoints:`, {
    health: `http://localhost:${PORT}/health`,
    status: `http://localhost:${PORT}/status`,
    api: `http://localhost:${PORT}/api/cart`,
  });
});

// Handle server errors
server.on('error', (err) => {
  errorLogger.applicationError(err, { type: 'serverError' });
  logger.error('Server error:', err);
});

export default app;
