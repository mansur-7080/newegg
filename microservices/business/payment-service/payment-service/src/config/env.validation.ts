import Joi from 'joi';

const envValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development')
    .description('Application environment'),

  PORT: Joi.number()
    .port()
    .default(3005)
    .description('Application port'),

  HOST: Joi.string()
    .hostname()
    .default('0.0.0.0')
    .description('Application host'),

  // Database
  DATABASE_URL: Joi.string()
    .uri()
    .required()
    .description('PostgreSQL database URL'),

  // Redis
  REDIS_HOST: Joi.string().hostname().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_DB: Joi.number().default(0),

  // JWT
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .description('JWT secret key'),

  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .required()
    .description('JWT refresh secret key'),

  // Payment Gateways
  CLICK_SECRET_KEY: Joi.string()
    .required()
    .description('Click payment gateway secret key'),

  CLICK_MERCHANT_ID: Joi.string()
    .required()
    .description('Click merchant ID'),

  CLICK_SERVICE_ID: Joi.string()
    .required()
    .description('Click service ID'),

  PAYME_SECRET_KEY: Joi.string()
    .required()
    .description('Payme payment gateway secret key'),

  PAYME_MERCHANT_ID: Joi.string()
    .required()
    .description('Payme merchant ID'),

  // CORS
  ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000'),

  // API URLs
  FRONTEND_URL: Joi.string()
    .uri()
    .default('http://localhost:3000')
    .description('Frontend URL'),

  ADMIN_URL: Joi.string()
    .uri()
    .default('http://localhost:3001')
    .description('Admin panel URL'),

  API_BASE_URL: Joi.string()
    .uri()
    .optional()
    .description('API base URL'),

  // External Services
  ORDER_SERVICE_URL: Joi.string()
    .uri()
    .default('http://localhost:3004')
    .description('Order service URL'),

  NOTIFICATION_SERVICE_URL: Joi.string()
    .uri()
    .default('http://localhost:3007')
    .description('Notification service URL'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info')
    .description('Log level'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number()
    .default(900000)
    .description('Rate limit window in milliseconds'),

  RATE_LIMIT_MAX_REQUESTS: Joi.number()
    .default(100)
    .description('Maximum requests per window'),

  // Security
  CORS_ORIGIN: Joi.string()
    .default('http://localhost:3000')
    .description('CORS origin'),

  // Webhook
  WEBHOOK_SECRET: Joi.string()
    .min(32)
    .required()
    .description('Webhook secret for verification'),

  // Monitoring
  ENABLE_METRICS: Joi.boolean()
    .default(true)
    .description('Enable metrics collection'),

  METRICS_PORT: Joi.number()
    .port()
    .default(9090)
    .description('Metrics port'),
});

export const validateEnvironment = (): void => {
  const { error, value } = envValidationSchema.validate(process.env, {
    allowUnknown: true,
    stripUnknown: true,
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
  console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Configured' : 'Missing'}`);
  console.log(`🔐 JWT: ${process.env.JWT_SECRET ? 'Configured' : 'Missing'}`);
  console.log(`💳 Click: ${process.env.CLICK_SECRET_KEY ? 'Configured' : 'Missing'}`);
  console.log(`💳 Payme: ${process.env.PAYME_SECRET_KEY ? 'Configured' : 'Missing'}`);
};

export const getRequiredEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
};

export const getOptionalEnvVar = (name: string, defaultValue: string): string => {
  return process.env[name] || defaultValue;
};

export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

export const isTest = (): boolean => {
  return process.env.NODE_ENV === 'test';
};
