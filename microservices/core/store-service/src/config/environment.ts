import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3004),
  HOST: Joi.string().default('localhost'),
  DATABASE_URL: Joi.string().required(),
  CORS_ORIGIN: Joi.string().default('*'),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(500),
  APP_VERSION: Joi.string().default('1.0.0'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
}).unknown();

export const validateEnvironment = (): void => {
  const { error } = envSchema.validate(process.env);
  
  if (error) {
    throw new Error(`Environment validation error: ${error.details[0].message}`);
  }
};