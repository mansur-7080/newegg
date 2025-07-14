import Joi from 'joi';

interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  FRONTEND_URL: string;
  ADMIN_URL?: string;
  CLICK_SERVICE_ID?: string;
  CLICK_SECRET_KEY?: string;
  CLICK_USER_ID?: string;
  PAYME_MERCHANT_ID?: string;
  PAYME_SECRET_KEY?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_BUCKET_NAME?: string;
  AWS_REGION?: string;
  SENTRY_DSN?: string;
  LOG_LEVEL: string;
}

const environmentSchema = Joi.object<EnvironmentConfig>({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  
  PORT: Joi.number()
    .port()
    .default(5000),
  
  DATABASE_URL: Joi.string()
    .uri()
    .required()
    .messages({
      'any.required': 'DATABASE_URL is required. Please set a valid PostgreSQL connection string.',
      'string.uri': 'DATABASE_URL must be a valid URI (e.g., postgresql://user:password@host:port/database)',
    }),
  
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .messages({
      'any.required': 'JWT_SECRET is required for token signing',
      'string.min': 'JWT_SECRET must be at least 32 characters long for security',
    }),
  
  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .required()
    .messages({
      'any.required': 'JWT_REFRESH_SECRET is required for refresh token signing',
      'string.min': 'JWT_REFRESH_SECRET must be at least 32 characters long for security',
    }),
  
  JWT_EXPIRES_IN: Joi.string()
    .default('15m')
    .pattern(/^\d+[smhd]$/)
    .messages({
      'string.pattern.base': 'JWT_EXPIRES_IN must be in format like "15m", "1h", "7d"',
    }),
  
  JWT_REFRESH_EXPIRES_IN: Joi.string()
    .default('7d')
    .pattern(/^\d+[smhd]$/)
    .messages({
      'string.pattern.base': 'JWT_REFRESH_EXPIRES_IN must be in format like "15m", "1h", "7d"',
    }),
  
  REDIS_HOST: Joi.string()
    .hostname()
    .default('localhost'),
  
  REDIS_PORT: Joi.number()
    .port()
    .default(6379),
  
  REDIS_PASSWORD: Joi.string()
    .optional()
    .allow('')
    .messages({
      'string.empty': 'REDIS_PASSWORD should not be empty in production',
    }),
  
  FRONTEND_URL: Joi.string()
    .uri()
    .required()
    .messages({
      'any.required': 'FRONTEND_URL is required for CORS configuration',
      'string.uri': 'FRONTEND_URL must be a valid URL',
    }),
  
  ADMIN_URL: Joi.string()
    .uri()
    .optional(),
  
  // Payment gateway credentials (optional in development)
  CLICK_SERVICE_ID: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required().messages({
        'any.required': 'CLICK_SERVICE_ID is required in production for Click.uz payments',
      }),
      otherwise: Joi.optional(),
    }),
  
  CLICK_SECRET_KEY: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required().messages({
        'any.required': 'CLICK_SECRET_KEY is required in production for Click.uz payments',
      }),
      otherwise: Joi.optional(),
    }),
  
  CLICK_USER_ID: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required().messages({
        'any.required': 'CLICK_USER_ID is required in production for Click.uz payments',
      }),
      otherwise: Joi.optional(),
    }),
  
  PAYME_MERCHANT_ID: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required().messages({
        'any.required': 'PAYME_MERCHANT_ID is required in production for Payme.uz payments',
      }),
      otherwise: Joi.optional(),
    }),
  
  PAYME_SECRET_KEY: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required().messages({
        'any.required': 'PAYME_SECRET_KEY is required in production for Payme.uz payments',
      }),
      otherwise: Joi.optional(),
    }),
  
  // SMTP configuration (optional)
  SMTP_HOST: Joi.string()
    .hostname()
    .optional(),
  
  SMTP_PORT: Joi.number()
    .port()
    .optional(),
  
  SMTP_USER: Joi.string()
    .email()
    .optional(),
  
  SMTP_PASSWORD: Joi.string()
    .optional(),
  
  // AWS configuration (optional)
  AWS_ACCESS_KEY_ID: Joi.string()
    .optional(),
  
  AWS_SECRET_ACCESS_KEY: Joi.string()
    .optional(),
  
  AWS_BUCKET_NAME: Joi.string()
    .optional(),
  
  AWS_REGION: Joi.string()
    .optional(),
  
  // Monitoring
  SENTRY_DSN: Joi.string()
    .uri()
    .optional(),
  
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
});

export function validateEnvironment(): EnvironmentConfig {
  const { error, value } = environmentSchema.validate(process.env, {
    allowUnknown: true,
    stripUnknown: false,
    abortEarly: false,
  });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message).join('\n');
    
    console.error('❌ Environment validation failed:');
    console.error(errorMessages);
    console.error('\nPlease check your environment variables and try again.');
    
    process.exit(1);
  }

  // Additional security checks for production
  if (value.NODE_ENV === 'production') {
    const productionWarnings: string[] = [];

    if (!value.REDIS_PASSWORD) {
      productionWarnings.push('⚠️  REDIS_PASSWORD not set - Redis is unprotected');
    }

    if (value.JWT_SECRET === 'ultramarket_jwt_secret') {
      productionWarnings.push('🚨 JWT_SECRET is using default value - SECURITY RISK!');
    }

    if (!value.SENTRY_DSN) {
      productionWarnings.push('⚠️  SENTRY_DSN not set - Error tracking disabled');
    }

    if (!value.CLICK_SERVICE_ID || !value.PAYME_MERCHANT_ID) {
      productionWarnings.push('⚠️  Payment gateway credentials missing - Payments disabled');
    }

    if (productionWarnings.length > 0) {
      console.warn('\n🔒 Production Security Warnings:');
      productionWarnings.forEach(warning => console.warn(warning));
      console.warn('');
    }
  }

  return value;
}

export const env = validateEnvironment();

// Export typed environment variables
export default env;