/**
 * Jest Configuration for UltraMarket
 * Simplified setup for immediate testing
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.(test|spec).(js|ts)',
    '<rootDir>/microservices/**/__tests__/**/*.(test|spec).(js|ts)',
    '<rootDir>/libs/**/__tests__/**/*.(test|spec).(js|ts)',
  ],
  
  // TypeScript configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'libs/**/*.{js,ts}',
    'microservices/**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/*.config.{js,ts}',
    '!**/*.test.{js,ts}',
    '!**/*.spec.{js,ts}',
    '!**/coverage/**',
    '!**/index.ts',
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/coverage/',
  ],
  
  // Module mapping for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/libs/$1',
    '^@libs/(.*)$': '<rootDir>/libs/$1',
    '^@microservices/(.*)$': '<rootDir>/microservices/$1',
  },
  
  // Timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
};