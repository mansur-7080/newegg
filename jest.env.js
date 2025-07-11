/**
 * Jest Environment Variables Setup
 * Sets up environment variables for testing
 */

// Set Node environment
process.env.NODE_ENV = 'test';

// Database configuration
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/ultramarket_test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'ultramarket_test';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';

// Redis configuration
process.env.REDIS_URL = 'redis://localhost:6379/15';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_DB = '15';

// JWT configuration
process.env.JWT_SECRET =
  'test-jwt-secret-key-for-testing-purposes-only-must-be-at-least-32-characters';
process.env.JWT_REFRESH_SECRET =
  'test-jwt-refresh-secret-key-for-testing-purposes-only-must-be-at-least-32-characters';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// API configuration
process.env.API_PORT = '3000';
process.env.API_HOST = 'localhost';
process.env.API_VERSION = '1.0.0';

// CORS configuration
process.env.CORS_ORIGIN = '*';
process.env.CORS_METHODS = 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS';
process.env.CORS_ALLOWED_HEADERS = 'Content-Type,Authorization,X-Requested-With,X-API-Key';

// Rate limiting
process.env.RATE_LIMIT_WINDOW_MS = '900000'; // 15 minutes
process.env.RATE_LIMIT_MAX_REQUESTS = '1000';

// File upload
process.env.UPLOAD_MAX_SIZE = '10485760'; // 10MB
process.env.UPLOAD_ALLOWED_TYPES = 'image/jpeg,image/png,image/gif,image/webp,application/pdf';

// Logging
process.env.LOG_LEVEL = 'error';
process.env.LOG_FORMAT = 'json';
process.env.LOG_COLORIZE = 'false';

// Security
process.env.BCRYPT_ROUNDS = '10';
process.env.SESSION_SECRET = 'test-session-secret-for-testing-purposes-only';
process.env.COOKIE_SECRET = 'test-cookie-secret-for-testing-purposes-only';

// External services (mock endpoints for testing)
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_stripe_key_for_testing';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake_webhook_secret';
process.env.PAYPAL_CLIENT_ID = 'test_paypal_client_id';
process.env.PAYPAL_CLIENT_SECRET = 'test_paypal_client_secret';

// Email service
process.env.EMAIL_SERVICE = 'test';
process.env.EMAIL_HOST = 'localhost';
process.env.EMAIL_PORT = '587';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASS = 'test_password';

// Storage
process.env.STORAGE_TYPE = 'local';
process.env.STORAGE_PATH = './temp/test-uploads';

// Monitoring
process.env.ENABLE_METRICS = 'false';
process.env.ENABLE_TRACING = 'false';
process.env.HEALTH_CHECK_INTERVAL = '30000';

// Feature flags
process.env.ENABLE_CACHING = 'true';
process.env.ENABLE_RATE_LIMITING = 'true';
process.env.ENABLE_COMPRESSION = 'true';
process.env.ENABLE_HELMET = 'true';

// Test-specific flags
process.env.SKIP_DB_SETUP = 'false';
process.env.SKIP_REDIS_SETUP = 'false';
process.env.MOCK_EXTERNAL_SERVICES = 'true';
process.env.DISABLE_LOGS = 'true';

console.log('🔧 Jest environment variables configured');
