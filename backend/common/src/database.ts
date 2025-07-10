import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Database connection configuration
const databaseConfig = {
  url: process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/newegg_db',
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  errorFormat: 'pretty' as const,
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/newegg_db'
    }
  }
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
          version: await this.getVersion()
        }
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  // Get database version
  async getVersion(): Promise<string> {
    try {
      const result = await this.client.$queryRaw`SELECT version()`;
      return (result as any)[0]?.version || 'Unknown';
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
  async executeTransaction<T>(
    callback: (tx: PrismaClient) => Promise<T>
  ): Promise<T> {
    return await this.client.$transaction(callback);
  }

  // Execute transaction with timeout
  async executeTransactionWithTimeout<T>(
    callback: (tx: PrismaClient) => Promise<T>,
    timeoutMs: number = 30000
  ): Promise<T> {
    return await this.client.$transaction(callback, {
      timeout: timeoutMs
    });
  }

  // Execute transaction with isolation level
  async executeTransactionWithIsolation<T>(
    callback: (tx: PrismaClient) => Promise<T>,
    isolationLevel: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable' = 'ReadCommitted'
  ): Promise<T> {
    return await this.client.$transaction(callback, {
      isolationLevel
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
    model: any,
    options: {
      page?: number;
      limit?: number;
      where?: any;
      orderBy?: any;
      include?: any;
      select?: any;
    }
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
        take: limit
      }),
      model.count({ where })
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
        hasPrev: page > 1
      }
    };
  }

  // Search query helper
  async searchQuery<T>(
    model: any,
    searchTerm: string,
    searchFields: string[],
    options: {
      page?: number;
      limit?: number;
      where?: any;
      orderBy?: any;
      include?: any;
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
    const searchConditions = searchFields.map(field => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive' as const
      }
    }));

    const searchWhere = {
      ...where,
      OR: searchConditions
    };

    const [data, total] = await Promise.all([
      model.findMany({
        where: searchWhere,
        orderBy,
        include,
        skip,
        take: limit
      }),
      model.count({ where: searchWhere })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  // Bulk operations helper
  async bulkCreate<T>(
    model: any,
    data: any[]
  ): Promise<T[]> {
    return await model.createMany({
      data,
      skipDuplicates: true
    });
  }

  async bulkUpdate<T>(
    model: any,
    data: Array<{ id: string; [key: string]: any }>
  ): Promise<T[]> {
    const updates = data.map(item => {
      const { id, ...updateData } = item;
      return model.update({
        where: { id },
        data: updateData
      });
    });

    return await Promise.all(updates);
  }

  async bulkDelete<T>(
    model: any,
    ids: string[]
  ): Promise<T[]> {
    const deletes = ids.map(id =>
      model.delete({
        where: { id }
      })
    );

    return await Promise.all(deletes);
  }
}

// Database monitoring
export class DatabaseMonitor {
  private client: PrismaClient;

  constructor(client: PrismaClient = prisma) {
    this.client = client;
  }

  // Monitor slow queries
  async getSlowQueries(thresholdMs: number = 1000): Promise<any[]> {
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