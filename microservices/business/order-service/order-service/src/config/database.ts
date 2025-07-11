import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' },
  ],
});

// Setup logging for Prisma events
prisma.$on('warn', (e) => {
  logger.warn(`Prisma warning: ${e.message}`);
});

prisma.$on('error', (e) => {
  logger.error(`Prisma error: ${e.message}`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  logger.info('Prisma client disconnected');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  logger.info('Prisma client disconnected');
  process.exit(0);
});

// Export the prisma client instance
export default prisma;
