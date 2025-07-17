import { PrismaClient } from '@prisma/client';
import { logger } from '@ultramarket/shared/logging/logger';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ultramarket_user:ultramarket_password@localhost:5432/ultramarket';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    
    // Test the connection
    await prisma.$queryRaw`SELECT 1`;
    
    logger.info('PostgreSQL connected successfully', {
      url: DATABASE_URL.replace(/:[^:@]*@/, ':***@'), // Hide password in logs
    });

    // Handle graceful shutdown
    process.on('beforeExit', async () => {
      await prisma.$disconnect();
    });

  } catch (error) {
    logger.error('Failed to connect to PostgreSQL', { error });
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('PostgreSQL disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from PostgreSQL', { error });
    throw error;
  }
};
