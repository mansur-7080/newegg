/**
 * UltraMarket Jest Setup
 * Global test configuration and setup
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/ultramarket_test';
process.env.REDIS_URL = 'redis://localhost:6379/15';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-purposes-only';

// Mock console methods to reduce test noise
const originalConsole = { ...console };

// Only show errors in tests
console.log = jest.fn();
console.info = jest.fn();
console.warn = jest.fn();
console.debug = jest.fn();
console.error = originalConsole.error;

// Global test timeout
jest.setTimeout(30000);

// Mock Date.now for consistent timestamps in tests
const mockDate = new Date('2024-01-01T00:00:00.000Z');
global.Date.now = jest.fn(() => mockDate.getTime());

// Mock Math.random for consistent test results
global.Math.random = jest.fn(() => 0.5);

// Global test utilities
global.testUtils = {
  // Helper to create mock user
  createMockUser: (overrides = {}) => ({
    id: 'mock-user-id-for-testing',
    email: 'mock.user@testing.local',
    username: 'mockuser',
    firstName: 'Mock',
    lastName: 'TestUser',
    role: 'CUSTOMER',
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  // Helper to create mock product
  createMockProduct: (overrides = {}) => ({
    id: 'test-product-id',
    name: 'Test Product',
    slug: 'test-product',
    description: 'Test product description',
    price: 99.99,
    currency: 'USD',
    status: 'ACTIVE',
    isActive: true,
    stock: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  // Helper to create mock request
  createMockRequest: (overrides = {}) => ({
    method: 'GET',
    url: '/test',
    headers: {},
    body: {},
    params: {},
    query: {},
    ...overrides,
  }),

  // Helper to create mock response
  createMockResponse: () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };
    return res;
  },

  // Helper to wait for async operations
  wait: (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms)),

  // Helper to generate test IDs
  generateTestId: (prefix = 'test') => `${prefix}-${Math.random().toString(36).substr(2, 9)}`,
};

// Mock external services
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    flushdb: jest.fn(),
    quit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  }));
});

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  }),
}));

jest.mock('stripe', () => ({
  Stripe: jest.fn().mockImplementation(() => ({
    charges: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
  })),
}));

// Mock Winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    prettyPrint: jest.fn(),
    colorize: jest.fn(),
    printf: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}));

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Clean up after all tests
afterAll(async () => {
  // Close any open handles
  await new Promise((resolve) => setTimeout(resolve, 100));
});
