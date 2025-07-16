import joi from 'joi';

// Environment variables validation schema
const envSchema = joi.object({
  NODE_ENV: joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
    
  PORT: joi.number()
    .port()
    .default(3005),
    
  // Database configuration
  DATABASE_URL: joi.string()
    .uri()
    .when('NODE_ENV', {
      is: 'production',
      then: joi.required(),
      otherwise: joi.optional(),
    }),
    
  // Storage configuration
  STORAGE_TYPE: joi.string()
    .valid('local', 's3', 'gcs', 'azure')
    .default('local'),
    
  STORAGE_PATH: joi.string()
    .default('./uploads'),
    
  // AWS S3 configuration (if using S3)
  AWS_ACCESS_KEY_ID: joi.string()
    .when('STORAGE_TYPE', {
      is: 's3',
      then: joi.required(),
      otherwise: joi.optional(),
    }),
    
  AWS_SECRET_ACCESS_KEY: joi.string()
    .when('STORAGE_TYPE', {
      is: 's3',
      then: joi.required(),
      otherwise: joi.optional(),
    }),
    
  AWS_REGION: joi.string()
    .when('STORAGE_TYPE', {
      is: 's3',
      then: joi.required(),
      otherwise: joi.optional(),
    }),
    
  AWS_S3_BUCKET: joi.string()
    .when('STORAGE_TYPE', {
      is: 's3',
      then: joi.required(),
      otherwise: joi.optional(),
    }),
    
  // CDN configuration
  CDN_URL: joi.string()
    .uri()
    .optional(),
    
  // File upload limits
  MAX_FILE_SIZE: joi.number()
    .min(1)
    .default(100 * 1024 * 1024), // 100MB default
    
  MAX_FILES_PER_REQUEST: joi.number()
    .min(1)
    .max(50)
    .default(10),
    
  // Security configuration
  FILE_SERVICE_API_KEY: joi.string()
    .min(32)
    .when('NODE_ENV', {
      is: 'production',
      then: joi.required(),
      otherwise: joi.optional(),
    }),
    
  // Redis configuration for caching
  REDIS_URL: joi.string()
    .uri()
    .optional(),
    
  REDIS_HOST: joi.string()
    .hostname()
    .default('localhost'),
    
  REDIS_PORT: joi.number()
    .port()
    .default(6379),
    
  REDIS_PASSWORD: joi.string()
    .optional(),
    
  // Logging configuration
  LOG_LEVEL: joi.string()
    .valid('error', 'warn', 'info', 'verbose', 'debug', 'silly')
    .default('info'),
    
  // Image processing configuration
  IMAGE_QUALITY_DEFAULT: joi.number()
    .min(1)
    .max(100)
    .default(80),
    
  THUMBNAIL_SIZE_DEFAULT: joi.number()
    .min(50)
    .max(500)
    .default(150),
    
  // Virus scanning configuration
  ENABLE_VIRUS_SCAN: joi.boolean()
    .default(false),
    
  CLAMAV_HOST: joi.string()
    .hostname()
    .when('ENABLE_VIRUS_SCAN', {
      is: true,
      then: joi.required(),
      otherwise: joi.optional(),
    }),
    
  CLAMAV_PORT: joi.number()
    .port()
    .when('ENABLE_VIRUS_SCAN', {
      is: true,
      then: joi.required(),
      otherwise: joi.optional(),
    }),
    
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: joi.number()
    .min(1000)
    .default(15 * 60 * 1000), // 15 minutes
    
  RATE_LIMIT_MAX_REQUESTS: joi.number()
    .min(1)
    .default(1000),
    
  UPLOAD_RATE_LIMIT_MAX: joi.number()
    .min(1)
    .default(50),
    
  // Monitoring and health checks
  HEALTH_CHECK_INTERVAL: joi.number()
    .min(1000)
    .default(30000), // 30 seconds
    
  // Cleanup configuration
  TEMP_FILE_CLEANUP_INTERVAL: joi.number()
    .min(60000)
    .default(300000), // 5 minutes
    
  TEMP_FILE_MAX_AGE: joi.number()
    .min(60000)
    .default(3600000), // 1 hour
}).unknown();

export function validateEnv(): void {
  const { error, value: envVars } = envSchema.validate(process.env);
  
  if (error) {
    throw new Error(`Environment validation error: ${error.message}`);
  }
  
  // Set validated environment variables back to process.env
  Object.assign(process.env, envVars);
  
  console.log('✅ Environment variables validated successfully');
  console.log(`🚀 File Service running in ${process.env.NODE_ENV} mode`);
  console.log(`🗄️  Storage type: ${process.env.STORAGE_TYPE}`);
  console.log(`📁 Storage path: ${process.env.STORAGE_PATH}`);
  console.log(`🔍 Log level: ${process.env.LOG_LEVEL}`);
}

export function getConfig() {
  return {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3005'),
    storage: {
      type: process.env.STORAGE_TYPE || 'local',
      path: process.env.STORAGE_PATH || './uploads',
      aws: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
        bucket: process.env.AWS_S3_BUCKET,
      },
    },
    upload: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB
      maxFilesPerRequest: parseInt(process.env.MAX_FILES_PER_REQUEST || '10'),
    },
    security: {
      apiKey: process.env.FILE_SERVICE_API_KEY,
    },
    redis: {
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
    },
    imageProcessing: {
      defaultQuality: parseInt(process.env.IMAGE_QUALITY_DEFAULT || '80'),
      defaultThumbnailSize: parseInt(process.env.THUMBNAIL_SIZE_DEFAULT || '150'),
    },
    virusScanning: {
      enabled: process.env.ENABLE_VIRUS_SCAN === 'true',
      clamav: {
        host: process.env.CLAMAV_HOST,
        port: parseInt(process.env.CLAMAV_PORT || '3310'),
      },
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
      uploadMaxRequests: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX || '50'),
    },
    cleanup: {
      tempFileCleanupInterval: parseInt(process.env.TEMP_FILE_CLEANUP_INTERVAL || '300000'), // 5 minutes
      tempFileMaxAge: parseInt(process.env.TEMP_FILE_MAX_AGE || '3600000'), // 1 hour
    },
  };
}