/**
 * UltraMarket Environment Validation
 * Comprehensive validation for all microservices environment variables
 */

import Joi from 'joi';

// Add Node.js types for process global
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined;
    }
  }
}

// Professional environment validation schemas
export const baseEnvSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
  APP_NAME: Joi.string().default('UltraMarket'),
  APP_VERSION: Joi.string().default('1.0.0'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
});

export const databaseEnvSchema = Joi.object({
  POSTGRES_HOST: Joi.string().required(),
  POSTGRES_PORT: Joi.number().port().default(5432),
  POSTGRES_DB: Joi.string().required(),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().min(12).required(),
  DATABASE_URL: Joi.string().uri().required(),

  MONGODB_HOST: Joi.string().required(),
  MONGODB_PORT: Joi.number().port().default(27017),
  MONGODB_USERNAME: Joi.string().required(),
  MONGODB_PASSWORD: Joi.string().min(12).required(),
  MONGODB_DATABASE: Joi.string().required(),
  MONGODB_URI: Joi.string().uri().required(),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().min(12).required(),
  REDIS_DB: Joi.number().integer().min(0).max(15).default(0),
  REDIS_URL: Joi.string().uri().required(),
});

export const securityEnvSchema = Joi.object({
  JWT_ACCESS_SECRET: Joi.string().min(64).required(),
  JWT_REFRESH_SECRET: Joi.string().min(64).required(),
  JWT_RESET_SECRET: Joi.string().min(64).required(),
  JWT_VERIFICATION_SECRET: Joi.string().min(64).required(),

  JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().default('7d'),
  JWT_RESET_EXPIRY: Joi.string().default('1h'),
  JWT_VERIFICATION_EXPIRY: Joi.string().default('24h'),

  BCRYPT_ROUNDS: Joi.number().integer().min(10).max(14).default(12),
  SESSION_SECRET: Joi.string().min(64).required(),
  ENCRYPTION_KEY: Joi.string().length(32).required(),
});

export const serviceEnvSchema = Joi.object({
  API_GATEWAY_PORT: Joi.number().port().default(3000),
  USER_SERVICE_PORT: Joi.number().port().default(3001),
  AUTH_SERVICE_PORT: Joi.number().port().default(3002),
  PRODUCT_SERVICE_PORT: Joi.number().port().default(3003),
  ORDER_SERVICE_PORT: Joi.number().port().default(3004),
  PAYMENT_SERVICE_PORT: Joi.number().port().default(3005),
  CART_SERVICE_PORT: Joi.number().port().default(3006),
  NOTIFICATION_SERVICE_PORT: Joi.number().port().default(3007),
  SEARCH_SERVICE_PORT: Joi.number().port().default(3008),
  ANALYTICS_SERVICE_PORT: Joi.number().port().default(3009),
});

export const externalServiceEnvSchema = Joi.object({
  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().email().required(),
  SMTP_PASSWORD: Joi.string().min(8).required(),
  FROM_EMAIL: Joi.string().email().required(),

  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().min(20).required(),
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_S3_BUCKET: Joi.string().required(),

  STRIPE_SECRET_KEY: Joi.string()
    .pattern(/^sk_(live|test)_/)
    .required(),
  STRIPE_PUBLISHABLE_KEY: Joi.string()
    .pattern(/^pk_(live|test)_/)
    .required(),
  STRIPE_WEBHOOK_SECRET: Joi.string()
    .pattern(/^whsec_/)
    .required(),

  ELASTICSEARCH_URL: Joi.string().uri().required(),
  ELASTICSEARCH_USERNAME: Joi.string().required(),
  ELASTICSEARCH_PASSWORD: Joi.string().min(8).required(),
  ELASTICSEARCH_INDEX_PREFIX: Joi.string().default('ultramarket'),
});

export const monitoringEnvSchema = Joi.object({
  PROMETHEUS_PORT: Joi.number().port().default(9090),
  GRAFANA_PORT: Joi.number().port().default(3001),
  GRAFANA_ADMIN_USER: Joi.string().default('admin'),
  GRAFANA_ADMIN_PASSWORD: Joi.string().min(8).required(),
  JAEGER_PORT: Joi.number().port().default(16686),
});

export const rateLimitEnvSchema = Joi.object({
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(60000).default(900000),
  RATE_LIMIT_MAX: Joi.number().integer().min(1).max(1000).default(100),
  RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: Joi.boolean().default(true),
});

export const fileUploadEnvSchema = Joi.object({
  MAX_FILE_SIZE: Joi.number().integer().min(1024).max(52428800).default(10485760),
  ALLOWED_FILE_TYPES: Joi.string().default('image/jpeg,image/png,image/webp,application/pdf'),
});

export const thirdPartyEnvSchema = Joi.object({
  TWILIO_ACCOUNT_SID: Joi.string().optional(),
  TWILIO_AUTH_TOKEN: Joi.string().optional(),
  TWILIO_PHONE_NUMBER: Joi.string()
    .pattern(/^\+[1-9]\d{1,14}$/)
    .optional(),

  GOOGLE_ANALYTICS_ID: Joi.string().pattern(/^GA-/).optional(),
  SENTRY_DSN: Joi.string().uri().optional(),
});

// Combined schema for all environments
export const completeEnvSchema = baseEnvSchema
  .concat(databaseEnvSchema)
  .concat(securityEnvSchema)
  .concat(serviceEnvSchema)
  .concat(externalServiceEnvSchema)
  .concat(monitoringEnvSchema)
  .concat(rateLimitEnvSchema)
  .concat(fileUploadEnvSchema)
  .concat(thirdPartyEnvSchema)
  .unknown();

// Service-specific validation schemas
export const userServiceEnvSchema = baseEnvSchema
  .concat(databaseEnvSchema)
  .concat(securityEnvSchema)
  .concat(serviceEnvSchema)
  .concat(rateLimitEnvSchema);

export const cartServiceEnvSchema = baseEnvSchema
  .concat(databaseEnvSchema)
  .concat(serviceEnvSchema)
  .concat(rateLimitEnvSchema);

export const productServiceEnvSchema = baseEnvSchema
  .concat(databaseEnvSchema)
  .concat(serviceEnvSchema)
  .concat(externalServiceEnvSchema)
  .concat(rateLimitEnvSchema);

export const orderServiceEnvSchema = baseEnvSchema
  .concat(databaseEnvSchema)
  .concat(serviceEnvSchema)
  .concat(externalServiceEnvSchema)
  .concat(rateLimitEnvSchema);

// Professional validation function
export function validateEnvironment(
  schema: Joi.ObjectSchema,
  serviceName: string = 'unknown'
): void {
  try {
    const { error, value: envVars } = schema.validate(process.env, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
    });

    if (error) {
      const errorDetails = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));

      console.error(`🚨 Environment validation failed for ${serviceName}:`);
      console.error('Validation errors:', JSON.stringify(errorDetails, null, 2));

      throw new Error(`Environment validation failed for ${serviceName}: ${error.message}`);
    }

    console.log(`✅ Environment validation passed for ${serviceName}`);
    console.log('📋 Configuration:', {
      NODE_ENV: envVars.NODE_ENV,
      APP_NAME: envVars.APP_NAME,
      APP_VERSION: envVars.APP_VERSION,
      LOG_LEVEL: envVars.LOG_LEVEL,
      serviceName,
    });
  } catch (error) {
    console.error(`Environment validation error: ${error}`);
    throw error;
  }
}

// Security validation helpers
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateJWTSecret(secret: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (secret.length < 64) {
    errors.push('JWT secret must be at least 64 characters long');
  }

  if (secret.length > 512) {
    errors.push('JWT secret must not exceed 512 characters');
  }

  // Check for common weak patterns
  const weakPatterns = [
    'password',
    'secret',
    'key',
    'jwt',
    'token',
    'ultramarket',
    'admin',
    'user',
  ];

  const lowerSecret = secret.toLowerCase();
  for (const pattern of weakPatterns) {
    if (lowerSecret.includes(pattern)) {
      errors.push(`JWT secret should not contain common words like "${pattern}"`);
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// All schemas are already exported above
