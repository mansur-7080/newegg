import Joi from 'joi';
import { logger } from '../utils/logger';

/**
 * Environment validation schema for Auth Service
 */
const envSchema = Joi.object({
  // Node environment
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development')
    .description('Application environment'),

  // Server configuration
  PORT: Joi.number().port().default(3001).description('Port number for auth service'),

  HOST: Joi.string().hostname().default('0.0.0.0').description('Host for auth service'),

  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info')
    .description('Log level'),

  // Database configuration
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required()
    .description('PostgreSQL connection URL'),

  DATABASE_SSL: Joi.boolean().default(false).description('Enable SSL for database connection'),

  DATABASE_POOL_MIN: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .default(2)
    .description('Minimum pool size for database connections'),

  DATABASE_POOL_MAX: Joi.number()
    .integer()
    .min(5)
    .max(100)
    .default(10)
    .description('Maximum pool size for database connections'),

  // Redis configuration
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis'] })
    .required()
    .description('Redis connection URL'),

  REDIS_PASSWORD: Joi.string().allow('').description('Redis password'),

  // JWT configuration - STRICT VALIDATION
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .description('Secret for signing JWT tokens')
    .custom((value, helpers) => {
      // Check for common insecure patterns
      const insecurePatterns = [
        'default',
        'secret',
        'key',
        'password',
        'ultramarket',
        'development',
        'test',
        'dev',
        'local'
      ];
      
      const lowerValue = value.toLowerCase();
      if (insecurePatterns.some(pattern => lowerValue.includes(pattern))) {
        return helpers.error('any.invalid', { 
          message: 'JWT_SECRET contains insecure patterns. Use a strong, random secret.' 
        });
      }
      
      return value;
    }),

  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .required()
    .description('Secret for signing refresh tokens')
    .custom((value, helpers) => {
      // Check for common insecure patterns
      const insecurePatterns = [
        'default',
        'secret',
        'key',
        'password',
        'ultramarket',
        'development',
        'test',
        'dev',
        'local'
      ];
      
      const lowerValue = value.toLowerCase();
      if (insecurePatterns.some(pattern => lowerValue.includes(pattern))) {
        return helpers.error('any.invalid', { 
          message: 'JWT_REFRESH_SECRET contains insecure patterns. Use a strong, random secret.' 
        });
      }
      
      return value;
    }),

  JWT_EXPIRES_IN: Joi.string().default('15m').description('JWT token expiration time'),

  JWT_REFRESH_EXPIRES_IN: Joi.string()
    .default('7d')
    .description('JWT refresh token expiration time'),

  // Email verification and password reset secrets
  JWT_EMAIL_VERIFICATION_SECRET: Joi.string()
    .min(32)
    .required()
    .description('Secret for email verification tokens'),

  JWT_PASSWORD_RESET_SECRET: Joi.string()
    .min(32)
    .required()
    .description('Secret for password reset tokens'),

  // Bcrypt configuration
  BCRYPT_SALT_ROUNDS: Joi.number()
    .integer()
    .min(10)
    .max(14)
    .default(12)
    .description('Number of bcrypt salt rounds'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: Joi.number()
    .integer()
    .min(1000)
    .default(15 * 60 * 1000) // 15 minutes
    .description('Rate limiting window in milliseconds'),

  RATE_LIMIT_MAX_REQUESTS: Joi.number()
    .integer()
    .min(1)
    .default(100)
    .description('Maximum number of requests in rate limit window'),

  // Security
  CORS_ORIGINS: Joi.string().default('*').description('Allowed CORS origins (comma-separated)'),

  ENABLE_SWAGGER: Joi.boolean().default(true).description('Enable Swagger documentation'),

  // Email configuration
  SMTP_HOST: Joi.string().hostname().description('SMTP server host'),

  SMTP_PORT: Joi.number().port().default(587).description('SMTP server port'),

  SMTP_USER: Joi.string().description('SMTP server username'),

  SMTP_PASS: Joi.string().description('SMTP server password'),

  SMTP_FROM: Joi.string().email().description('Default sender email address'),

  // Service URLs for inter-service communication
  USER_SERVICE_URL: Joi.string()
    .uri()
    .default('http://localhost:3002')
    .description('User service URL'),

  NOTIFICATION_SERVICE_URL: Joi.string()
    .uri()
    .default('http://localhost:3007')
    .description('Notification service URL'),

  // Session management
  SESSION_SECRET: Joi.string()
    .min(32)
    .required()
    .description('Secret for signing session cookies')
    .custom((value, helpers) => {
      // Check for common insecure patterns
      const insecurePatterns = [
        'default',
        'secret',
        'key',
        'password',
        'ultramarket',
        'development',
        'test',
        'dev',
        'local'
      ];
      
      const lowerValue = value.toLowerCase();
      if (insecurePatterns.some(pattern => lowerValue.includes(pattern))) {
        return helpers.error('any.invalid', { 
          message: 'SESSION_SECRET contains insecure patterns. Use a strong, random secret.' 
        });
      }
      
      return value;
    }),

  // Frontend URL for email links
  FRONTEND_URL: Joi.string()
    .uri()
    .default('http://localhost:3000')
    .description('Frontend URL for email verification links'),
}).unknown(); // Allow unknown environment variables (for flexibility)

/**
 * Validate environment variables against schema
 * @returns validated environment config
 */
export const validateEnv = (): Record<string, any> => {
  logger.info('Validating environment variables for Auth Service');

  try {
    const { error, value } = envSchema.validate(process.env, {
      abortEarly: false, // Show all validation errors at once
      stripUnknown: true, // Remove unknown keys
    });

    if (error) {
      const validationErrors = error.details.map((detail) => ({
        key: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));

      logger.error('❌ Environment validation failed:', {
        errors: validationErrors,
        service: 'auth-service',
        environment: process.env.NODE_ENV,
      });

      throw new Error(`Environment validation failed: ${error.message}`);
    }

    // Additional security checks for production
    if (process.env.NODE_ENV === 'production') {
      const securityChecks = [
        {
          key: 'JWT_SECRET',
          value: value.JWT_SECRET,
          insecurePatterns: ['default', 'secret', 'key', 'password', 'ultramarket', 'development', 'test'],
          message: 'JWT_SECRET contains insecure patterns in production',
        },
        {
          key: 'JWT_REFRESH_SECRET',
          value: value.JWT_REFRESH_SECRET,
          insecurePatterns: ['default', 'secret', 'key', 'password', 'ultramarket', 'development', 'test'],
          message: 'JWT_REFRESH_SECRET contains insecure patterns in production',
        },
        {
          key: 'SESSION_SECRET',
          value: value.SESSION_SECRET,
          insecurePatterns: ['default', 'secret', 'key', 'password', 'ultramarket', 'development', 'test'],
          message: 'SESSION_SECRET contains insecure patterns in production',
        },
        {
          key: 'DATABASE_URL',
          value: value.DATABASE_URL,
          insecurePatterns: ['password', 'ultramarket_password'],
          message: 'DATABASE_URL contains insecure patterns in production',
        },
      ];

      const securityWarnings = securityChecks.filter((check) => {
        const lowerValue = check.value.toLowerCase();
        return check.insecurePatterns.some(pattern => lowerValue.includes(pattern));
      });

      if (securityWarnings.length > 0) {
        securityWarnings.forEach((warning) => {
          logger.error(`⚠️ SECURITY RISK: ${warning.message}`, {
            key: warning.key,
            env: process.env.NODE_ENV,
            service: 'auth-service',
          });
        });

        throw new Error('Security configuration error: Insecure secrets detected in production');
      }

      // Check for strong secrets (at least 32 characters with mixed content)
      const strongSecretChecks = [
        { key: 'JWT_SECRET', value: value.JWT_SECRET },
        { key: 'JWT_REFRESH_SECRET', value: value.JWT_REFRESH_SECRET },
        { key: 'SESSION_SECRET', value: value.SESSION_SECRET },
      ];

      const weakSecrets = strongSecretChecks.filter((check) => {
        const secret = check.value;
        // Check for minimum complexity
        return secret.length < 32 || 
               !/[A-Z]/.test(secret) || 
               !/[a-z]/.test(secret) || 
               !/[0-9]/.test(secret) ||
               !/[^A-Za-z0-9]/.test(secret);
      });

      if (weakSecrets.length > 0) {
        weakSecrets.forEach((secret) => {
          logger.error(`⚠️ WEAK SECRET: ${secret.key} does not meet complexity requirements`, {
            key: secret.key,
            env: process.env.NODE_ENV,
            service: 'auth-service',
            requirements: 'Minimum 32 characters with uppercase, lowercase, numbers, and special characters',
          });
        });

        throw new Error('Security configuration error: Weak secrets detected in production');
      }
    }

    // Update process.env with validated & defaulted values
    Object.assign(process.env, value);

    logger.info('✅ Environment validation passed', {
      environment: process.env.NODE_ENV,
      service: 'auth-service',
      databaseConfigured: !!value.DATABASE_URL,
      redisConfigured: !!value.REDIS_URL,
      emailConfigured: !!(value.SMTP_HOST && value.SMTP_USER && value.SMTP_PASS),
    });

    return value;
  } catch (error) {
    logger.error('Environment validation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      service: 'auth-service',
      environment: process.env.NODE_ENV,
    });
    throw error;
  }
};
