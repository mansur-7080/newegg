import { logger } from '@ultramarket/shared/logging';

// Simple logger utility for standardized logging
export const logger = {
  info: (message: string, ...args: unknown[]): void => {
    logger.info(`[INFO] ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]): void => {
    logger.error(`[ERROR] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]): void => {
    logger.warn(`[WARNING] ${message}`, ...args);
  },
  debug: (message: string, ...args: unknown[]): void => {
    logger.debug(`[DEBUG] ${message}`, ...args);
  },
};
