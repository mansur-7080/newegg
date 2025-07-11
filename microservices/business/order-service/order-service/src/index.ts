import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger } from '@ultramarket/shared';
import { errorHandler } from './middleware/errorHandler';
import orderRoutes from './routes/orderRoutes';
import connectDB from './config/database';
import { setupSwagger } from './docs/swagger';
import { setupMonitoring } from './monitoring/setup';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4003;

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // limit each IP
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Setup monitoring
setupMonitoring(app);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'order-service',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: 'PostgreSQL',
  });
});

// Setup Swagger documentation
setupSwagger(app);

// API routes
app.use('/api/v1', orderRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    // Connect to PostgreSQL
    await connectDB();

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`🚀 Order Service started successfully!`);
      logger.info(`🌐 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`💾 Database: PostgreSQL (${process.env.DATABASE_URL})`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      logger.info(`📚 API: http://localhost:${PORT}/api/v1`);
      logger.info(`🛒 Orders: http://localhost:${PORT}/api/v1/orders`);
    });
  } catch (error) {
    logger.error('Failed to start Order Service:', error);
    process.exit(1);
  }
};

// Initialize server
startServer();