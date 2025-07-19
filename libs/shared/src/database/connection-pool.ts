import { PrismaClient } from '@prisma/client';
import { createPool, Pool, PoolConfig } from 'generic-pool';
import { logger } from '../logging/logger';

interface DatabaseConnection {
  id: string;
  prisma: PrismaClient;
  lastUsed: Date;
  inUse: boolean;
}

class ConnectionPoolManager {
  private static instance: ConnectionPoolManager;
  private pool: Pool<DatabaseConnection>;
  private connections = new Map<string, DatabaseConnection>();
  private connectionCounter = 0;

  private constructor() {
    const poolConfig: PoolConfig = {
      min: parseInt(process.env.DB_POOL_MIN || '5', 10),
      max: parseInt(process.env.DB_POOL_MAX || '20', 10), // Much lower than PostgreSQL limit
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 300000, // 5 minutes
      reapIntervalMillis: 60000, // 1 minute
      createRetryIntervalMillis: 15000,
      maxWaitingClients: 100,
    };

    this.pool = createPool(
      {
        create: async () => this.createConnection(),
        destroy: async (connection) => this.destroyConnection(connection),
        validate: async (connection) => this.validateConnection(connection),
      },
      poolConfig
    );

    this.setupEventHandlers();
    logger.info('Database connection pool initialized', {
      minConnections: poolConfig.min,
      maxConnections: poolConfig.max,
    });
  }

  static getInstance(): ConnectionPoolManager {
    if (!ConnectionPoolManager.instance) {
      ConnectionPoolManager.instance = new ConnectionPoolManager();
    }
    return ConnectionPoolManager.instance;
  }

  private async createConnection(): Promise<DatabaseConnection> {
    const connectionId = `conn_${++this.connectionCounter}_${Date.now()}`;
    
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
      errorFormat: 'minimal',
    });

    await prisma.$connect();
    
    const connection: DatabaseConnection = {
      id: connectionId,
      prisma,
      lastUsed: new Date(),
      inUse: false,
    };

    this.connections.set(connectionId, connection);
    logger.debug(`Database connection created: ${connectionId}`);
    
    return connection;
  }

  private async destroyConnection(connection: DatabaseConnection): Promise<void> {
    try {
      await connection.prisma.$disconnect();
      this.connections.delete(connection.id);
      logger.debug(`Database connection destroyed: ${connection.id}`);
    } catch (error) {
      logger.error(`Error destroying database connection ${connection.id}:`, error);
    }
  }

  private async validateConnection(connection: DatabaseConnection): Promise<boolean> {
    try {
      await connection.prisma.$queryRaw`SELECT 1`;
      connection.lastUsed = new Date();
      return true;
    } catch (error) {
      logger.warn(`Database connection validation failed: ${connection.id}`, error);
      return false;
    }
  }

  private setupEventHandlers(): void {
    this.pool.on('factoryCreateError', (err) => {
      logger.error('Database connection pool factory create error:', err);
    });

    this.pool.on('factoryDestroyError', (err) => {
      logger.error('Database connection pool factory destroy error:', err);
    });
  }

  async acquireConnection(): Promise<DatabaseConnection> {
    const connection = await this.pool.acquire();
    connection.inUse = true;
    connection.lastUsed = new Date();
    logger.debug(`Database connection acquired: ${connection.id}`);
    return connection;
  }

  async releaseConnection(connection: DatabaseConnection): Promise<void> {
    connection.inUse = false;
    connection.lastUsed = new Date();
    await this.pool.release(connection);
    logger.debug(`Database connection released: ${connection.id}`);
  }

  async executeWithConnection<T>(
    operation: (prisma: PrismaClient) => Promise<T>,
    timeout = 30000
  ): Promise<T> {
    let connection: DatabaseConnection | null = null;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Database operation timeout')), timeout);
    });

    try {
      connection = await this.acquireConnection();
      const result = await Promise.race([
        operation(connection.prisma),
        timeoutPromise
      ]);
      return result;
    } finally {
      if (connection) {
        await this.releaseConnection(connection);
      }
    }
  }

  async getPoolStatus() {
    return {
      size: this.pool.size,
      available: this.pool.available,
      borrowed: this.pool.borrowed,
      invalid: this.pool.invalid,
      pending: this.pool.pending,
      max: this.pool.max,
      min: this.pool.min,
      activeConnections: Array.from(this.connections.values()).filter(c => c.inUse).length,
      totalConnections: this.connections.size,
    };
  }

  async gracefulShutdown(): Promise<void> {
    logger.info('Starting database connection pool shutdown...');
    
    try {
      // Wait for all operations to complete or timeout
      const shutdownTimeout = 10000; // 10 seconds
      const startTime = Date.now();
      
      while (this.pool.borrowed > 0 && Date.now() - startTime < shutdownTimeout) {
        logger.info(`Waiting for ${this.pool.borrowed} active connections to complete...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (this.pool.borrowed > 0) {
        logger.warn(`Force closing ${this.pool.borrowed} active connections`);
      }

      await this.pool.drain();
      await this.pool.clear();
      
      logger.info('Database connection pool shutdown completed');
    } catch (error) {
      logger.error('Error during database connection pool shutdown:', error);
      throw error;
    }
  }
}

export const connectionPool = ConnectionPoolManager.getInstance();
export { ConnectionPoolManager, DatabaseConnection };