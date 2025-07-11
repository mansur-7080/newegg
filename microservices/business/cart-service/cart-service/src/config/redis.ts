import Redis from 'redis';
import { logger } from '../utils/logger';

const redisClient = Redis.createClient({
  url: process.env['REDIS_URL'] || 'redis://localhost:6379',
  password: process.env['REDIS_PASSWORD'] || 'redis123',
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    logger.info('✅ Redis connected successfully');

    // Test connection
    await redisClient.ping();
    logger.info('✅ Redis ping successful');
  } catch (error) {
    logger.error('❌ Redis connection failed:', error);
    throw error;
  }
};

export const getRedisClient = () => redisClient;

// Graceful shutdown
process.on('SIGTERM', async () => {
  await redisClient.quit();
});

process.on('SIGINT', async () => {
  await redisClient.quit();
});
