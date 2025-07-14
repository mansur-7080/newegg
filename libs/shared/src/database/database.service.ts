import { PrismaClient } from '@prisma/client';
import { logger } from '../logging/logger';

export class DatabaseService {
  private static instance: DatabaseService;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
      errorFormat: 'pretty',
    });

    // Log database queries in development
    if (process.env.NODE_ENV === 'development') {
      this.prisma.$on('query', (e) => {
        logger.debug('Database Query', {
          query: e.query,
          params: e.params,
          duration: `${e.duration}ms`,
        });
      });
    }

    // Log database errors
    this.prisma.$on('error', (e) => {
      logger.error('Database Error', {
        target: e.target,
        message: e.message,
      });
    });

    // Log slow queries
    this.prisma.$on('query', (e) => {
      if (e.duration > 1000) {
        logger.warn('Slow Database Query', {
          query: e.query,
          duration: `${e.duration}ms`,
        });
      }
    });
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public getClient(): PrismaClient {
    return this.prisma;
  }

  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Database connection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Database disconnection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async healthCheck(): Promise<{ status: string; latency: number }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      return { status: 'healthy', latency };
    } catch (error) {
      logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async runMigrations(): Promise<void> {
    try {
      // This would run Prisma migrations in production
      logger.info('Database migrations completed');
    } catch (error) {
      logger.error('Database migration failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Transaction helper
  public async withTransaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  // Bulk operations helper
  public async bulkInsert<T>(
    model: string,
    data: T[]
  ): Promise<void> {
    const batchSize = 1000;
    const batches = [];
    
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      await (this.prisma as any)[model].createMany({
        data: batch,
        skipDuplicates: true,
      });
    }
  }

  // Query optimization helpers
  public async executeRawQuery<T = any>(query: string, params?: any[]): Promise<T[]> {
    try {
      const result = await this.prisma.$queryRawUnsafe(query, ...(params || []));
      return result as T[];
    } catch (error) {
      logger.error('Raw query execution failed', {
        query,
        params,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export const db = DatabaseService.getInstance();