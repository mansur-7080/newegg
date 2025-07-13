import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Global instance to avoid multiple connections
let prisma: PrismaClient | null = null;

export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
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
      errorFormat: 'pretty',
    });

    // Log database queries in development
    if (process.env.NODE_ENV === 'development') {
      prisma.$on('query', (e) => {
        logger.debug('Database Query', {
          query: e.query,
          params: e.params,
          duration: `${e.duration}ms`,
        });
      });
    }

    // Log database errors
    prisma.$on('error', (e) => {
      logger.error('Database Error', {
        message: e.message,
        target: e.target,
      });
    });

    // Log database info
    prisma.$on('info', (e) => {
      logger.info('Database Info', {
        message: e.message,
        target: e.target,
      });
    });

    // Log database warnings
    prisma.$on('warn', (e) => {
      logger.warn('Database Warning', {
        message: e.message,
        target: e.target,
      });
    });
  }

  return prisma;
};

export const connectDatabase = async (): Promise<void> => {
  try {
    const client = getPrismaClient();
    await client.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to connect to database', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    if (prisma) {
      await prisma.$disconnect();
      prisma = null;
      logger.info('Database disconnected successfully');
    }
  } catch (error) {
    logger.error('Failed to disconnect from database', error);
    throw error;
  }
};

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

export default getPrismaClient;