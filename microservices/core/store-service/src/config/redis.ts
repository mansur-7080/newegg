import { createClient, RedisClientType } from 'redis';

export interface RedisConfig {
  url: string;
  password?: string;
  database: number;
  maxRetries: number;
  retryDelay: number;
  connectTimeout: number;
}

export const redisConfig: RedisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD,
  database: parseInt(process.env.REDIS_DB || '0'),
  maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
  retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000'),
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000'),
};

// Redis client singleton
let redisClient: RedisClientType;

export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    redisClient = createClient({
      url: redisConfig.url,
      password: redisConfig.password,
      database: redisConfig.database,
      socket: {
        connectTimeout: redisConfig.connectTimeout,
        reconnectStrategy: (retries) => {
          if (retries > redisConfig.maxRetries) {
            return new Error('Redis connection failed after max retries');
          }
          return Math.min(retries * redisConfig.retryDelay, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis is ready to accept commands');
    });

    redisClient.on('end', () => {
      console.log('Redis connection ended');
    });

    redisClient.on('reconnecting', () => {
      console.log('Redis reconnecting...');
    });
  }

  return redisClient;
}

export async function connectRedis(): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client.isOpen) {
      await client.connect();
    }
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    // Redis is optional, don't throw error
  }
}

export async function disconnectRedis(): Promise<void> {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.disconnect();
      console.log('✅ Redis disconnected successfully');
    }
  } catch (error) {
    console.error('❌ Redis disconnection failed:', error);
  }
}

export async function healthCheckRedis(): Promise<boolean> {
  try {
    const client = getRedisClient();
    if (!client.isOpen) {
      return false;
    }
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

// Cache helper functions
export class CacheService {
  private client: RedisClientType;

  constructor() {
    this.client = getRedisClient();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.client.isOpen) {
        return null;
      }
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<boolean> {
    try {
      if (!this.client.isOpen) {
        return false;
      }
      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.client.isOpen) {
        return false;
      }
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.client.isOpen) {
        return false;
      }
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  async increment(key: string, value: number = 1): Promise<number> {
    try {
      if (!this.client.isOpen) {
        return 0;
      }
      return await this.client.incrBy(key, value);
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      if (!this.client.isOpen) {
        return false;
      }
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }

  generateKey(prefix: string, ...parts: string[]): string {
    return `store_service:${prefix}:${parts.join(':')}`;
  }
}