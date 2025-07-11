// Simple logger utility for standardized logging
export const logger = {
  info: (message: string, ...args: unknown[]): void => {
    console.info(`[INFO] ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]): void => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]): void => {
    console.warn(`[WARNING] ${message}`, ...args);
  },
  debug: (message: string, ...args: unknown[]): void => {
    console.debug(`[DEBUG] ${message}`, ...args);
  },
};
