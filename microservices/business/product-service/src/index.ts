/**
 * UltraMarket Product Service - Professional TypeScript Implementation
 * Clean architecture with proper dependency injection
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { DatabaseManager } from './config/database';
import { Logger } from './utils/mocks';

const app = express();
const logger = new Logger('ProductService');
const port = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'product-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Basic API info
app.get('/', (_req, res) => {
  res.json({
    service: 'UltraMarket Product Service',
    version: '1.0.0',
    description: 'Professional TypeScript Product Management API',
    endpoints: [
      'GET /health - Health check',
      'GET / - This info'
    ]
  });
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  try {
    const db = DatabaseManager.getInstance();
    await db.disconnect();
    logger.info('✅ Database disconnected');
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    // Initialize database
    const db = DatabaseManager.getInstance();
    await db.connect();
    
    // Start HTTP server
    app.listen(port, () => {
      logger.info(`🚀 Product Service running on port ${port}`);
      logger.info(`📱 Health check: http://localhost:${port}/health`);
      logger.info(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
startServer();
