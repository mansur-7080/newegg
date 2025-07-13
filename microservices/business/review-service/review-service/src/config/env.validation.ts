import Joi from 'joi';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const envValidationSchema = Joi.object({
  // Server Configuration
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development')
    .description('Application environment'),

  PORT: Joi.number()
    .port()
    .default(3010)
    .description('Server port'),

  // Database Configuration
  MONGODB_URI: Joi.string()
    .uri()
    .required()
    .description('MongoDB connection string'),

  // Redis Configuration
  REDIS_HOST: Joi.string()
    .hostname()
    .default('localhost')
    .description('Redis host'),

  REDIS_PORT: Joi.number()
    .port()
    .default(6379)
    .description('Redis port'),

  REDIS_PASSWORD: Joi.string()
    .optional()
    .description('Redis password'),

  REDIS_DB: Joi.number()
    .integer()
    .min(0)
    .max(15)
    .default(0)
    .description('Redis database number'),

  // JWT Configuration
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .description('JWT secret key'),

  JWT_EXPIRES_IN: Joi.string()
    .default('24h')
    .description('JWT token expiration'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number()
    .integer()
    .min(60000)
    .default(900000)
    .description('Rate limit window in milliseconds'),

  RATE_LIMIT_MAX_REQUESTS: Joi.number()
    .integer()
    .min(10)
    .default(100)
    .description('Maximum requests per window'),

  // CORS Configuration
  ALLOWED_ORIGINS: Joi.string()
    .default('http://localhost:3000')
    .description('Comma-separated list of allowed origins'),

  // Service URLs
  FRONTEND_URL: Joi.string()
    .uri()
    .default('http://localhost:3000')
    .description('Frontend application URL'),

  ADMIN_URL: Joi.string()
    .uri()
    .default('http://localhost:3001')
    .description('Admin panel URL'),

  // External Service URLs
  PRODUCT_SERVICE_URL: Joi.string()
    .uri()
    .default('http://localhost:3003')
    .description('Product service URL'),

  USER_SERVICE_URL: Joi.string()
    .uri()
    .default('http://localhost:3001')
    .description('User service URL'),

  NOTIFICATION_SERVICE_URL: Joi.string()
    .uri()
    .default('http://localhost:3007')
    .description('Notification service URL'),

  // API Configuration
  API_BASE_URL: Joi.string()
    .uri()
    .optional()
    .description('Base URL for API documentation'),

  // Logging Configuration
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info')
    .description('Logging level'),

  LOG_FILE: Joi.string()
    .optional()
    .description('Log file path'),

  // Security Configuration
  INTERNAL_API_KEY: Joi.string()
    .min(16)
    .optional()
    .description('Internal API key for service communication'),

  // Review Service Specific
  MAX_REVIEW_LENGTH: Joi.number()
    .integer()
    .min(10)
    .max(5000)
    .default(1000)
    .description('Maximum review content length'),

  MIN_REVIEW_LENGTH: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .description('Minimum review content length'),

  MAX_REPLY_LENGTH: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(500)
    .description('Maximum reply content length'),

  REVIEW_MODERATION_ENABLED: Joi.boolean()
    .default(true)
    .description('Enable review moderation'),

  AUTO_APPROVE_VERIFIED_USERS: Joi.boolean()
    .default(false)
    .description('Auto-approve reviews from verified users'),

  // Pagination
  DEFAULT_PAGE_SIZE: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .description('Default pagination page size'),

  MAX_PAGE_SIZE: Joi.number()
    .integer()
    .min(1)
    .max(200)
    .default(100)
    .description('Maximum pagination page size'),
});

interface ValidationResult {
  error?: Joi.ValidationError;
  value: NodeJS.ProcessEnv;
}

export function validateEnvironment(): ValidationResult {
  const { error, value } = envValidationSchema.validate(process.env, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (error) {
    console.error('❌ Environment validation failed:');
    error.details.forEach((detail) => {
      console.error(`  - ${detail.message}`);
    });
    process.exit(1);
  }

  // Set validated values back to process.env
  Object.assign(process.env, value);

  console.log('✅ Environment validation passed');
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🚀 Port: ${process.env.PORT}`);
  console.log(`💾 Database: ${process.env.MONGODB_URI ? 'Configured' : 'Missing'}`);
  console.log(`🔐 JWT: ${process.env.JWT_SECRET ? 'Configured' : 'Missing'}`);
  console.log(`🔴 Redis: ${process.env.REDIS_HOST ? 'Configured' : 'Missing'}`);

  return { value };
}

// Export validated environment variables
export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3010'),
  MONGODB_URI: process.env.MONGODB_URI!,
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379'),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_DB: parseInt(process.env.REDIS_DB || '0'),
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  ADMIN_URL: process.env.ADMIN_URL || 'http://localhost:3001',
  PRODUCT_SERVICE_URL: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3003',
  USER_SERVICE_URL: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007',
  API_BASE_URL: process.env.API_BASE_URL,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: process.env.LOG_FILE,
  INTERNAL_API_KEY: process.env.INTERNAL_API_KEY,
  MAX_REVIEW_LENGTH: parseInt(process.env.MAX_REVIEW_LENGTH || '1000'),
  MIN_REVIEW_LENGTH: parseInt(process.env.MIN_REVIEW_LENGTH || '10'),
  MAX_REPLY_LENGTH: parseInt(process.env.MAX_REPLY_LENGTH || '500'),
  REVIEW_MODERATION_ENABLED: process.env.REVIEW_MODERATION_ENABLED === 'true',
  AUTO_APPROVE_VERIFIED_USERS: process.env.AUTO_APPROVE_VERIFIED_USERS === 'true',
  DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE || '20'),
  MAX_PAGE_SIZE: parseInt(process.env.MAX_PAGE_SIZE || '100'),
};