import winston from 'winston';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      service: 'file-service',
      ...meta,
    });
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'file-service',
    version: process.env.npm_package_version || '1.0.0',
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}] ${message} ${metaStr}`;
        })
      ),
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/file-service.log',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
    }),
    
    // Separate file for errors
    new winston.transports.File({
      filename: 'logs/file-service-error.log',
      level: 'error',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
    }),
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: 'logs/file-service-exceptions.log',
    }),
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: 'logs/file-service-rejections.log',
    }),
  ],
});

// Create logs directory if it doesn't exist
import fs from 'fs';
import path from 'path';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? 
          '\n' + JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [FILE-SERVICE] ${level}: ${message}${metaStr}`;
      })
    ),
  }));
}

// Helper functions for structured logging
export const logFileOperation = (operation: string, fileId: string, metadata?: any) => {
  logger.info(`File ${operation}`, {
    operation,
    fileId,
    ...metadata,
    timestamp: new Date().toISOString(),
  });
};

export const logUploadEvent = (event: string, fileInfo: any) => {
  logger.info(`Upload ${event}`, {
    event,
    fileInfo,
    timestamp: new Date().toISOString(),
  });
};

export const logSecurityEvent = (event: string, details: any) => {
  logger.warn(`Security ${event}`, {
    event,
    details,
    timestamp: new Date().toISOString(),
  });
};

export const logPerformanceMetric = (metric: string, value: number, unit: string) => {
  logger.info('Performance metric', {
    metric,
    value,
    unit,
    timestamp: new Date().toISOString(),
  });
};

export default logger;