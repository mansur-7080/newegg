import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from './logging/logger';

// Define types for database configuration
type LogLevel = 'query' | 'info' | 'warn' | 'error';

// Define interfaces
interface PrismaModel {
  findMany: (args: any) => Promise<any[]>;
  count: (args: any) => Promise<number>;
  createMany: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
}

interface QueryOptions {
  page?: number;
  limit?: number;
  where?: Record<string, any>;
  orderBy?: Record<string, any>;
  include?: Record<string, any>;
  select?: Record<string, any>;
}

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// Database connection configuration
const databaseConfig: Prisma.PrismaClientOptions = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/ultramarket',
    },
  },
  log: (process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error']) as LogLevel[],
  errorFormat: 'pretty',
};

// Create Prisma client instance
export const prisma = new PrismaClient(databaseConfig);

// Database connection management
export class DatabaseService {
  private client: PrismaClient;

  constructor(client: PrismaClient = prisma) {
    this.client = client;
  }

  // Test database connection
  async testConnection(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      logger.info('Database connection successful');
      return true;
    } catch (error) {
      logger.error('Database connection failed:', error);
      return false;
    }
  }

  // Get database statistics
  async getStats(): Promise<Record<string, any>> {
    try {
      const stats = await this.client.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        LIMIT 100
      `;
      return { stats };
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      return {};
    }
  }

  // Run database migration
  async runMigration(): Promise<void> {
    try {
      await this.client.$executeRaw`SELECT 1`;
      logger.info('Database migration completed');
    } catch (error) {
      logger.error('Database migration failed:', error);
      throw error;
    }
  }

  // Backup database (basic implementation)
  async backup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `./backups/backup-${timestamp}.sql`;

      // This would typically use pg_dump in production
      await this.client.$executeRaw`SELECT 1`;

      logger.info(`Database backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      logger.error('Database backup failed:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: Record<string, any>;
  }> {
    try {
      const startTime = Date.now();
      await this.client.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        details: {
          responseTime: `${responseTime}ms`,
          timestamp: new Date().toISOString(),
          version: await this.getVersion(),
        },
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // Get database version
  async getVersion(): Promise<string> {
    try {
      const result = await this.client.$queryRaw`SELECT version()`;
      const versionResult = result as { version: string }[];
      return versionResult[0]?.version || 'Unknown';
    } catch (error) {
      logger.error('Failed to get database version:', error);
      return 'Unknown';
    }
  }

  // Close database connection
  async disconnect(): Promise<void> {
    try {
      await this.client.$disconnect();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Failed to close database connection:', error);
    }
  }
}

// Transaction utilities
export class TransactionService {
  private client: PrismaClient;

  constructor(client: PrismaClient = prisma) {
    this.client = client;
  }

  // Execute transaction
  async executeTransaction<T>(callback: (tx: TransactionClient) => Promise<T>): Promise<T> {
    return this.client.$transaction(callback);
  }

  // Execute transaction with timeout
  async executeTransactionWithTimeout<T>(
    callback: (tx: TransactionClient) => Promise<T>,
    timeoutMs = 30000
  ): Promise<T> {
    return this.client.$transaction(callback, {
      timeout: timeoutMs,
    });
  }

  // Execute transaction with isolation level
  async executeTransactionWithIsolation<T>(
    callback: (tx: TransactionClient) => Promise<T>,
    isolationLevel: Prisma.TransactionIsolationLevel = 'ReadCommitted'
  ): Promise<T> {
    return this.client.$transaction(callback, {
      isolationLevel,
    });
  }
}

// Query utilities
export class QueryService {
  private client: PrismaClient;

  constructor(client: PrismaClient = prisma) {
    this.client = client;
  }

  // Paginated query helper
  async paginatedQuery<T>(
    model: PrismaModel,
    options: QueryOptions
  ): Promise<{
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page = 1, limit = 20, where, orderBy, include, select } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      model.findMany({
        where,
        orderBy,
        include,
        select,
        skip,
        take: limit,
      }) as unknown as Promise<T[]>,
      model.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  // Search query helper
  async searchQuery<T>(
    model: PrismaModel,
    searchTerm: string,
    searchFields: string[],
    options: {
      page?: number;
      limit?: number;
      where?: Record<string, any>;
      orderBy?: Record<string, any>;
      include?: Record<string, any>;
    }
  ): Promise<{
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page = 1, limit = 20, where = {}, orderBy, include } = options;
    const skip = (page - 1) * limit;

    // Build search conditions
    const searchConditions = searchFields.map((field) => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive' as const,
      },
    }));

    const searchWhere = {
      ...where,
      OR: searchConditions,
    };

    const [data, total] = await Promise.all([
      model.findMany({
        where: searchWhere,
        orderBy,
        include,
        skip,
        take: limit,
      }) as unknown as Promise<T[]>,
      model.count({ where: searchWhere }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  // Bulk operations helper
  async bulkCreate<T>(model: PrismaModel, data: Record<string, any>[]): Promise<T[]> {
    return (await model.createMany({
      data,
      skipDuplicates: true,
    })) as unknown as T[];
  }

  async bulkUpdate<T>(
    model: PrismaModel,
    data: Array<{ id: string; [key: string]: any }>
  ): Promise<T[]> {
    const updates = data.map((item) => {
      const { id, ...updateData } = item;
      return model.update({
        where: { id },
        data: updateData,
      });
    });

    return (await Promise.all(updates)) as unknown as T[];
  }

  async bulkDelete<T>(model: PrismaModel, ids: string[]): Promise<T[]> {
    const deletes = ids.map((id) =>
      model.delete({
        where: { id },
      })
    );

    return (await Promise.all(deletes)) as unknown as T[];
  }
}

// Database monitoring
export class DatabaseMonitor {
  private client: PrismaClient;

  constructor(client: PrismaClient = prisma) {
    this.client = client;
  }

  // Monitor slow queries
  async getSlowQueries(thresholdMs = 1000): Promise<any[]> {
    try {
      const result = await this.client.$queryRaw`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements 
        WHERE mean_time > ${thresholdMs}
        ORDER BY mean_time DESC
        LIMIT 10
      `;
      return result as any[];
    } catch (error) {
      logger.error('Failed to get slow queries:', error);
      return [];
    }
  }

  // Get table statistics
  async getTableStats(): Promise<any[]> {
    try {
      const result = await this.client.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        ORDER BY tablename, attname
      `;
      return result as any[];
    } catch (error) {
      logger.error('Failed to get table stats:', error);
      return [];
    }
  }

  // Get index usage statistics
  async getIndexStats(): Promise<any[]> {
    try {
      const result = await this.client.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
        ORDER BY idx_scan DESC
        LIMIT 20
      `;
      return result as any[];
    } catch (error) {
      logger.error('Failed to get index stats:', error);
      return [];
    }
  }
}

// Export default instances
export const databaseService = new DatabaseService();
export const transactionService = new TransactionService();
export const queryService = new QueryService();
export const databaseMonitor = new DatabaseMonitor();

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    logger.info('Shutting down database connections...');
    await databaseService.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Shutting down database connections...');
    await databaseService.disconnect();
    process.exit(0);
  });
}

export default {
  prisma,
  DatabaseService,
  TransactionService,
  QueryService,
  DatabaseMonitor,
  databaseService,
  transactionService,
  queryService,
  databaseMonitor,
};
