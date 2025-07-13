// Database connection pool optimization
// This file provides optimized database connection pooling for better performance

// Simple logger for database operations
const logger = {
  info: (message: string, meta?: any) => console.log(`[DB-INFO] ${message}`, meta),
  error: (message: string, meta?: any) => console.error(`[DB-ERROR] ${message}`, meta),
  warn: (message: string, meta?: any) => console.warn(`[DB-WARN] ${message}`, meta),
  debug: (message: string, meta?: any) => console.log(`[DB-DEBUG] ${message}`, meta),
};

export interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  acquireTimeout: number;
  idleTimeout: number;
  maxIdleTime: number;
}

export class DatabaseConnectionPool {
  private static instance: DatabaseConnectionPool;
  private prisma: any; // PrismaClient type
  private config: ConnectionPoolConfig;
  private connectionCount = 0;
  private maxConnections: number;

  private constructor(config: ConnectionPoolConfig) {
    this.config = config;
    this.maxConnections = config.maxConnections;
    
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    });

    this.setupEventListeners();
    this.initializePool();
  }

  public static getInstance(config?: ConnectionPoolConfig): DatabaseConnectionPool {
    if (!DatabaseConnectionPool.instance) {
      const defaultConfig: ConnectionPoolConfig = {
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
        minConnections: parseInt(process.env.DB_MIN_CONNECTIONS || '5'),
        acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
        idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
        maxIdleTime: parseInt(process.env.DB_MAX_IDLE_TIME || '300000'),
      };
      
      DatabaseConnectionPool.instance = new DatabaseConnectionPool(config || defaultConfig);
    }
    return DatabaseConnectionPool.instance;
  }

  private setupEventListeners(): void {
    this.prisma.$on('query', (e) => {
      logger.info('Database Query', {
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
      });
    });

    this.prisma.$on('error', (e) => {
      logger.error('Database Error', {
        error: e.message,
        target: e.target,
      });
    });

    this.prisma.$on('info', (e) => {
      logger.info('Database Info', { message: e.message });
    });

    this.prisma.$on('warn', (e) => {
      logger.warn('Database Warning', { message: e.message });
    });
  }

  private async initializePool(): Promise<void> {
    try {
      // Test connection
      await this.prisma.$connect();
      
      logger.info('Database connection pool initialized', {
        maxConnections: this.config.maxConnections,
        minConnections: this.config.minConnections,
      });

      // Setup connection monitoring
      this.monitorConnections();
    } catch (error) {
      logger.error('Failed to initialize database connection pool', { error });
      throw error;
    }
  }

  private monitorConnections(): void {
    setInterval(() => {
      logger.info('Database connection pool status', {
        activeConnections: this.connectionCount,
        maxConnections: this.maxConnections,
        utilization: `${((this.connectionCount / this.maxConnections) * 100).toFixed(2)}%`,
      });
    }, 60000); // Every minute
  }

  public async getConnection(): Promise<any> {
    if (this.connectionCount >= this.maxConnections) {
      logger.warn('Connection pool exhausted', {
        activeConnections: this.connectionCount,
        maxConnections: this.maxConnections,
      });
      
      // Wait for available connection
      await this.waitForConnection();
    }

    this.connectionCount++;
    logger.debug('Database connection acquired', {
      activeConnections: this.connectionCount,
    });

    return this.prisma;
  }

  public releaseConnection(): void {
    if (this.connectionCount > 0) {
      this.connectionCount--;
      logger.debug('Database connection released', {
        activeConnections: this.connectionCount,
      });
    }
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve) => {
      const checkConnection = () => {
        if (this.connectionCount < this.maxConnections) {
          resolve();
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });
  }

  public async closePool(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      logger.info('Database connection pool closed');
    } catch (error) {
      logger.error('Error closing database connection pool', { error });
    }
  }

  public getPoolStats() {
    return {
      activeConnections: this.connectionCount,
      maxConnections: this.maxConnections,
      utilization: (this.connectionCount / this.maxConnections) * 100,
    };
  }
}

// Export singleton instance
export const dbPool = DatabaseConnectionPool.getInstance();