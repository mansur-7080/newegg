import { logger } from '@ultramarket/shared/logging';

/**
 * Jest Global Setup
 * Runs once before all test suites
 */

module.exports = async () => {
  // Set global test environment
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';

  // Database setup
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/ultramarket_test';

  // Redis setup
  process.env.REDIS_URL = 'redis://localhost:6379/15';

  // JWT secrets for testing
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-purposes-only-must-be-at-least-32-characters';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-key-for-testing-purposes-only-must-be-at-least-32-characters';

  // Other test environment variables
  process.env.CORS_ORIGIN = '*';
  process.env.RATE_LIMIT_WINDOW_MS = '900000';
  process.env.RATE_LIMIT_MAX_REQUESTS = '1000';

  logger.log('🧪 Jest global setup completed');
};
