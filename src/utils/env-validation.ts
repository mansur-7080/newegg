import { logger } from './logger';

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  CORS_ORIGIN: string;
}

interface ValidationRule {
  key: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'url';
  minLength?: number;
  pattern?: RegExp;
  description: string;
}

const validationRules: ValidationRule[] = [
  {
    key: 'NODE_ENV',
    required: true,
    type: 'string',
    pattern: /^(development|production|test)$/,
    description: 'Application environment (development, production, test)'
  },
  {
    key: 'PORT',
    required: true,
    type: 'number',
    description: 'Server port number'
  },
  {
    key: 'DATABASE_URL',
    required: true,
    type: 'url',
    minLength: 10,
    description: 'PostgreSQL database connection URL'
  },
  {
    key: 'REDIS_URL',
    required: true,
    type: 'url',
    minLength: 10,
    description: 'Redis connection URL'
  },
  {
    key: 'JWT_SECRET',
    required: true,
    type: 'string',
    minLength: 32,
    description: 'JWT secret key (minimum 32 characters)'
  },
  {
    key: 'JWT_REFRESH_SECRET',
    required: true,
    type: 'string',
    minLength: 32,
    description: 'JWT refresh secret key (minimum 32 characters)'
  },
  {
    key: 'CORS_ORIGIN',
    required: true,
    type: 'string',
    minLength: 1,
    description: 'Allowed CORS origins (comma-separated)'
  },
  {
    key: 'BCRYPT_ROUNDS',
    required: false,
    type: 'number',
    description: 'Bcrypt hashing rounds (default: 10)'
  },
  {
    key: 'LOG_LEVEL',
    required: false,
    type: 'string',
    pattern: /^(error|warn|info|http|verbose|debug|silly)$/,
    description: 'Logging level'
  },
  {
    key: 'RATE_LIMIT_WINDOW_MS',
    required: false,
    type: 'number',
    description: 'Rate limiting window in milliseconds'
  },
  {
    key: 'RATE_LIMIT_MAX_REQUESTS',
    required: false,
    type: 'number',
    description: 'Maximum requests per window'
  }
];

class ValidationError extends Error {
  constructor(message: string, public errors: string[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

function validateType(value: string, type: string): any {
  switch (type) {
    case 'string':
      return value;
    case 'number':
      const num = Number(value);
      if (isNaN(num)) {
        throw new Error(`Expected number, got: ${value}`);
      }
      return num;
    case 'boolean':
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
      throw new Error(`Expected boolean (true/false), got: ${value}`);
    case 'url':
      try {
        new URL(value);
        return value;
      } catch {
        throw new Error(`Expected valid URL, got: ${value}`);
      }
    default:
      return value;
  }
}

function validateRule(rule: ValidationRule, value: string | undefined): string | null {
  const { key, required, type, minLength, pattern, description } = rule;

  // Check if required field is missing
  if (required && (value === undefined || value === '')) {
    return `${key} is required: ${description}`;
  }

  // Skip validation if not required and not provided
  if (!required && (value === undefined || value === '')) {
    return null;
  }

  try {
    // Type validation
    const typedValue = validateType(value!, type);

    // Length validation for strings
    if (type === 'string' && minLength && value!.length < minLength) {
      return `${key} must be at least ${minLength} characters long`;
    }

    // Pattern validation
    if (pattern && !pattern.test(value!)) {
      return `${key} format is invalid: ${description}`;
    }

    return null;
  } catch (error) {
    return `${key} validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

export function validateEnvironment(): EnvConfig {
  const errors: string[] = [];
  const config: Partial<EnvConfig> = {};

  logger.info('🔍 Validating environment variables...');

  // Validate each rule
  for (const rule of validationRules) {
    const value = process.env[rule.key];
    const error = validateRule(rule, value);
    
    if (error) {
      errors.push(error);
    } else if (value !== undefined && value !== '') {
      // Store validated value
      try {
        (config as any)[rule.key] = validateType(value, rule.type);
      } catch (typeError) {
        errors.push(`${rule.key}: ${typeError instanceof Error ? typeError.message : 'Type validation failed'}`);
      }
    }
  }

  // Production-specific validations
  if (process.env.NODE_ENV === 'production') {
    const productionChecks = [
      {
        condition: process.env.JWT_SECRET?.includes('development') || process.env.JWT_SECRET?.includes('test'),
        message: 'JWT_SECRET must not contain development/test values in production'
      },
      {
        condition: process.env.JWT_REFRESH_SECRET?.includes('development') || process.env.JWT_REFRESH_SECRET?.includes('test'),
        message: 'JWT_REFRESH_SECRET must not contain development/test values in production'
      },
      {
        condition: !process.env.DATABASE_URL?.includes('ssl=true') && !process.env.POSTGRES_SSL,
        message: 'SSL should be enabled for database connections in production'
      },
      {
        condition: process.env.LOG_LEVEL === 'debug',
        message: 'LOG_LEVEL should not be debug in production'
      }
    ];

    for (const check of productionChecks) {
      if (check.condition) {
        errors.push(`Production Security Warning: ${check.message}`);
      }
    }
  }

  // Check for common misconfigurations
  const misconfigurationChecks = [
    {
      condition: process.env.PORT && (parseInt(process.env.PORT) < 1 || parseInt(process.env.PORT) > 65535),
      message: 'PORT must be between 1 and 65535'
    },
    {
      condition: process.env.BCRYPT_ROUNDS && parseInt(process.env.BCRYPT_ROUNDS) < 8,
      message: 'BCRYPT_ROUNDS should be at least 8 for security'
    }
  ];

  for (const check of misconfigurationChecks) {
    if (check.condition) {
      errors.push(`Configuration Warning: ${check.message}`);
    }
  }

  // If there are errors, log them and throw
  if (errors.length > 0) {
    logger.error('❌ Environment validation failed:');
    errors.forEach(error => logger.error(`  - ${error}`));
    
    throw new ValidationError('Environment validation failed', errors);
  }

  logger.info('✅ Environment validation passed');
  
  // Log configuration summary (without sensitive values)
  logger.info('📋 Configuration Summary:', {
    NODE_ENV: config.NODE_ENV,
    PORT: config.PORT,
    DATABASE: config.DATABASE_URL ? 'Configured' : 'Missing',
    REDIS: config.REDIS_URL ? 'Configured' : 'Missing',
    JWT: config.JWT_SECRET ? 'Configured' : 'Missing',
    CORS_ORIGIN: config.CORS_ORIGIN
  });

  return config as EnvConfig;
}

export function getEnvSummary(): Record<string, any> {
  return {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_CONFIGURED: !!process.env.DATABASE_URL,
    REDIS_CONFIGURED: !!process.env.REDIS_URL,
    JWT_CONFIGURED: !!process.env.JWT_SECRET,
    CORS_ORIGINS: process.env.CORS_ORIGIN?.split(',').length || 0,
    LOG_LEVEL: process.env.LOG_LEVEL,
    TIMESTAMP: new Date().toISOString()
  };
}

// Export validation error class
export { ValidationError };