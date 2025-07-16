/**
 * Database Connection - Prisma Only
 * Professional database management with connection pooling and monitoring
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

declare global {
  var __prisma: PrismaClient | undefined;
}

// Singleton pattern for Prisma client
export const prisma = globalThis.__prisma || new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' },
    { level: 'info', emit: 'event' },
  ],
  errorFormat: 'pretty',
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// Database event listeners for monitoring
prisma.$on('query', (e) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Database Query', {
      query: e.query,
      params: e.params,
      duration: e.duration,
      target: e.target,
    });
  }
});

prisma.$on('warn', (e) => {
  logger.warn('Database Warning', {
    message: e.message,
    target: e.target,
  });
});

prisma.$on('error', (e) => {
  logger.error('Database Error', {
    message: e.message,
    target: e.target,
  });
});

prisma.$on('info', (e) => {
  logger.info('Database Info', {
    message: e.message,
    target: e.target,
  });
});

/**
 * Connect to database
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    
    logger.info('Database connected successfully', {
      provider: 'postgresql',
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    logger.error('Failed to connect to database', { error });
    throw error;
  }
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from database', { error });
    throw error;
  }
}

/**
 * Get database health status
 */
export async function getDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: {
    connected: boolean;
    latency?: number;
    error?: string;
  };
}> {
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;

    return {
      status: 'healthy',
      details: {
        connected: true,
        latency,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Execute database migrations
 */
export async function runMigrations(): Promise<void> {
  try {
    // This would be handled by Prisma CLI in production
    // prisma migrate deploy
    logger.info('Database migrations would be run here');
  } catch (error) {
    logger.error('Failed to run migrations', { error });
    throw error;
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

export default prisma;
