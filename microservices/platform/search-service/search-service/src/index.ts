import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from '@ultramarket/shared';
import { validateEnv } from './config/env.validation';
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/request-logger.middleware';
import searchRoutes from './routes/search.routes';

// Load and validate environment variables
dotenv.config();
validateEnv();

const app = express();
const PORT = process.env.PORT || 3007;

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'search-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/v1/search', searchRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'UltraMarket Search Service',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      search: '/api/v1/search',
      docs: '/api/v1/search/docs',
    },
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
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

// Start server
app.listen(PORT, () => {
  logger.info(`🔍 Search Service running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔗 Elasticsearch: ${process.env.ELASTICSEARCH_NODE}`);
});

export default app;
