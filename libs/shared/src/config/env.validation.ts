import Joi from 'joi';
import { config } from 'dotenv';

// Load environment variables
config();

// Environment validation schema
const envSchema = Joi.object({
  // Application Configuration
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  FRONTEND_URL: Joi.string().uri().required(),
  API_GATEWAY_URL: Joi.string().uri().required(),

  // Database Configuration
  POSTGRES_HOST: Joi.string().hostname().required(),
  POSTGRES_PORT: Joi.number().port().default(5432),
  POSTGRES_DB: Joi.string().required(),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().min(8).required(),

  // MongoDB Configuration
  MONGODB_URI: Joi.string().uri().required(),
  MONGODB_USER: Joi.string().required(),
  MONGODB_PASSWORD: Joi.string().min(8).required(),

  // Redis Configuration
  REDIS_HOST: Joi.string().hostname().required(),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().min(8).required(),

  // JWT Configuration
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.number().integer().min(300).default(900),
  JWT_REFRESH_EXPIRES_IN: Joi.number().integer().min(3600).default(604800),

  // Encryption Configuration
  ENCRYPTION_KEY: Joi.string().length(32).required(),

  // Email Configuration
  SMTP_HOST: Joi.string().hostname().required(),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_USER: Joi.string().email().required(),
  SMTP_PASSWORD: Joi.string().min(1).required(),
  SMTP_FROM: Joi.string().email().required(),

  // SMS Services (Uzbekistan)
  ESKIZ_API_KEY: Joi.string().required(),
  ESKIZ_EMAIL: Joi.string().email().required(),
  ESKIZ_PASSWORD: Joi.string().min(1).required(),

  PLAYMOBILE_API_KEY: Joi.string().required(),
  PLAYMOBILE_PASSWORD: Joi.string().min(1).required(),

  // Payment Gateways (Uzbekistan)
  CLICK_MERCHANT_ID: Joi.string().required(),
  CLICK_SECRET_KEY: Joi.string().min(8).required(),
  CLICK_SERVICE_ID: Joi.string().required(),

  PAYME_MERCHANT_ID: Joi.string().required(),
  PAYME_SECRET_KEY: Joi.string().min(8).required(),

  UZCARD_MERCHANT_ID: Joi.string().required(),
  UZCARD_SECRET_KEY: Joi.string().min(8).required(),

  // External APIs
  CURRENCY_API_KEY: Joi.string().required(),

  // OAuth Configuration
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().min(8).required(),
  GOOGLE_MAPS_API_KEY: Joi.string().required(),

  // CORS Configuration
  CORS_ORIGIN: Joi.string().required(),
  ALLOWED_ORIGINS: Joi.string().required(),

  // Logging Configuration
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_SERVICE_URL: Joi.string().uri().required(),

  // Security Configuration
  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(10).max(16).default(12),
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(60000).default(900000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().integer().min(10).max(1000).default(100),

  // Monitoring Configuration
  PROMETHEUS_PORT: Joi.number().port().default(9090),
  GRAFANA_PORT: Joi.number().port().default(3000),

  // Service URLs
  AUTH_SERVICE_URL: Joi.string().uri().required(),
  USER_SERVICE_URL: Joi.string().uri().required(),
  PRODUCT_SERVICE_URL: Joi.string().uri().required(),
  ORDER_SERVICE_URL: Joi.string().uri().required(),
  CART_SERVICE_URL: Joi.string().uri().required(),
  PAYMENT_SERVICE_URL: Joi.string().uri().required(),
  INVENTORY_SERVICE_URL: Joi.string().uri().required(),
  REVIEW_SERVICE_URL: Joi.string().uri().required(),
  NOTIFICATION_SERVICE_URL: Joi.string().uri().required(),
  SEARCH_SERVICE_URL: Joi.string().uri().required(),
  ANALYTICS_SERVICE_URL: Joi.string().uri().required(),
  FILE_SERVICE_URL: Joi.string().uri().required(),
  CONTENT_SERVICE_URL: Joi.string().uri().required(),
  AUDIT_SERVICE_URL: Joi.string().uri().required(),
  NAVIGATION_SERVICE_URL: Joi.string().uri().required(),
  RECOMMENDATION_SERVICE_URL: Joi.string().uri().required(),
  FRAUD_DETECTION_SERVICE_URL: Joi.string().uri().required(),
  VENDOR_MANAGEMENT_SERVICE_URL: Joi.string().uri().required(),
  DYNAMIC_PRICING_SERVICE_URL: Joi.string().uri().required(),
  SHIPPING_SERVICE_URL: Joi.string().uri().required(),
  TECH_PRODUCT_SERVICE_URL: Joi.string().uri().required(),
  PC_BUILDER_SERVICE_URL: Joi.string().uri().required(),
  CONFIG_SERVICE_URL: Joi.string().uri().required(),
  STORE_SERVICE_URL: Joi.string().uri().required(),
});

// Validate environment variables
export const validateEnvironment = (): void => {
  const { error, value } = envSchema.validate(process.env, {
    allowUnknown: true,
    stripUnknown: true,
  });

  if (error) {
    console.error('❌ Environment validation failed:');
    error.details.forEach((detail) => {
      console.error(`  - ${detail.message}`);
    });
    console.error('\nPlease check your environment configuration.');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
  
  // Log sensitive information in development only
  if (process.env.NODE_ENV === 'development') {
    console.log('📋 Environment Summary:');
    console.log(`  - Node Environment: ${value.NODE_ENV}`);
    console.log(`  - Port: ${value.PORT}`);
    console.log(`  - Database: ${value.POSTGRES_HOST}:${value.POSTGRES_PORT}`);
    console.log(`  - Redis: ${value.REDIS_HOST}:${value.REDIS_PORT}`);
    console.log(`  - JWT Expires In: ${value.JWT_EXPIRES_IN}s`);
    console.log(`  - Rate Limit: ${value.RATE_LIMIT_MAX_REQUESTS} requests per ${value.RATE_LIMIT_WINDOW_MS}ms`);
  }
};

// Export validated environment variables
export const env = envSchema.validate(process.env, {
  allowUnknown: true,
  stripUnknown: true,
}).value;

// Helper function to get environment variable with validation
export const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value || defaultValue!;
};

// Helper function to get boolean environment variable
export const getEnvBool = (key: string, defaultValue = false): boolean => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

// Helper function to get number environment variable
export const getEnvNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  const numValue = value ? parseInt(value, 10) : defaultValue!;
  if (isNaN(numValue)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return numValue;
};

// Security validation
export const validateSecurityConfig = (): void => {
  const securityIssues: string[] = [];

  // Check JWT secrets strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    securityIssues.push('JWT_SECRET must be at least 32 characters long');
  }

  if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
    securityIssues.push('JWT_REFRESH_SECRET must be at least 32 characters long');
  }

  // Check encryption key
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length !== 32) {
    securityIssues.push('ENCRYPTION_KEY must be exactly 32 characters long');
  }

  // Check password strength
  if (process.env.POSTGRES_PASSWORD && process.env.POSTGRES_PASSWORD.length < 8) {
    securityIssues.push('POSTGRES_PASSWORD must be at least 8 characters long');
  }

  if (process.env.MONGODB_PASSWORD && process.env.MONGODB_PASSWORD.length < 8) {
    securityIssues.push('MONGODB_PASSWORD must be at least 8 characters long');
  }

  if (process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD.length < 8) {
    securityIssues.push('REDIS_PASSWORD must be at least 8 characters long');
  }

  if (securityIssues.length > 0) {
    console.error('🔒 Security validation failed:');
    securityIssues.forEach((issue) => {
      console.error(`  - ${issue}`);
    });
    console.error('\nPlease fix these security issues before proceeding.');
    process.exit(1);
  }

  console.log('🔒 Security validation passed');
};

// Export validation functions
export default {
  validateEnvironment,
  validateSecurityConfig,
  env,
  getEnvVar,
  getEnvBool,
  getEnvNumber,
};