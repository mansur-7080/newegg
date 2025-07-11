/**
 * UltraMarket API Gateway
 * Professional API Gateway with routing, authentication, and load balancing
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { logger } from '@ultramarket/shared/logging/logger';
import { errorHandler } from '@ultramarket/shared/middleware/error-handler';
import { securityMiddleware } from '@ultramarket/shared/middleware/security';
import { validateEnvironmentOnStartup } from '@ultramarket/shared/validation/environment';
import { authenticateToken } from './middleware/authMiddleware';
import { requestLogger } from './middleware/requestLogger';
import { responseTime } from './middleware/responseTime';
import { healthCheck } from './middleware/healthCheck';

// Validate environment on startup
validateEnvironmentOnStartup('api-gateway');

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST ?? 'localhost';

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100', 10),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health', // Skip health checks
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use(securityMiddleware());

// Custom middleware
app.use(requestLogger);
app.use(responseTime);

// Health check endpoint
app.get('/health', healthCheck);

// Service routes configuration
const services = {
  auth: {
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3002',
    routes: ['/api/v1/auth'],
    auth: false, // Public routes
  },
  user: {
    url: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    routes: ['/api/v1/users'],
    auth: true,
  },
  product: {
    url: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3003',
    routes: ['/api/v1/products'],
    auth: false, // Public routes for product browsing
  },
  order: {
    url: process.env.ORDER_SERVICE_URL || 'http://localhost:3004',
    routes: ['/api/v1/orders'],
    auth: true,
  },
  payment: {
    url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
    routes: ['/api/v1/payments'],
    auth: true,
  },
  cart: {
    url: process.env.CART_SERVICE_URL || 'http://localhost:3006',
    routes: ['/api/v1/cart'],
    auth: true,
  },
  search: {
    url: process.env.SEARCH_SERVICE_URL || 'http://localhost:3007',
    routes: ['/api/v1/search'],
    auth: false, // Public routes
  },
  notification: {
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008',
    routes: ['/api/v1/notifications'],
    auth: true,
  },
  analytics: {
    url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3009',
    routes: ['/api/v1/analytics'],
    auth: true,
  },
};

// Setup proxy routes for each service
Object.entries(services).forEach(([serviceName, serviceConfig]) => {
  const proxyOptions = {
    target: serviceConfig.url,
    changeOrigin: true,
    pathRewrite: {
      [`^/api/v1/${serviceName}`]: `/api/v1/${serviceName}`,
    },
    onProxyReq: (proxyReq: any, req: any, res: any) => {
      // Add service name to headers for tracing
      proxyReq.setHeader('X-Service-Name', serviceName);
      proxyReq.setHeader('X-Request-ID', req.id);
      
      // Log proxy request
      logger.info('Proxying request', {
        service: serviceName,
        method: req.method,
        path: req.path,
        target: serviceConfig.url,
        userId: req.user?.userId,
      });
    },
    onProxyRes: (proxyRes: any, req: any, res: any) => {
      // Log proxy response
      logger.info('Proxy response received', {
        service: serviceName,
        method: req.method,
        path: req.path,
        statusCode: proxyRes.statusCode,
        userId: req.user?.userId,
      });
    },
    onError: (err: any, req: any, res: any) => {
      logger.error('Proxy error', {
        service: serviceName,
        method: req.method,
        path: req.path,
        error: err.message,
        userId: req.user?.userId,
      });
      
      res.status(502).json({
        success: false,
        message: `${serviceName} service is temporarily unavailable`,
        error: 'Service unavailable',
      });
    },
  };

  // Create proxy middleware
  const proxy = createProxyMiddleware(proxyOptions);

  // Apply routes with optional authentication
  serviceConfig.routes.forEach((route) => {
    if (serviceConfig.auth) {
      // Protected routes - require authentication
      app.use(route, authenticateToken, proxy);
    } else {
      // Public routes - no authentication required
      app.use(route, proxy);
    }
  });
});

// API documentation route
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'UltraMarket API Documentation',
    version: '1.0.0',
    services: Object.keys(services),
    endpoints: {
      auth: [
        'POST /api/v1/auth/register',
        'POST /api/v1/auth/login',
        'POST /api/v1/auth/refresh',
        'POST /api/v1/auth/logout',
        'GET /api/v1/auth/profile',
      ],
      users: [
        'GET /api/v1/users/profile',
        'PUT /api/v1/users/profile',
        'GET /api/v1/users/orders',
      ],
      products: [
        'GET /api/v1/products',
        'GET /api/v1/products/:id',
        'GET /api/v1/products/slug/:slug',
        'POST /api/v1/products (admin)',
        'PUT /api/v1/products/:id (admin)',
        'DELETE /api/v1/products/:id (admin)',
      ],
      orders: [
        'GET /api/v1/orders',
        'GET /api/v1/orders/:id',
        'POST /api/v1/orders',
        'PUT /api/v1/orders/:id/status',
      ],
      payments: [
        'POST /api/v1/payments/process',
        'POST /api/v1/payments/refund',
        'GET /api/v1/payments/:id',
      ],
      cart: [
        'GET /api/v1/cart',
        'POST /api/v1/cart/items',
        'PUT /api/v1/cart/items/:id',
        'DELETE /api/v1/cart/items/:id',
        'DELETE /api/v1/cart/clear',
      ],
      search: [
        'GET /api/v1/search?q=query',
        'GET /api/v1/search/suggestions',
      ],
    },
  });
});

// Service status endpoint
app.get('/api/status', async (req, res) => {
  try {
    const serviceStatus = await Promise.allSettled(
      Object.entries(services).map(async ([serviceName, serviceConfig]) => {
        try {
          const response = await fetch(`${serviceConfig.url}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000), // 5 second timeout
          });
          
          return {
            service: serviceName,
            status: response.ok ? 'healthy' : 'unhealthy',
            url: serviceConfig.url,
            responseTime: Date.now(),
          };
        } catch (error) {
          return {
            service: serviceName,
            status: 'unhealthy',
            url: serviceConfig.url,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    const status = serviceStatus.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          service: 'unknown',
          status: 'error',
          error: result.reason,
        };
      }
    });

    const allHealthy = status.every((s) => s.status === 'healthy');

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      message: allHealthy ? 'All services are healthy' : 'Some services are unhealthy',
      timestamp: new Date().toISOString(),
      services: status,
    });
  } catch (error) {
    logger.error('Error checking service status', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error checking service status',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Metrics endpoint
app.get('/api/metrics', (req, res) => {
  // This would typically return Prometheus metrics
  res.json({
    success: true,
    message: 'API Gateway Metrics',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    availableRoutes: Object.keys(services).map(service => `/api/v1/${service}`),
  });
});

// Start server
app.listen(PORT, HOST, () => {
  logger.info('API Gateway started successfully', {
    port: PORT,
    host: HOST,
    environment: process.env.NODE_ENV ?? 'development',
    services: Object.keys(services),
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
