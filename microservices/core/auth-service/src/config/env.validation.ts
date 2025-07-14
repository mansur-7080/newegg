/**
 * Environment Validation for Auth Service
 * Professional environment variable validation with security checks
 */

import { logger } from '../utils/logger';

interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EMAIL_VERIFICATION_SECRET: string;
  JWT_PASSWORD_RESET_SECRET: string;
  CORS_ORIGIN: string[];
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  FRONTEND_URL: string;
  API_URL: string;
  LOG_LEVEL: string;
  SENTRY_DSN?: string;
  SENTRY_ENVIRONMENT?: string;
}

export function validateEnv(): EnvironmentConfig {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required environment variables
  const requiredVars = [
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'JWT_EMAIL_VERIFICATION_SECRET',
    'JWT_PASSWORD_RESET_SECRET',
  ];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  // Validate JWT secrets strength
  const jwtSecrets = [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'JWT_EMAIL_VERIFICATION_SECRET',
    'JWT_PASSWORD_RESET_SECRET',
  ];

  for (const secretName of jwtSecrets) {
    const secret = process.env[secretName];
    if (secret && secret.length < 32) {
      warnings.push(`${secretName} should be at least 32 characters long for security`);
    }
    if (secret && secret === 'your-super-secret-key-here') {
      errors.push(`${secretName} is using default value - change for production`);
    }
  }

  // Validate PORT
  const port = parseInt(process.env.PORT || '3001', 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push('PORT must be a valid number between 1 and 65535');
  }

  // Validate NODE_ENV
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (!['development', 'staging', 'production', 'test'].includes(nodeEnv)) {
    errors.push('NODE_ENV must be one of: development, staging, production, test');
  }

  // Validate DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && !databaseUrl.startsWith('postgresql://')) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
  }

  // Validate REDIS_URL
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  if (!redisUrl.startsWith('redis://')) {
    errors.push('REDIS_URL must be a valid Redis connection string');
  }

  // Validate CORS_ORIGIN
  const corsOrigin = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
  if (corsOrigin.length === 0) {
    errors.push('CORS_ORIGIN must contain at least one origin');
  }

  // Validate rate limiting
  const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10);
  const rateLimitMaxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
  
  if (isNaN(rateLimitWindowMs) || rateLimitWindowMs < 60000) {
    errors.push('RATE_LIMIT_WINDOW_MS must be at least 60000ms (1 minute)');
  }
  
  if (isNaN(rateLimitMaxRequests) || rateLimitMaxRequests < 1) {
    errors.push('RATE_LIMIT_MAX_REQUESTS must be at least 1');
  }

  // Validate SMTP configuration
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    if (isNaN(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
      errors.push('SMTP_PORT must be a valid port number');
    }
  } else {
    warnings.push('SMTP configuration is incomplete - email features will be disabled');
  }

  // Validate URLs
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const apiUrl = process.env.API_URL || 'http://localhost:3001';

  if (!frontendUrl.startsWith('http://') && !frontendUrl.startsWith('https://')) {
    errors.push('FRONTEND_URL must be a valid URL');
  }

  if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
    errors.push('API_URL must be a valid URL');
  }

  // Validate log level
  const logLevel = process.env.LOG_LEVEL || 'info';
  const validLogLevels = ['error', 'warn', 'info', 'debug'];
  if (!validLogLevels.includes(logLevel)) {
    errors.push(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
  }

  // Security warnings for development
  if (nodeEnv === 'development') {
    if (process.env.JWT_ACCESS_SECRET === 'your-super-secret-access-key-here-make-it-long-and-secure') {
      warnings.push('Using default JWT secrets in development - change for production');
    }
    
    if (process.env.DATABASE_URL?.includes('localhost')) {
      warnings.push('Using local database in development - ensure proper configuration for production');
    }
  }

  // Production security checks
  if (nodeEnv === 'production') {
    if (!process.env.SENTRY_DSN) {
      warnings.push('SENTRY_DSN not configured - error tracking will be disabled');
    }
    
    if (corsOrigin.includes('*')) {
      errors.push('CORS_ORIGIN cannot be * in production - specify exact origins');
    }
    
    if (process.env.JWT_ACCESS_SECRET?.length && process.env.JWT_ACCESS_SECRET.length < 64) {
      errors.push('JWT_ACCESS_SECRET must be at least 64 characters in production');
    }
  }

  // Log validation results
  if (errors.length > 0) {
    logger.error('Environment validation failed', { errors });
    throw new Error(`Environment validation failed: ${errors.join(', ')}`);
  }

  if (warnings.length > 0) {
    logger.warn('Environment validation warnings', { warnings });
  }

  logger.info('Environment validation passed');

  // Return validated configuration
  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: databaseUrl!,
    REDIS_URL: redisUrl,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
    JWT_EMAIL_VERIFICATION_SECRET: process.env.JWT_EMAIL_VERIFICATION_SECRET!,
    JWT_PASSWORD_RESET_SECRET: process.env.JWT_PASSWORD_RESET_SECRET!,
    CORS_ORIGIN: corsOrigin,
    RATE_LIMIT_WINDOW_MS: rateLimitWindowMs,
    RATE_LIMIT_MAX_REQUESTS: rateLimitMaxRequests,
    SMTP_HOST: smtpHost || '',
    SMTP_PORT: smtpPort,
    SMTP_USER: smtpUser || '',
    SMTP_PASS: smtpPass || '',
    FRONTEND_URL: frontendUrl,
    API_URL: apiUrl,
    LOG_LEVEL: logLevel,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT || nodeEnv,
  };
}

/**
 * Validate environment for specific service
 */
export function validateEnvironmentOnStartup(serviceName: string): void {
  try {
    const config = validateEnv();
    logger.info(`${serviceName} environment validation completed`, {
      service: serviceName,
      nodeEnv: config.NODE_ENV,
      port: config.PORT,
      logLevel: config.LOG_LEVEL,
    });
  } catch (error) {
    logger.error(`${serviceName} environment validation failed`, {
      service: serviceName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  return validateEnv();
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * Get database configuration
 */
export function getDatabaseConfig() {
  const config = validateEnv();
  return {
    url: config.DATABASE_URL,
    ssl: isProduction() ? { rejectUnauthorized: false } : false,
    logging: isDevelopment(),
  };
}

/**
 * Get Redis configuration
 */
export function getRedisConfig() {
  const config = validateEnv();
  return {
    url: config.REDIS_URL,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  };
}

/**
 * Get JWT configuration
 */
export function getJWTConfig() {
  const config = validateEnv();
  return {
    accessSecret: config.JWT_ACCESS_SECRET,
    refreshSecret: config.JWT_REFRESH_SECRET,
    emailVerificationSecret: config.JWT_EMAIL_VERIFICATION_SECRET,
    passwordResetSecret: config.JWT_PASSWORD_RESET_SECRET,
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    emailVerificationExpiry: '24h',
    passwordResetExpiry: '1h',
  };
}

/**
 * Get CORS configuration
 */
export function getCORSConfig() {
  const config = validateEnv();
  return {
    origin: config.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  };
}

/**
 * Get rate limiting configuration
 */
export function getRateLimitConfig() {
  const config = validateEnv();
  return {
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX_REQUESTS,
    message: {
      error: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  };
}

/**
 * Get SMTP configuration
 */
export function getSMTPConfig() {
  const config = validateEnv();
  return {
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  };
}
