/**
 * Jest Configuration for UltraMarket Monorepo
 * Professional testing setup with comprehensive coverage
 */

module.exports = {
  // Test environment setup
  testEnvironment: 'node',

  // Global setup and teardown
  globalSetup: '<rootDir>/jest.global-setup.js',
  globalTeardown: '<rootDir>/jest.global-teardown.js',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'libs/**/*.{js,ts}',
    'microservices/**/*.{js,ts}',
    'frontend/**/*.{js,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/*.config.{js,ts}',
    '!**/*.test.{js,ts}',
    '!**/*.spec.{js,ts}',
    '!**/coverage/**',
    '!**/jest.setup.js',
    '!**/babel.config.js',
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

  // Test file patterns
  testMatch: ['**/__tests__/**/*.(test|spec).(js|ts)', '**/*.(test|spec).(js|ts)'],

  // Module resolution
  moduleFileExtensions: ['js', 'ts', 'tsx', 'json'],
  moduleNameMapping: {
    '^@ultramarket/shared/(.*)$': '<rootDir>/libs/shared/src/$1',
    '^@ultramarket/shared$': '<rootDir>/libs/shared/src',
    '^@ultramarket/types/(.*)$': '<rootDir>/libs/types/src/$1',
    '^@ultramarket/types$': '<rootDir>/libs/types/src',
    '^@ultramarket/utils/(.*)$': '<rootDir>/libs/utils/src/$1',
    '^@ultramarket/utils$': '<rootDir>/libs/utils/src',
    '^@ultramarket/constants/(.*)$': '<rootDir>/libs/constants/src/$1',
    '^@ultramarket/constants$': '<rootDir>/libs/constants/src',
    '^@ultramarket/ui-components/(.*)$': '<rootDir>/libs/ui-components/src/$1',
    '^@ultramarket/ui-components$': '<rootDir>/libs/ui-components/src',
  },

  // Transform configuration
  transform: {
    '^.+\\.(js|ts|tsx)$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
          ['@babel/preset-react', { runtime: 'automatic' }],
        ],
        plugins: [
          '@babel/plugin-proposal-class-properties',
          '@babel/plugin-proposal-object-rest-spread',
          '@babel/plugin-transform-runtime',
        ],
      },
    ],
  },

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/', '/coverage/', '.d.ts$'],

  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$|@babel|@jest))'],

  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Timeout configuration
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Error handling
  errorOnDeprecated: true,

  // Performance
  maxWorkers: '50%',

  // Environment variables
  setupFiles: ['<rootDir>/jest.env.js'],

  // Watch mode configuration
  watchman: true,

  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
      },
    ],
  ],

  // Projects configuration for monorepo
  projects: [
    {
      displayName: 'libs',
      testMatch: ['<rootDir>/libs/**/*.(test|spec).(js|ts)'],
      testEnvironment: 'node',
    },
    {
      displayName: 'microservices',
      testMatch: ['<rootDir>/microservices/**/*.(test|spec).(js|ts)'],
      testEnvironment: 'node',
    },
    {
      displayName: 'frontend',
      testMatch: ['<rootDir>/frontend/**/*.(test|spec).(js|ts|tsx)'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.frontend.setup.js'],
    },
  ],

  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>'],

  // Snapshot serializers
  snapshotSerializers: ['enzyme-to-json/serializer'],

  // Test result processor
  testResultsProcessor: 'jest-sonar-reporter',

  // Bail configuration
  bail: false,

  // Cache
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',

  // Notify configuration
  notify: false,
  notifyMode: 'failure-change',

  // Silent mode
  silent: false,

  // Detect open handles
  detectOpenHandles: true,
  forceExit: true,
};
