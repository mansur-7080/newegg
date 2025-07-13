import { createClient } from 'redis';

// Create Redis client
export const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Handle connection events
redis.on('error', (err) => console.error('Redis Client Error', err));
redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('ready', () => console.log('✅ Redis ready'));

// Connect to Redis
redis.connect().catch(console.error);

// Graceful shutdown
process.on('beforeExit', async () => {
  await redis.quit();
});