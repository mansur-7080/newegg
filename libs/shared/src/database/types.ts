import { Pool, PoolClient, PoolConfig } from 'pg';
import { MongoClient, Db } from 'mongodb';
import Redis from 'ioredis';
import { logger } from '../logging/logger';

// =================== DATABASE CONFIGURATION TYPES ===================

export interface DatabaseConfig {
  postgres: PostgresConfig;
  mongodb: MongoConfig;
  redis: RedisConfig;
}

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface MongoConfig {
  uri: string;
  database: string;
  options?: {
    maxPoolSize?: number;
    serverSelectionTimeoutMS?: number;
    socketTimeoutMS?: number;
    connectTimeoutMS?: number;
  };
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
}

// =================== DATABASE CONNECTION TYPES ===================

export interface DatabaseConnections {
  postgres: Pool;
  mongodb: MongoClient;
  redis: Redis;
}

export interface DatabaseHealth {
  postgres: boolean;
  mongodb: boolean;
  redis: boolean;
  timestamp: Date;
}

// =================== DATABASE MANAGER CLASS ===================

export class DatabaseManager {
  private postgresPool: Pool | null = null;
  private mongoClient: MongoClient | null = null;
  private redisClient: Redis | null = null;
  private config: DatabaseConfig;
  private isInitialized = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Initialize all database connections
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Database manager already initialized');
      return;
    }

    try {
      logger.info('Initializing database connections...');

      // Initialize PostgreSQL
      await this.initializePostgres();

      // Initialize MongoDB
      await this.initializeMongoDB();

      // Initialize Redis
      await this.initializeRedis();

      this.isInitialized = true;
      logger.info('All database connections initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database connections', error);
      throw error;
    }
  }

  /**
   * Initialize PostgreSQL connection
   */
  private async initializePostgres(): Promise<void> {
    try {
      const poolConfig: PoolConfig = {
        host: this.config.postgres.host,
        port: this.config.postgres.port,
        database: this.config.postgres.database,
        user: this.config.postgres.user,
        password: this.config.postgres.password,
        ssl: this.config.postgres.ssl,
        max: this.config.postgres.maxConnections || 20,
        idleTimeoutMillis: this.config.postgres.idleTimeoutMillis || 30000,
        connectionTimeoutMillis: this.config.postgres.connectionTimeoutMillis || 2000,
      };

      this.postgresPool = new Pool(poolConfig);

      // Test connection
      const client = await this.postgresPool.connect();
      await client.query('SELECT NOW()');
      client.release();

      logger.info('PostgreSQL connection established', {
        host: this.config.postgres.host,
        port: this.config.postgres.port,
        database: this.config.postgres.database,
      });
    } catch (error) {
      logger.error('Failed to initialize PostgreSQL connection', error);
      throw error;
    }
  }

  /**
   * Initialize MongoDB connection
   */
  private async initializeMongoDB(): Promise<void> {
    try {
      this.mongoClient = new MongoClient(this.config.mongodb.uri, {
        maxPoolSize: this.config.mongodb.options?.maxPoolSize || 10,
        serverSelectionTimeoutMS: this.config.mongodb.options?.serverSelectionTimeoutMS || 5000,
        socketTimeoutMS: this.config.mongodb.options?.socketTimeoutMS || 45000,
        connectTimeoutMS: this.config.mongodb.options?.connectTimeoutMS || 10000,
      });

      await this.mongoClient.connect();

      // Test connection
      await this.mongoClient.db().admin().ping();

      logger.info('MongoDB connection established', {
        uri: this.config.mongodb.uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'), // Hide credentials
        database: this.config.mongodb.database,
      });
    } catch (error) {
      logger.error('Failed to initialize MongoDB connection', error);
      throw error;
    }
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    try {
      this.redisClient = new Redis({
        host: this.config.redis.host,
        port: this.config.redis.port,
        password: this.config.redis.password,
        db: this.config.redis.db || 0,
        retryDelayOnFailover: this.config.redis.retryDelayOnFailover || 100,
        maxRetriesPerRequest: this.config.redis.maxRetriesPerRequest || 3,
        lazyConnect: true,
      });

      // Test connection
      await this.redisClient.ping();

      logger.info('Redis connection established', {
        host: this.config.redis.host,
        port: this.config.redis.port,
        db: this.config.redis.db || 0,
      });
    } catch (error) {
      logger.error('Failed to initialize Redis connection', error);
      throw error;
    }
  }

  /**
   * Get PostgreSQL pool
   */
  getPostgresPool(): Pool {
    if (!this.postgresPool) {
      throw new Error('PostgreSQL connection not initialized');
    }
    return this.postgresPool;
  }

  /**
   * Get MongoDB client
   */
  getMongoClient(): MongoClient {
    if (!this.mongoClient) {
      throw new Error('MongoDB connection not initialized');
    }
    return this.mongoClient;
  }

  /**
   * Get MongoDB database
   */
  getMongoDatabase(): Db {
    if (!this.mongoClient) {
      throw new Error('MongoDB connection not initialized');
    }
    return this.mongoClient.db(this.config.mongodb.database);
  }

  /**
   * Get Redis client
   */
  getRedisClient(): Redis {
    if (!this.redisClient) {
      throw new Error('Redis connection not initialized');
    }
    return this.redisClient;
  }

  /**
   * Check database health
   */
  async checkHealth(): Promise<DatabaseHealth> {
    const health: DatabaseHealth = {
      postgres: false,
      mongodb: false,
      redis: false,
      timestamp: new Date(),
    };

    try {
      // Check PostgreSQL
      if (this.postgresPool) {
        const client = await this.postgresPool.connect();
        await client.query('SELECT 1');
        client.release();
        health.postgres = true;
      }
    } catch (error) {
      logger.error('PostgreSQL health check failed', error);
    }

    try {
      // Check MongoDB
      if (this.mongoClient) {
        await this.mongoClient.db().admin().ping();
        health.mongodb = true;
      }
    } catch (error) {
      logger.error('MongoDB health check failed', error);
    }

    try {
      // Check Redis
      if (this.redisClient) {
        await this.redisClient.ping();
        health.redis = true;
      }
    } catch (error) {
      logger.error('Redis health check failed', error);
    }

    return health;
  }

  /**
   * Close all database connections
   */
  async close(): Promise<void> {
    logger.info('Closing database connections...');

    try {
      // Close PostgreSQL pool
      if (this.postgresPool) {
        await this.postgresPool.end();
        this.postgresPool = null;
        logger.info('PostgreSQL connection closed');
      }

      // Close MongoDB client
      if (this.mongoClient) {
        await this.mongoClient.close();
        this.mongoClient = null;
        logger.info('MongoDB connection closed');
      }

      // Close Redis client
      if (this.redisClient) {
        await this.redisClient.quit();
        this.redisClient = null;
        logger.info('Redis connection closed');
      }

      this.isInitialized = false;
      logger.info('All database connections closed successfully');
    } catch (error) {
      logger.error('Error closing database connections', error);
      throw error;
    }
  }

  /**
   * Execute transaction with automatic rollback on error
   */
  async executeTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    if (!this.postgresPool) {
      throw new Error('PostgreSQL connection not initialized');
    }

    const client = await this.postgresPool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    postgres: { totalConnections: number; idleConnections: number };
    mongodb: { collections: number };
    redis: { keys: number; memory: string };
  }> {
    const stats: any = {};

    try {
      // PostgreSQL stats
      if (this.postgresPool) {
        const totalConnections = this.postgresPool.totalCount;
        const idleConnections = this.postgresPool.idleCount;
        stats.postgres = { totalConnections, idleConnections };
      }
    } catch (error) {
      logger.error('Failed to get PostgreSQL stats', error);
    }

    try {
      // MongoDB stats
      if (this.mongoClient) {
        const collections = await this.mongoClient.db().listCollections().toArray();
        stats.mongodb = { collections: collections.length };
      }
    } catch (error) {
      logger.error('Failed to get MongoDB stats', error);
    }

    try {
      // Redis stats
      if (this.redisClient) {
        const keys = await this.redisClient.dbsize();
        const memory = await this.redisClient.info('memory');
        stats.redis = { keys, memory };
      }
    } catch (error) {
      logger.error('Failed to get Redis stats', error);
    }

    return stats;
  }
}

// =================== DATABASE UTILITIES ===================

/**
 * Create database configuration from environment variables
 */
export function createDatabaseConfig(): DatabaseConfig {
  return {
    postgres: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'ultramarket',
      user: process.env.POSTGRES_USER || 'ultramarket_user',
      password: process.env.POSTGRES_PASSWORD || '',
      ssl: process.env.NODE_ENV === 'production',
      maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20'),
      idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '2000'),
    },
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      database: process.env.MONGODB_DATABASE || 'ultramarket',
      options: {
        maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10'),
        serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '5000'),
        socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000'),
        connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT || '10000'),
      },
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100'),
      maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
    },
  };
}

/**
 * Create database manager instance
 */
export function createDatabaseManager(config?: DatabaseConfig): DatabaseManager {
  const dbConfig = config || createDatabaseConfig();
  return new DatabaseManager(dbConfig);
}

// =================== EXPORTS ===================

export {
  DatabaseManager,
  createDatabaseConfig,
  createDatabaseManager,
};

export type {
  DatabaseConfig,
  PostgresConfig,
  MongoConfig,
  RedisConfig,
  DatabaseConnections,
  DatabaseHealth,
};
