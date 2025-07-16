import Joi from 'joi';
import { logger } from '../utils/logger';

// Define environment schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3003),
  SERVICE_NAME: Joi.string().default('product-service'),

  // Database
  DATABASE_URL: Joi.string().uri().required().description('PostgreSQL connection URL'),
  
  // Redis
  REDIS_URL: Joi.string().uri().default('redis://localhost:6379'),
  REDIS_TTL: Joi.number().default(3600),
  
  // Security
  JWT_SECRET: Joi.string().required().min(32).description('JWT secret key'),
  BCRYPT_ROUNDS: Joi.number().default(10),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  
  // Pagination
  DEFAULT_PAGE_SIZE: Joi.number().default(20),
  MAX_PAGE_SIZE: Joi.number().default(100),
  
  // File upload
  MAX_FILE_SIZE: Joi.number().default(5 * 1024 * 1024), // 5MB
  ALLOWED_FILE_TYPES: Joi.string().default('image/jpeg,image/png,image/webp'),
  
  // External services
  USER_SERVICE_URL: Joi.string().uri().default('http://user-service:3002'),
  INVENTORY_SERVICE_URL: Joi.string().uri().default('http://inventory-service:3008'),
  NOTIFICATION_SERVICE_URL: Joi.string().uri().default('http://notification-service:3009'),
  
  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  
  // CORS
  ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000'),
  
  // AWS S3 (optional)
  AWS_ACCESS_KEY_ID: Joi.string().optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
  AWS_REGION: Joi.string().default('us-east-1'),
  S3_BUCKET_NAME: Joi.string().optional(),
  
  // Queue
  QUEUE_NAME: Joi.string().default('product-queue'),
  
  // Monitoring
  METRICS_ENABLED: Joi.boolean().default(true),
  HEALTH_CHECK_INTERVAL: Joi.number().default(30000), // 30 seconds
}).unknown();

export const validateEnv = () => {
  const { error, value } = envSchema.validate(process.env);

  if (error) {
    logger.error('Environment validation failed', {
      error: error.details.map((detail) => ({
        message: detail.message,
        path: detail.path.join('.'),
      })),
    });
    throw new Error(`Environment validation error: ${error.message}`);
  }

  // Update process.env with validated values
  Object.assign(process.env, value);

  logger.info('Environment variables validated successfully');
  return value;
};
