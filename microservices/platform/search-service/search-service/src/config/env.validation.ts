import Joi from 'joi';
import { logger } from '../utils/logger';

const envSchema = Joi.object({
  // Server Configuration
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3007),
  HOST: Joi.string().default('localhost'),

  // CORS Configuration
  ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000'),

  // JWT Configuration
  JWT_SECRET: Joi.string().required().messages({
    'any.required': 'JWT_SECRET is required for authentication',
  }),

  // Elasticsearch Configuration
  ELASTICSEARCH_NODE: Joi.string().uri().default('http://localhost:9200'),
  ELASTICSEARCH_USERNAME: Joi.string().optional(),
  ELASTICSEARCH_PASSWORD: Joi.string().optional(),
  ELASTICSEARCH_INDEX_PREFIX: Joi.string().default('ultramarket'),

  // Redis Configuration (for caching)
  REDIS_URL: Joi.string().uri().default('redis://localhost:6379'),
  REDIS_PASSWORD: Joi.string().optional(),

  // External Services
  PRODUCT_SERVICE_URL: Joi.string().uri().default('http://localhost:3003'),
  USER_SERVICE_URL: Joi.string().uri().default('http://localhost:3001'),

  // Search Configuration
  SEARCH_MAX_RESULTS: Joi.number().integer().min(1).max(1000).default(100),
  SEARCH_DEFAULT_SIZE: Joi.number().integer().min(1).max(100).default(20),
  SEARCH_TIMEOUT: Joi.number().integer().min(1000).max(30000).default(5000),

  // Indexing Configuration
  INDEX_BATCH_SIZE: Joi.number().integer().min(1).max(1000).default(100),
  INDEX_REFRESH_INTERVAL: Joi.string().default('1s'),

  // Cache Configuration
  CACHE_TTL: Joi.number().integer().min(60).max(86400).default(3600), // 1 hour
  CACHE_MAX_SIZE: Joi.number().integer().min(100).max(10000).default(1000),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(60000).default(300000), // 5 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().integer().min(100).default(1000),

  // Logging Configuration
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'debug').default('info'),
  LOG_SERVICE_URL: Joi.string().uri().optional(),
  LOG_SERVICE_HOST: Joi.string().optional(),
  LOG_SERVICE_PORT: Joi.number().port().optional(),
  LOG_SERVICE_PATH: Joi.string().optional(),

  // Security Configuration
  TRUSTED_IPS: Joi.string().optional(),
  API_KEY_HEADER: Joi.string().default('X-API-Key'),
  ADMIN_API_KEY: Joi.string().optional(),

  // Monitoring Configuration
  METRICS_ENABLED: Joi.boolean().default(true),
  HEALTH_CHECK_INTERVAL: Joi.number().integer().min(5000).default(30000), // 30 seconds

  // Performance Configuration
  MAX_CONCURRENT_SEARCHES: Joi.number().integer().min(1).max(100).default(10),
  SEARCH_QUEUE_SIZE: Joi.number().integer().min(10).max(1000).default(100),

  // Feature Flags
  ENABLE_SEARCH_ANALYTICS: Joi.boolean().default(true),
  ENABLE_AUTOCOMPLETE: Joi.boolean().default(true),
  ENABLE_SPELL_CHECK: Joi.boolean().default(true),
  ENABLE_SEARCH_SUGGESTIONS: Joi.boolean().default(true),
  ENABLE_FACETED_SEARCH: Joi.boolean().default(true),
}).unknown(true);

export const validateEnv = (): void => {
  const { error, value } = envSchema.validate(process.env, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    logger.error('Environment validation failed:', {
      errors: errorMessages,
      invalidKeys: error.details.map((detail) => detail.path.join('.')),
    });

    console.error('❌ Environment validation failed:');
    errorMessages.forEach((message) => console.error(`  - ${message}`));
    process.exit(1);
  }

  // Update process.env with validated values
  Object.assign(process.env, value);

  logger.info('Environment validation successful', {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    elasticsearchNode: process.env.ELASTICSEARCH_NODE,
    redisUrl: process.env.REDIS_URL,
    logLevel: process.env.LOG_LEVEL,
  });
};

export const getEnvConfig = () => {
  return {
    server: {
      nodeEnv: process.env.NODE_ENV,
      port: parseInt(process.env.PORT || '3007'),
      host: process.env.HOST,
    },
    cors: {
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    },
    jwt: {
      secret: process.env.JWT_SECRET,
    },
    elasticsearch: {
      node: process.env.ELASTICSEARCH_NODE,
      username: process.env.ELASTICSEARCH_USERNAME,
      password: process.env.ELASTICSEARCH_PASSWORD,
      indexPrefix: process.env.ELASTICSEARCH_INDEX_PREFIX,
    },
    redis: {
      url: process.env.REDIS_URL,
      password: process.env.REDIS_PASSWORD,
    },
    services: {
      productService: process.env.PRODUCT_SERVICE_URL,
      userService: process.env.USER_SERVICE_URL,
    },
    search: {
      maxResults: parseInt(process.env.SEARCH_MAX_RESULTS || '100'),
      defaultSize: parseInt(process.env.SEARCH_DEFAULT_SIZE || '20'),
      timeout: parseInt(process.env.SEARCH_TIMEOUT || '5000'),
    },
    indexing: {
      batchSize: parseInt(process.env.INDEX_BATCH_SIZE || '100'),
      refreshInterval: process.env.INDEX_REFRESH_INTERVAL,
    },
    cache: {
      ttl: parseInt(process.env.CACHE_TTL || '3600'),
      maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'),
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '300000'),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
    },
    logging: {
      level: process.env.LOG_LEVEL,
      serviceUrl: process.env.LOG_SERVICE_URL,
      serviceHost: process.env.LOG_SERVICE_HOST,
      servicePort: process.env.LOG_SERVICE_PORT
        ? parseInt(process.env.LOG_SERVICE_PORT)
        : undefined,
      servicePath: process.env.LOG_SERVICE_PATH,
    },
    security: {
      trustedIps: process.env.TRUSTED_IPS?.split(',') || [],
      apiKeyHeader: process.env.API_KEY_HEADER,
      adminApiKey: process.env.ADMIN_API_KEY,
    },
    monitoring: {
      metricsEnabled: process.env.METRICS_ENABLED === 'true',
      healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
    },
    performance: {
      maxConcurrentSearches: parseInt(process.env.MAX_CONCURRENT_SEARCHES || '10'),
      searchQueueSize: parseInt(process.env.SEARCH_QUEUE_SIZE || '100'),
    },
    features: {
      searchAnalytics: process.env.ENABLE_SEARCH_ANALYTICS === 'true',
      autocomplete: process.env.ENABLE_AUTOCOMPLETE === 'true',
      spellCheck: process.env.ENABLE_SPELL_CHECK === 'true',
      searchSuggestions: process.env.ENABLE_SEARCH_SUGGESTIONS === 'true',
      facetedSearch: process.env.ENABLE_FACETED_SEARCH === 'true',
    },
  };
};
