import { PrismaClient } from '@prisma/client';

export interface DatabaseConfig {
  url: string;
  maxConnections: number;
  connectionTimeout: number;
  logLevel: 'info' | 'query' | 'warn' | 'error';
}

export const databaseConfig: DatabaseConfig = {
  url: process.env.DATABASE_URL || 'postgresql://ultramarket_user:password@localhost:5432/ultramarket_db',
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
  logLevel: (process.env.DB_LOG_LEVEL as any) || 'info',
};

// Prisma client singleton
let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseConfig.url,
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

    // Event listeners for logging
    prisma.$on('query', (e) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Query: ' + e.query);
        console.log('Params: ' + e.params);
        console.log('Duration: ' + e.duration + 'ms');
      }
    });

    prisma.$on('error', (e) => {
      console.error('Database error:', e);
    });

    prisma.$on('info', (e) => {
      console.info('Database info:', e.message);
    });

    prisma.$on('warn', (e) => {
      console.warn('Database warning:', e.message);
    });
  }

  return prisma;
}

export async function connectDatabase(): Promise<void> {
  try {
    const client = getPrismaClient();
    await client.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    if (prisma) {
      await prisma.$disconnect();
      console.log('✅ Database disconnected successfully');
    }
  } catch (error) {
    console.error('❌ Database disconnection failed:', error);
    throw error;
  }
}

export async function healthCheckDatabase(): Promise<boolean> {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}