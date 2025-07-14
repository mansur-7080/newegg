import Redis from 'ioredis';
import { logger } from '../utils/logger';

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true;
        }
        return false;
      },
    });

    redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redis.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redis.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });
  }

  return redis;
}

export async function connectRedis(): Promise<void> {
  try {
    const client = getRedisClient();
    await client.ping();
    logger.info('Redis connection test successful');
  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
}

export async function disconnectRedis(): Promise<void> {
  try {
    if (redis) {
      await redis.quit();
      redis = null;
      logger.info('Redis disconnected successfully');
    }
  } catch (error) {
    logger.error('Redis disconnection failed:', error);
    throw error;
  }
}

export class RedisService {
  private client: Redis;

  constructor() {
    this.client = getRedisClient();
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis get error:', { key, error });
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.set(key, value, 'EX', ttl);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis set error:', { key, error });
    }
  }

  async setex(key: string, ttl: number, value: string): Promise<void> {
    try {
      await this.client.setex(key, ttl, value);
    } catch (error) {
      logger.error('Redis setex error:', { key, error });
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Redis del error:', { key, error });
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis exists error:', { key, error });
      return false;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      logger.error('Redis expire error:', { key, error });
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error('Redis incr error:', { key, error });
      return 0;
    }
  }

  async decr(key: string): Promise<number> {
    try {
      return await this.client.decr(key);
    } catch (error) {
      logger.error('Redis decr error:', { key, error });
      return 0;
    }
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    try {
      await this.client.hset(key, field, value);
    } catch (error) {
      logger.error('Redis hset error:', { key, field, error });
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.client.hget(key, field);
    } catch (error) {
      logger.error('Redis hget error:', { key, field, error });
      return null;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hgetall(key);
    } catch (error) {
      logger.error('Redis hgetall error:', { key, error });
      return {};
    }
  }

  async sadd(key: string, ...members: string[]): Promise<void> {
    try {
      await this.client.sadd(key, ...members);
    } catch (error) {
      logger.error('Redis sadd error:', { key, error });
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      logger.error('Redis smembers error:', { key, error });
      return [];
    }
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    try {
      await this.client.srem(key, ...members);
    } catch (error) {
      logger.error('Redis srem error:', { key, error });
    }
  }
}