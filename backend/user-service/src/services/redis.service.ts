import Redis from 'redis';
import { config } from '../config/database';
import { logger } from '../utils/logger';

export class RedisService {
  private client: Redis.RedisClientType;

  constructor() {
    this.client = Redis.createClient({
      url: config.redis.url,
      password: config.redis.password,
    });

    this.client.on('error', (err) => {
      logger.error('Redis Client Error', { error: err.message });
    });

    this.client.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    this.client.on('ready', () => {
      logger.info('Redis Client Ready');
    });

    this.client.on('end', () => {
      logger.info('Redis Client Disconnected');
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis', { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
    } catch (error) {
      logger.error('Failed to disconnect from Redis', { error: error instanceof Error ? error.message : error });
    }
  }

  /**
   * Set refresh token
   */
  async setRefreshToken(userId: string, token: string): Promise<void> {
    try {
      const key = `refresh_token:${userId}`;
      await this.client.set(key, token, { EX: 7 * 24 * 60 * 60 }); // 7 days
      logger.debug('Refresh token stored', { userId });
    } catch (error) {
      logger.error('Failed to store refresh token', { error: error instanceof Error ? error.message : error, userId });
      throw error;
    }
  }

  /**
   * Get refresh token
   */
  async getRefreshToken(userId: string): Promise<string | null> {
    try {
      const key = `refresh_token:${userId}`;
      const token = await this.client.get(key);
      return token;
    } catch (error) {
      logger.error('Failed to get refresh token', { error: error instanceof Error ? error.message : error, userId });
      return null;
    }
  }

  /**
   * Remove refresh token
   */
  async removeRefreshToken(userId: string): Promise<void> {
    try {
      const key = `refresh_token:${userId}`;
      await this.client.del(key);
      logger.debug('Refresh token removed', { userId });
    } catch (error) {
      logger.error('Failed to remove refresh token', { error: error instanceof Error ? error.message : error, userId });
      throw error;
    }
  }

  /**
   * Set password reset token
   */
  async setPasswordResetToken(userId: string, token: string): Promise<void> {
    try {
      const key = `password_reset:${userId}`;
      await this.client.set(key, token, { EX: 60 * 60 }); // 1 hour
      logger.debug('Password reset token stored', { userId });
    } catch (error) {
      logger.error('Failed to store password reset token', { error: error instanceof Error ? error.message : error, userId });
      throw error;
    }
  }

  /**
   * Get password reset token
   */
  async getPasswordResetToken(userId: string): Promise<string | null> {
    try {
      const key = `password_reset:${userId}`;
      const token = await this.client.get(key);
      return token;
    } catch (error) {
      logger.error('Failed to get password reset token', { error: error instanceof Error ? error.message : error, userId });
      return null;
    }
  }

  /**
   * Remove password reset token
   */
  async removePasswordResetToken(userId: string): Promise<void> {
    try {
      const key = `password_reset:${userId}`;
      await this.client.del(key);
      logger.debug('Password reset token removed', { userId });
    } catch (error) {
      logger.error('Failed to remove password reset token', { error: error instanceof Error ? error.message : error, userId });
      throw error;
    }
  }

  /**
   * Set user session
   */
  async setUserSession(sessionId: string, userData: any): Promise<void> {
    try {
      const key = `session:${sessionId}`;
      await this.client.set(key, JSON.stringify(userData), { EX: 24 * 60 * 60 }); // 24 hours
      logger.debug('User session stored', { sessionId });
    } catch (error) {
      logger.error('Failed to store user session', { error: error instanceof Error ? error.message : error, sessionId });
      throw error;
    }
  }

  /**
   * Get user session
   */
  async getUserSession(sessionId: string): Promise<any | null> {
    try {
      const key = `session:${sessionId}`;
      const sessionData = await this.client.get(key);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      logger.error('Failed to get user session', { error: error instanceof Error ? error.message : error, sessionId });
      return null;
    }
  }

  /**
   * Remove user session
   */
  async removeUserSession(sessionId: string): Promise<void> {
    try {
      const key = `session:${sessionId}`;
      await this.client.del(key);
      logger.debug('User session removed', { sessionId });
    } catch (error) {
      logger.error('Failed to remove user session', { error: error instanceof Error ? error.message : error, sessionId });
      throw error;
    }
  }

  /**
   * Set rate limit
   */
  async setRateLimit(key: string, limit: number, window: number): Promise<number> {
    try {
      const current = await this.client.incr(key);
      if (current === 1) {
        await this.client.expire(key, window);
      }
      return current;
    } catch (error) {
      logger.error('Failed to set rate limit', { error: error instanceof Error ? error.message : error, key });
      throw error;
    }
  }

  /**
   * Get rate limit
   */
  async getRateLimit(key: string): Promise<number> {
    try {
      const current = await this.client.get(key);
      return current ? parseInt(current) : 0;
    } catch (error) {
      logger.error('Failed to get rate limit', { error: error instanceof Error ? error.message : error, key });
      return 0;
    }
  }

  /**
   * Set cache
   */
  async setCache(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), { EX: ttl });
      logger.debug('Cache set', { key, ttl });
    } catch (error) {
      logger.error('Failed to set cache', { error: error instanceof Error ? error.message : error, key });
      throw error;
    }
  }

  /**
   * Get cache
   */
  async getCache(key: string): Promise<any | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Failed to get cache', { error: error instanceof Error ? error.message : error, key });
      return null;
    }
  }

  /**
   * Remove cache
   */
  async removeCache(key: string): Promise<void> {
    try {
      await this.client.del(key);
      logger.debug('Cache removed', { key });
    } catch (error) {
      logger.error('Failed to remove cache', { error: error instanceof Error ? error.message : error, key });
      throw error;
    }
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    try {
      await this.client.flushdb();
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Failed to clear cache', { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * Get Redis info
   */
  async getInfo(): Promise<any> {
    try {
      const info = await this.client.info();
      return info;
    } catch (error) {
      logger.error('Failed to get Redis info', { error: error instanceof Error ? error.message : error });
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed', { error: error instanceof Error ? error.message : error });
      return false;
    }
  }
}