import winston from 'winston';
import { format } from 'winston';

// Custom format for console output
const consoleFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.colorize(),
  format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

// Custom format for file output
const fileFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: { service: 'user-service' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// Create a stream object for Morgan
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Helper functions for different log levels
export const logInfo = (message: string, meta?: any) => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: any) => {
  logger.error(message, { error: error?.message || error, stack: error?.stack });
};

export const logWarn = (message: string, meta?: any) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: any) => {
  logger.debug(message, meta);
};

// Performance logging
export const logPerformance = (operation: string, duration: number, meta?: any) => {
  logger.info(`Performance: ${operation} took ${duration}ms`, {
    operation,
    duration,
    ...meta,
  });
};

// Security logging
export const logSecurity = (event: string, details: any) => {
  logger.warn(`Security Event: ${event}`, {
    event,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

// API request logging
export const logApiRequest = (method: string, url: string, statusCode: number, duration: number, userId?: string) => {
  logger.info(`API Request: ${method} ${url}`, {
    method,
    url,
    statusCode,
    duration: `${duration}ms`,
    userId,
    timestamp: new Date().toISOString(),
  });
};

// Database operation logging
export const logDbOperation = (operation: string, table: string, duration: number, success: boolean) => {
  const level = success ? 'debug' : 'error';
  logger.log(level, `Database Operation: ${operation} on ${table}`, {
    operation,
    table,
    duration: `${duration}ms`,
    success,
  });
};