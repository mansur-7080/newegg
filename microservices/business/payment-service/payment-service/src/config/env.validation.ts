import Joi from 'joi';
import { logger } from '../utils/logger';

const envSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3006),
  
  // Database
  DATABASE_URL: Joi.string().required(),
  
  // JWT
  JWT_SECRET: Joi.string().min(64).required(),
  JWT_REFRESH_SECRET: Joi.string().min(64).required(),
  
  // Payment Gateways
  CLICK_MERCHANT_ID: Joi.string().required(),
  CLICK_SECRET_KEY: Joi.string().required(),
  PAYME_MERCHANT_ID: Joi.string().required(),
  PAYME_SECRET_KEY: Joi.string().required(),
  
  // Redis
  REDIS_HOST: Joi.string().hostname().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  
  // CORS
  ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000'),
  
  // External Services
  ORDER_SERVICE_URL: Joi.string().uri().required(),
  NOTIFICATION_SERVICE_URL: Joi.string().uri().required(),
});

export const validateEnv = () => {
  try {
    const { error, value } = envSchema.validate(process.env, {
      allowUnknown: true,
      stripUnknown: true,
    });

    if (error) {
      logger.error('❌ Environment validation failed:', error.details);
      throw new Error(`Environment validation failed: ${error.message}`);
    }

    logger.info('✅ Environment validation passed');
    return true;
  } catch (error) {
    logger.error('❌ Environment validation error:', error);
    throw error;
  }
};
