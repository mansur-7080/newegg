import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { metricsMiddleware } from './middleware/metrics';
import { logger } from './utils/logger';
import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';

config();

const app = express();
const PORT = process.env.PORT || 8000;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// General middleware
app.use(compression());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Metrics middleware
app.use(metricsMiddleware);

// Health check routes
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);

// Service proxy configurations
const services = {
  user: {
    target: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    pathRewrite: { '^/api/users': '/api/users' },
  },
  product: {
    target: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
    pathRewrite: { '^/api/products': '/api/products' },
  },
  order: {
    target: process.env.ORDER_SERVICE_URL || 'http://localhost:3004',
    pathRewrite: { '^/api/orders': '/api/orders' },
  },
  cart: {
    target: process.env.CART_SERVICE_URL || 'http://localhost:3005',
    pathRewrite: { '^/api/cart': '/api/cart' },
  },
  payment: {
    target: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',
    pathRewrite: { '^/api/payments': '/api/payments' },
  },
  notification: {
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007',
    pathRewrite: { '^/api/notifications': '/api/notifications' },
  },
  search: {
    target: process.env.SEARCH_SERVICE_URL || 'http://localhost:3008',
    pathRewrite: { '^/api/search': '/api/search' },
  },
  analytics: {
    target: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3009',
    pathRewrite: { '^/api/analytics': '/api/analytics' },
  },
};

// Create proxy middleware for each service
Object.entries(services).forEach(([serviceName, config]) => {
  const proxyMiddleware = createProxyMiddleware({
    target: config.target,
    changeOrigin: true,
    pathRewrite: config.pathRewrite,
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${serviceName}:`, err);
      res.status(503).json({
        error: 'Service Unavailable',
        message: `${serviceName} service is currently unavailable`,
        timestamp: new Date().toISOString(),
      });
    },
    onProxyReq: (proxyReq, req, res) => {
      // Add correlation ID for tracing
      const correlationId =
        req.headers['x-correlation-id'] ||
        `gw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      proxyReq.setHeader('X-Correlation-ID', correlationId);
      proxyReq.setHeader('X-Forwarded-For', req.ip);
      proxyReq.setHeader('X-Gateway-Version', '1.0.0');
    },
  });

  // Apply authentication middleware for protected routes
  const protectedRoutes = ['/api/orders', '/api/cart', '/api/payments', '/api/analytics'];
  const routePath = `/api/${
    serviceName === 'user' ? 'users' : serviceName === 'product' ? 'products' : serviceName
  }`;

  if (protectedRoutes.some((route) => routePath.startsWith(route))) {
    app.use(routePath, authMiddleware, proxyMiddleware);
  } else {
    app.use(routePath, proxyMiddleware);
  }
});

// API documentation route
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'UltraMarket API Gateway',
    version: '1.0.0',
    description: 'Central API Gateway for UltraMarket microservices',
    services: Object.keys(services),
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      products: '/api/products',
      orders: '/api/orders',
      cart: '/api/cart',
      payments: '/api/payments',
      notifications: '/api/notifications',
      search: '/api/search',
      analytics: '/api/analytics',
    },
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 API Gateway running on port ${PORT}`);
  logger.info(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  logger.info(`🔍 Health Check: http://localhost:${PORT}/health`);
});

export default app;
