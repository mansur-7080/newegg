/**
 * UltraMarket Environment Validation
 * Comprehensive validation for all microservices environment variables
 */

import Joi from 'joi';
import { logger } from '../logging/logger';

// =================== ENVIRONMENT VALIDATION SCHEMAS ===================

// Base environment schema for all services
const baseEnvironmentSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  HOST: Joi.string().hostname().default('localhost'),
  API_VERSION: Joi.string().default('v1'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  APP_VERSION: Joi.string().default('1.0.0'),
});

// Database environment schema
const databaseEnvironmentSchema = Joi.object({
  DATABASE_URL: Joi.string().uri().required(),
  POSTGRES_HOST: Joi.string().hostname().default('localhost'),
  POSTGRES_PORT: Joi.number().port().default(5432),
  POSTGRES_DB: Joi.string().required(),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().min(8).required(),
  MONGODB_URI: Joi.string().uri().optional(),
  MONGODB_HOST: Joi.string().hostname().default('localhost'),
  MONGODB_PORT: Joi.number().port().default(27017),
  MONGODB_DATABASE: Joi.string().optional(),
  MONGODB_USERNAME: Joi.string().optional(),
  MONGODB_PASSWORD: Joi.string().optional(),
});

// Redis environment schema
const redisEnvironmentSchema = Joi.object({
  REDIS_URL: Joi.string().uri().optional(),
  REDIS_HOST: Joi.string().hostname().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().min(8).required(),
  REDIS_DB: Joi.number().integer().min(0).default(0),
});

// JWT environment schema
const jwtEnvironmentSchema = Joi.object({
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
});

// Message queue environment schema
const messageQueueEnvironmentSchema = Joi.object({
  KAFKA_BROKERS: Joi.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: Joi.string().default('ultramarket'),
});

// External services environment schema
const externalServicesEnvironmentSchema = Joi.object({
  ELASTICSEARCH_URL: Joi.string().uri().optional(),
  ELASTICSEARCH_USERNAME: Joi.string().optional(),
  ELASTICSEARCH_PASSWORD: Joi.string().optional(),
  STRIPE_SECRET_KEY: Joi.string().optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
  STRIPE_PUBLISHABLE_KEY: Joi.string().optional(),
  PAYPAL_CLIENT_ID: Joi.string().optional(),
  PAYPAL_CLIENT_SECRET: Joi.string().optional(),
  PAYPAL_MODE: Joi.string().valid('sandbox', 'live').default('sandbox'),
  SMTP_HOST: Joi.string().hostname().optional(),
  SMTP_PORT: Joi.number().port().optional(),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASSWORD: Joi.string().optional(),
  SMTP_FROM: Joi.string().email().optional(),
});

// =================== SERVICE-SPECIFIC SCHEMAS ===================

export const serviceEnvironmentSchemas = {
  'auth-service': baseEnvironmentSchema
    .concat(databaseEnvironmentSchema)
    .concat(redisEnvironmentSchema)
    .concat(jwtEnvironmentSchema),

  'user-service': baseEnvironmentSchema
    .concat(databaseEnvironmentSchema)
    .concat(redisEnvironmentSchema)
    .concat(messageQueueEnvironmentSchema),

  'product-service': baseEnvironmentSchema
    .concat(databaseEnvironmentSchema)
    .concat(redisEnvironmentSchema)
    .concat(messageQueueEnvironmentSchema)
    .concat(
      externalServicesEnvironmentSchema.fork([
        'ELASTICSEARCH_URL',
        'ELASTICSEARCH_USERNAME',
        'ELASTICSEARCH_PASSWORD',
      ])
    ),

  'order-service': baseEnvironmentSchema
    .concat(databaseEnvironmentSchema)
    .concat(redisEnvironmentSchema)
    .concat(messageQueueEnvironmentSchema),

  'payment-service': baseEnvironmentSchema
    .concat(databaseEnvironmentSchema)
    .concat(redisEnvironmentSchema)
    .concat(messageQueueEnvironmentSchema)
    .concat(
      externalServicesEnvironmentSchema.fork([
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'PAYPAL_CLIENT_ID',
        'PAYPAL_CLIENT_SECRET',
      ])
    ),

  'cart-service': baseEnvironmentSchema
    .concat(databaseEnvironmentSchema)
    .concat(redisEnvironmentSchema)
    .concat(messageQueueEnvironmentSchema),

  'notification-service': baseEnvironmentSchema
    .concat(databaseEnvironmentSchema)
    .concat(redisEnvironmentSchema)
    .concat(messageQueueEnvironmentSchema)
    .concat(
      externalServicesEnvironmentSchema.fork([
        'SMTP_HOST',
        'SMTP_PORT',
        'SMTP_USER',
        'SMTP_PASSWORD',
        'SMTP_FROM',
      ])
    ),

  'search-service': baseEnvironmentSchema
    .concat(databaseEnvironmentSchema)
    .concat(redisEnvironmentSchema)
    .concat(messageQueueEnvironmentSchema)
    .concat(
      externalServicesEnvironmentSchema.fork([
        'ELASTICSEARCH_URL',
        'ELASTICSEARCH_USERNAME',
        'ELASTICSEARCH_PASSWORD',
      ])
    ),

  'api-gateway': baseEnvironmentSchema.concat(redisEnvironmentSchema).concat(jwtEnvironmentSchema),

  'pc-builder-service': baseEnvironmentSchema
    .concat(redisEnvironmentSchema)
    .concat(messageQueueEnvironmentSchema),

  'dynamic-pricing-service': baseEnvironmentSchema
    .concat(redisEnvironmentSchema)
    .concat(messageQueueEnvironmentSchema),

  'analytics-service': baseEnvironmentSchema
    .concat(databaseEnvironmentSchema)
    .concat(redisEnvironmentSchema),

  'inventory-service': baseEnvironmentSchema
    .concat(databaseEnvironmentSchema)
    .concat(redisEnvironmentSchema)
    .concat(messageQueueEnvironmentSchema),

  'review-service': baseEnvironmentSchema
    .concat(databaseEnvironmentSchema)
    .concat(redisEnvironmentSchema)
    .concat(messageQueueEnvironmentSchema),

  'shipping-service': baseEnvironmentSchema
    .concat(databaseEnvironmentSchema)
    .concat(redisEnvironmentSchema)
    .concat(messageQueueEnvironmentSchema),
};

// =================== VALIDATION FUNCTIONS ===================

/**
 * Validate environment variables for a specific service
 */
export function validateEnvironment(
  serviceName: string,
  env: Record<string, string | undefined> = process.env
): {
  error?: string;
  value?: Record<string, unknown>;
} {
  const schema = serviceEnvironmentSchemas[serviceName];

  if (!schema) {
    return {
      error: `Unknown service: ${serviceName}. Available services: ${Object.keys(serviceEnvironmentSchemas).join(', ')}`,
    };
  }

  const { error, value } = schema.validate(env, {
    allowUnknown: true,
    stripUnknown: false,
    abortEarly: false,
  });

  if (error) {
    const errorMessage = error.details
      .map((detail) => `${detail.path.join('.')}: ${detail.message}`)
      .join(', ');

    return {
      error: `Environment validation failed for ${serviceName}: ${errorMessage}`,
    };
  }

  return { value };
}

/**
 * Create environment validator middleware
 */
export function createEnvironmentValidator(serviceName: string) {
  return (req: unknown, res: unknown, next: () => void) => {
    const { error } = validateEnvironment(serviceName);

    if (error) {
      logger.error(`Environment validation error: ${error}`);
      process.exit(1);
    }

    next();
  };
}

/**
 * Validate environment on startup with professional error handling
 */
export function validateEnvironmentOnStartup(serviceName: string): void {
  const { error, value } = validateEnvironment(serviceName);

  if (error) {
    logger.error(`🚨 Environment validation failed for ${serviceName}:`, error);
    
    // Log detailed error information
    logger.error('Environment validation details:', {
      service: serviceName,
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      missingVariables: getMissingVariables(serviceName),
    });
    
    process.exit(1);
  }

  logger.info(`✅ Environment validation passed for ${serviceName}`);

  // Log important configuration in development
  if (process.env.NODE_ENV === 'development') {
    logger.info('📋 Configuration:', {
      NODE_ENV: value?.NODE_ENV,
      PORT: value?.PORT,
      HOST: value?.HOST,
      API_VERSION: value?.API_VERSION,
      LOG_LEVEL: value?.LOG_LEVEL,
    });
  }
}

/**
 * Get missing required environment variables
 */
function getMissingVariables(serviceName: string): string[] {
  const schema = serviceEnvironmentSchemas[serviceName];
  if (!schema) return [];

  const missing: string[] = [];
  const env = process.env;

  // Check required fields from schema
  const requiredFields = Object.keys(schema.describe().keys || {});
  
  for (const field of requiredFields) {
    if (!env[field]) {
      missing.push(field);
    }
  }

  return missing;
}

/**
 * Validate critical environment variables
 */
export function validateCriticalEnvironment(): void {
  const criticalVars = [
    'NODE_ENV',
    'POSTGRES_PASSWORD',
    'MONGODB_PASSWORD',
    'REDIS_PASSWORD',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missing = criticalVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    logger.error('🚨 Critical environment variables missing:', missing);
    logger.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
}

// =================== EXPORTS ===================

// Export individual schemas for testing
export {
  baseEnvironmentSchema,
  databaseEnvironmentSchema,
  redisEnvironmentSchema,
  jwtEnvironmentSchema,
  messageQueueEnvironmentSchema,
  externalServicesEnvironmentSchema,
};

// Default export
export default {
  validateEnvironment,
  validateEnvironmentOnStartup,
  createEnvironmentValidator,
  validateCriticalEnvironment,
  serviceEnvironmentSchemas,
};
