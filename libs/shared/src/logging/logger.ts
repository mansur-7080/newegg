/**
 * UltraMarket Logger
 * Professional logging utility with structured logging and multiple transports
 */

import winston from 'winston';
import path from 'path';

// Log levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
} as const;

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FILE = process.env.LOG_FILE || 'app.log';
const LOG_DIR = process.env.LOG_DIR || 'logs';

// Create logs directory if it doesn't exist
import fs from 'fs';
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = ` ${JSON.stringify(meta)}`;
    }
    const serviceStr = service ? `[${service}]` : '';
    return `${timestamp} ${level}${serviceStr}: ${message}${metaStr}`;
  })
);

// Create winston logger instance
const logger = winston.createLogger({
  level: LOG_LEVEL,
  levels: LOG_LEVELS,
  format: logFormat,
  defaultMeta: {
    service: 'ultramarket',
    environment: NODE_ENV,
    version: process.env.APP_VERSION || '1.0.0',
  },
  transports: [
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true,
    }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, LOG_FILE),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true,
    }),
  ],
  exitOnError: false,
});

// Add console transport for development
if (NODE_ENV === 'development') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Add production-specific transports
if (NODE_ENV === 'production') {
  // Add external logging services here (e.g., Loggly, Splunk, etc.)
  // logger.add(new winston.transports.Http({
  //   host: 'logs.example.com',
  //   port: 80,
  //   path: '/logs'
  // }));
}

// Enhanced logging methods
const enhancedLogger = {
  error: (message: string, meta?: Record<string, unknown>) => {
    logger.error(message, meta);
  },

  warn: (message: string, meta?: Record<string, unknown>) => {
    logger.warn(message, meta);
  },

  info: (message: string, meta?: Record<string, unknown>) => {
    logger.info(message, meta);
  },

  debug: (message: string, meta?: Record<string, unknown>) => {
    logger.debug(message, meta);
  },

  trace: (message: string, meta?: Record<string, unknown>) => {
    logger.log('trace', message, meta);
  },

  // Console.log replacement for production
  log: (message: string, ...args: unknown[]) => {
    const meta = args.length > 0 ? { additionalData: args } : undefined;
    logger.info(message, meta);
  },

  // HTTP request logging
  http: (
    req: { method: string; url: string; ip: string },
    res: { statusCode: number },
    responseTime: number
  ) => {
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
    });
  },

  // Database query logging
  query: (query: string, params?: unknown[], duration?: number) => {
    logger.debug('Database Query', {
      query,
      params,
      duration: duration ? `${duration}ms` : undefined,
    });
  },

  // Security event logging
  security: (event: string, details: Record<string, unknown>) => {
    logger.warn('Security Event', {
      event,
      ...details,
      timestamp: new Date().toISOString(),
    });
  },

  // Performance logging
  performance: (operation: string, duration: number, meta?: Record<string, unknown>) => {
    const level = duration > 1000 ? 'warn' : 'info';
    logger.log(level, 'Performance', {
      operation,
      duration: `${duration}ms`,
      ...meta,
    });
  },

  // Business logic logging
  business: (event: string, meta?: Record<string, unknown>) => {
    logger.info('Business Event', {
      event,
      ...meta,
    });
  },

  // Create child logger with additional context
  child: (context: Record<string, unknown>) => {
    return logger.child(context);
  },
};

// Export both the winston logger and enhanced logger
export { logger as winstonLogger };
export { enhancedLogger as logger };
export default enhancedLogger;

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    promise: promise.toString(),
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  logger.end(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  logger.end(() => {
    process.exit(0);
  });
});
