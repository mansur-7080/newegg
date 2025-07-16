import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export class DatabaseService {
  private static instance: DatabaseService;
  public prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
      errorFormat: 'pretty',
    });

    // Setup logging
    this.setupLogging();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private setupLogging(): void {
    // Query logging in development
    if (process.env.NODE_ENV === 'development') {
      this.prisma.$on('query' as any, (e: any) => {
        logger.debug('Query executed', {
          query: e.query,
          params: e.params,
          duration: e.duration,
          target: e.target,
        });
      });
    }

    // Error logging
    this.prisma.$on('error' as any, (e: any) => {
      logger.error('Database error', {
        message: e.message,
        target: e.target,
      });
    });

    // Warning logging
    this.prisma.$on('warn' as any, (e: any) => {
      logger.warn('Database warning', {
        message: e.message,
      });
    });
  }

  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info('✅ Successfully connected to PostgreSQL database');

      // Test the connection
      await this.prisma.$queryRaw`SELECT 1`;
      logger.info('✅ Database connection verified');
    } catch (error) {
      logger.error('❌ Failed to connect to database', { error });
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      logger.info('✅ Disconnected from database');
    } catch (error) {
      logger.error('❌ Error disconnecting from database', { error });
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed', { error });
      return false;
    }
  }

  public async executeTransaction<T>(
    fn: (prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}

export const db = DatabaseService.getInstance();

// Export Prisma client for direct use
export const prisma = db.prisma;
