import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { errorHandler, requestLogger } from './middleware/errorHandler';
import userRoutes from './routes/userRoutes';
import { logger } from './utils/logger';
import { validateEnvironment, userServiceEnvironmentSchema } from '@shared/validation';

// Load environment variables
dotenv.config();

// Validate environment variables before starting the service
try {
  const validatedEnv = validateEnvironment(userServiceEnvironmentSchema, process.env);

  // Update process.env with validated values
  Object.assign(process.env, validatedEnv);

  logger.info('✅ Environment validation passed');
} catch (error) {
  logger.error('❌ Environment validation failed:', error);
  process.exit(1);
}

const app = express();
const PORT = process.env['PORT'] || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'user-service',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API routes
app.use('/api/v1/users', userRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`🚀 User Service running on port ${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
  logger.info(`💾 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  logger.info(`🔐 Redis: ${process.env.REDIS_URL ? 'Connected' : 'Not configured'}`);
});
