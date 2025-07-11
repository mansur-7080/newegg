import { logger as sharedLogger } from '@ultramarket/shared';

// Professional logger utility for standardized logging
export const orderLogger = {
  info: (message: string, ...args: unknown[]): void => {
    sharedLogger.info(message, ...args);
  },
  error: (message: string, ...args: unknown[]): void => {
    sharedLogger.error(message, ...args);
  },
  warn: (message: string, ...args: unknown[]): void => {
    sharedLogger.warn(message, ...args);
  },
  debug: (message: string, ...args: unknown[]): void => {
    sharedLogger.debug(message, ...args);
  },
};

// Export for backward compatibility
export { orderLogger as logger };
