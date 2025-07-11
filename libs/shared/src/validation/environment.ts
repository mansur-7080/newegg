/**
 * Environment Validation
 * Comprehensive environment variable validation for UltraMarket
 */

import { logger } from '../logging/logger';

// Environment validation schema
interface EnvironmentSchema {
  [key: string]: {
    required: boolean;
    type: 'string' | 'number' | 'boolean' | 'url' | 'email';
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    allowedValues?: string[];
    defaultValue?: string | number | boolean;
    description: string;
  };
}

// Comprehensive environment schema
const ENVIRONMENT_SCHEMA: EnvironmentSchema = {
  // Application Configuration
  NODE_ENV: {
    required: true,
    type: 'string',
    allowedValues: ['development', 'test', 'staging', 'production'],
    description: 'Application environment'
  },
  PORT: {
    required: true,
    type: 'number',
    defaultValue: 3000,
    description: 'Application port'
  },
  LOG_LEVEL: {
    required: false,
    type: 'string',
    allowedValues: ['error', 'warn', 'info', 'debug', 'trace'],
    defaultValue: 'info',
    description: 'Logging level'
  },

  // Database Configuration
  DATABASE_URL: {
    required: true,
    type: 'url',
    description: 'PostgreSQL database URL'
  },
  POSTGRES_DB: {
    required: true,
    type: 'string',
    minLength: 1,
    description: 'PostgreSQL database name'
  },
  POSTGRES_USER: {
    required: true,
    type: 'string',
    minLength: 1,
    description: 'PostgreSQL username'
  },
  POSTGRES_PASSWORD: {
    required: true,
    type: 'string',
    minLength: 8,
    description: 'PostgreSQL password'
  },

  // MongoDB Configuration
  MONGODB_URL: {
    required: false,
    type: 'url',
    description: 'MongoDB connection URL'
  },
  MONGO_INITDB_ROOT_USERNAME: {
    required: false,
    type: 'string',
    description: 'MongoDB root username'
  },
  MONGO_INITDB_ROOT_PASSWORD: {
    required: false,
    type: 'string',
    minLength: 8,
    description: 'MongoDB root password'
  },
  MONGO_INITDB_DATABASE: {
    required: false,
    type: 'string',
    description: 'MongoDB database name'
  },

  // Redis Configuration
  REDIS_URL: {
    required: true,
    type: 'url',
    description: 'Redis connection URL'
  },
  REDIS_PASSWORD: {
    required: false,
    type: 'string',
    minLength: 8,
    description: 'Redis password'
  },

  // JWT Configuration
  JWT_SECRET: {
    required: true,
    type: 'string',
    minLength: 32,
    description: 'JWT signing secret'
  },
  JWT_REFRESH_SECRET: {
    required: true,
    type: 'string',
    minLength: 32,
    description: 'JWT refresh secret'
  },
  JWT_EXPIRES_IN: {
    required: false,
    type: 'string',
    defaultValue: '15m',
    description: 'JWT token expiration time'
  },
  JWT_REFRESH_EXPIRES_IN: {
    required: false,
    type: 'string',
    defaultValue: '7d',
    description: 'JWT refresh token expiration time'
  },

  // Security Configuration
  SESSION_SECRET: {
    required: true,
    type: 'string',
    minLength: 32,
    description: 'Session secret'
  },
  COOKIE_SECRET: {
    required: true,
    type: 'string',
    minLength: 32,
    description: 'Cookie secret'
  },
  BCRYPT_ROUNDS: {
    required: false,
    type: 'number',
    defaultValue: 12,
    description: 'BCrypt rounds for password hashing'
  },

  // External Services
  STRIPE_SECRET_KEY: {
    required: false,
    type: 'string',
    pattern: /^sk_(test|live)_/,
    description: 'Stripe secret key'
  },
  STRIPE_WEBHOOK_SECRET: {
    required: false,
    type: 'string',
    pattern: /^whsec_/,
    description: 'Stripe webhook secret'
  },
  PAYPAL_CLIENT_SECRET: {
    required: false,
    type: 'string',
    description: 'PayPal client secret'
  },

  // Monitoring and Logging
  LOG_FILE: {
    required: false,
    type: 'string',
    defaultValue: 'app.log',
    description: 'Log file name'
  },
  LOG_DIR: {
    required: false,
    type: 'string',
    defaultValue: 'logs',
    description: 'Log directory'
  },
  APP_VERSION: {
    required: false,
    type: 'string',
    defaultValue: '1.0.0',
    description: 'Application version'
  },

  // Performance Configuration
  CACHE_TTL: {
    required: false,
    type: 'number',
    defaultValue: 3600,
    description: 'Cache TTL in seconds'
  },
  RATE_LIMIT_WINDOW: {
    required: false,
    type: 'number',
    defaultValue: 900000,
    description: 'Rate limit window in milliseconds'
  },
  RATE_LIMIT_MAX_REQUESTS: {
    required: false,
    type: 'number',
    defaultValue: 100,
    description: 'Maximum requests per window'
  },

  // Service URLs
  USER_SERVICE_URL: {
    required: false,
    type: 'url',
    description: 'User service URL'
  },
  AUTH_SERVICE_URL: {
    required: false,
    type: 'url',
    description: 'Auth service URL'
  },
  PRODUCT_SERVICE_URL: {
    required: false,
    type: 'url',
    description: 'Product service URL'
  },
  ORDER_SERVICE_URL: {
    required: false,
    type: 'url',
    description: 'Order service URL'
  },
  PAYMENT_SERVICE_URL: {
    required: false,
    type: 'url',
    description: 'Payment service URL'
  }
};

// Validation functions
function validateString(value: string, schema: any): string[] {
  const errors: string[] = [];

  if (schema.minLength && value.length < schema.minLength) {
    errors.push(`Minimum length is ${schema.minLength} characters`);
  }

  if (schema.maxLength && value.length > schema.maxLength) {
    errors.push(`Maximum length is ${schema.maxLength} characters`);
  }

  if (schema.pattern && !schema.pattern.test(value)) {
    errors.push(`Value does not match required pattern`);
  }

  if (schema.allowedValues && !schema.allowedValues.includes(value)) {
    errors.push(`Value must be one of: ${schema.allowedValues.join(', ')}`);
  }

  return errors;
}

function validateNumber(value: string, schema: any): string[] {
  const errors: string[] = [];
  const numValue = Number(value);

  if (isNaN(numValue)) {
    errors.push('Value must be a valid number');
    return errors;
  }

  if (schema.min !== undefined && numValue < schema.min) {
    errors.push(`Minimum value is ${schema.min}`);
  }

  if (schema.max !== undefined && numValue > schema.max) {
    errors.push(`Maximum value is ${schema.max}`);
  }

  return errors;
}

function validateBoolean(value: string): string[] {
  const errors: string[] = [];
  const validBooleans = ['true', 'false', '1', '0', 'yes', 'no'];

  if (!validBooleans.includes(value.toLowerCase())) {
    errors.push('Value must be a valid boolean');
  }

  return errors;
}

function validateUrl(value: string): string[] {
  const errors: string[] = [];

  try {
    new URL(value);
  } catch {
    errors.push('Value must be a valid URL');
  }

  return errors;
}

function validateEmail(value: string): string[] {
  const errors: string[] = [];
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(value)) {
    errors.push('Value must be a valid email address');
  }

  return errors;
}

// Main validation function
export function validateEnvironment(serviceName: string = 'ultramarket'): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missing: string[];
  config: Record<string, any>;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missing: string[] = [];
  const config: Record<string, any> = {};

  try {
    // Validate each environment variable
    for (const [key, schema] of Object.entries(ENVIRONMENT_SCHEMA)) {
      const value = process.env[key];

      if (!value) {
        if (schema.required) {
          missing.push(key);
          errors.push(`${key}: ${schema.description} is required`);
        } else if (schema.defaultValue !== undefined) {
          config[key] = schema.defaultValue;
          logger.debug(`Using default value for ${key}: ${schema.defaultValue}`);
        }
        continue;
      }

      let validationErrors: string[] = [];

      // Type validation
      switch (schema.type) {
        case 'string':
          validationErrors = validateString(value, schema);
          break;
        case 'number':
          validationErrors = validateNumber(value, schema);
          break;
        case 'boolean':
          validationErrors = validateBoolean(value);
          break;
        case 'url':
          validationErrors = validateUrl(value);
          break;
        case 'email':
          validationErrors = validateEmail(value);
          break;
      }

      if (validationErrors.length > 0) {
        errors.push(`${key}: ${validationErrors.join(', ')}`);
      } else {
        config[key] = schema.type === 'number' ? Number(value) : 
                     schema.type === 'boolean' ? value.toLowerCase() === 'true' : value;
      }
    }

    // Security warnings
    if (config.NODE_ENV === 'production') {
      if (config.JWT_SECRET && config.JWT_SECRET.length < 64) {
        warnings.push('JWT_SECRET should be at least 64 characters long in production');
      }
      if (config.SESSION_SECRET && config.SESSION_SECRET.length < 64) {
        warnings.push('SESSION_SECRET should be at least 64 characters long in production');
      }
      if (config.LOG_LEVEL === 'debug' || config.LOG_LEVEL === 'trace') {
        warnings.push('Debug logging should be disabled in production');
      }
    }

    // Database connection warnings
    if (config.DATABASE_URL && config.DATABASE_URL.includes('localhost')) {
      warnings.push('Using localhost for database in production is not recommended');
    }

    // Redis connection warnings
    if (config.REDIS_URL && config.REDIS_URL.includes('localhost')) {
      warnings.push('Using localhost for Redis in production is not recommended');
    }

    const isValid = errors.length === 0;

    if (isValid) {
      logger.info(`Environment validation passed for ${serviceName}`, {
        environment: config.NODE_ENV,
        port: config.PORT,
        logLevel: config.LOG_LEVEL
      });
    } else {
           logger.error(`Environment validation failed for ${serviceName}: ${errors.join(', ')}`);
    }

    return {
      isValid,
      errors,
      warnings,
      missing,
      config
    };

  } catch (error) {
    logger.error(`Environment validation error: ${error}`);
    return {
      isValid: false,
      errors: [`Validation error: ${error}`],
      warnings: [],
      missing: [],
      config: {}
    };
  }
}

// Validate specific service environment
export function validateServiceEnvironment(serviceName: string): boolean {
  const result = validateEnvironment(serviceName);
  
  if (!result.isValid) {
    logger.error(`🚨 Environment validation failed for ${serviceName}:`);
    logger.error(result.errors);
    
    if (result.warnings.length > 0) {
      logger.warn('Warnings:', result.warnings);
    }
    
    return false;
  }

  logger.info(`✅ Environment validation passed for ${serviceName}`);
  logger.info('📋 Configuration:', {
    environment: result.config.NODE_ENV,
    port: result.config.PORT,
    logLevel: result.config.LOG_LEVEL,
    database: result.config.DATABASE_URL ? 'configured' : 'not configured',
    redis: result.config.REDIS_URL ? 'configured' : 'not configured'
  });

  return true;
}

// Export schema for external use
export { ENVIRONMENT_SCHEMA };
