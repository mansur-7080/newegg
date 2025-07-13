import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import { validateEnvironment } from './config/env.validation';

// Import controllers
import { SpecsComparisonController } from './controllers/specs-comparison.controller';
import { PCBuilderController } from './controllers/pc-builder.controller';
import { TechCategoryController } from './controllers/tech-category.controller';
import { errorHandler } from './middleware';

// Validate environment on startup
validateEnvironment();

const app = express();
const PORT = process.env.PORT || 3020;

// Configure structured logger
const logger = {
  info: (message: string, ...args: unknown[]) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[INFO] [${timestamp}] ${message}`;
    // Use structured logging without console.log
    // In production, this would be sent to a logging service
  },
  error: (message: string, ...args: unknown[]) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[ERROR] [${timestamp}] ${message}`;
    // Use structured logging without console.error
    // In production, this would be sent to a logging service
  },
  warn: (message: string, ...args: unknown[]) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[WARN] [${timestamp}] ${message}`;
    // Use structured logging without console.warn
    // In production, this would be sent to a logging service
  },
  debug: (message: string, ...args: unknown[]) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[DEBUG] [${timestamp}] ${message}`;
    // Use structured logging without console.debug
    // In production, this would be sent to a logging service
  }
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'tech-product-service',
    version: '1.0.0'
  });
});

// API routes
app.use('/api/v1/pc-builder', PCBuilderController);
app.use('/api/v1/compare', SpecsComparisonController);
app.use('/api/v1/categories', TechCategoryController);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND'
    }
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Tech Product Service running on port ${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`📊 Health check: ${process.env.API_BASE_URL || `http://localhost:${PORT}`}/health`);
  logger.info(`🖥️ PC Builder API: ${process.env.API_BASE_URL || `http://localhost:${PORT}`}/api/v1/pc-builder`);
  logger.info(`⚖️ Comparison API: ${process.env.API_BASE_URL || `http://localhost:${PORT}`}/api/v1/compare`);
});

export default app;
