/**
 * Professional Logger Utility for UltraMarket
 * Structured logging with proper error handling and performance monitoring
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(logColors);

// Create custom format for structured logging
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaString}`;
  })
);

// Create console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaString}`;
  })
);

// Create logger instance
const createLogger = (serviceName: string = 'auth-service') => {
  const transports: winston.transport[] = [];

  // Console transport for development
  if (process.env.NODE_ENV !== 'production') {
    transports.push(
      new winston.transports.Console({
        level: process.env.LOG_LEVEL || 'debug',
        format: consoleFormat,
      })
    );
  }

  // File transports for production
  if (process.env.NODE_ENV === 'production') {
    // Error log file
    transports.push(
      new DailyRotateFile({
        filename: `logs/${serviceName}-error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '14d',
        format: customFormat,
      })
    );

    // Combined log file
    transports.push(
      new DailyRotateFile({
        filename: `logs/${serviceName}-combined-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: customFormat,
      })
    );
  }

  // Create logger
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels: logLevels,
    format: customFormat,
    transports,
    // Handle uncaught exceptions
    exceptionHandlers: [
      new DailyRotateFile({
        filename: `logs/${serviceName}-exceptions-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: customFormat,
      }),
    ],
    // Handle unhandled rejections
    rejectionHandlers: [
      new DailyRotateFile({
        filename: `logs/${serviceName}-rejections-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: customFormat,
      }),
    ],
  });

  return logger;
};

// Create default logger instance
export const logger = createLogger();

// Enhanced logger with additional methods
export class EnhancedLogger {
  private logger: winston.Logger;
  private serviceName: string;

  constructor(serviceName: string = 'auth-service') {
    this.logger = createLogger(serviceName);
    this.serviceName = serviceName;
  }

  /**
   * Log info message
   */
  info(message: string, meta?: Record<string, any>) {
    this.logger.info(message, {
      service: this.serviceName,
      ...meta,
    });
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | any, meta?: Record<string, any>) {
    const errorMeta = {
      service: this.serviceName,
      ...meta,
    };

    if (error instanceof Error) {
      errorMeta.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    } else if (error) {
      errorMeta.error = error;
    }

    this.logger.error(message, errorMeta);
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: Record<string, any>) {
    this.logger.warn(message, {
      service: this.serviceName,
      ...meta,
    });
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: Record<string, any>) {
    this.logger.debug(message, {
      service: this.serviceName,
      ...meta,
    });
  }

  /**
   * Log HTTP request
   */
  http(message: string, meta?: Record<string, any>) {
    this.logger.http(message, {
      service: this.serviceName,
      ...meta,
    });
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, meta?: Record<string, any>) {
    this.logger.info(`Performance: ${operation}`, {
      service: this.serviceName,
      operation,
      duration,
      unit: 'ms',
      ...meta,
    });
  }

  /**
   * Log security events
   */
  security(event: string, meta?: Record<string, any>) {
    this.logger.warn(`Security: ${event}`, {
      service: this.serviceName,
      event,
      category: 'security',
      ...meta,
    });
  }

  /**
   * Log database operations
   */
  database(operation: string, duration?: number, meta?: Record<string, any>) {
    this.logger.debug(`Database: ${operation}`, {
      service: this.serviceName,
      operation,
      duration,
      unit: 'ms',
      category: 'database',
      ...meta,
    });
  }

  /**
   * Log API requests
   */
  api(method: string, path: string, statusCode: number, duration?: number, meta?: Record<string, any>) {
    const level = statusCode >= 400 ? 'warn' : 'info';
    this.logger[level](`API: ${method} ${path}`, {
      service: this.serviceName,
      method,
      path,
      statusCode,
      duration,
      unit: 'ms',
      category: 'api',
      ...meta,
    });
  }

  /**
   * Log user actions
   */
  userAction(userId: string, action: string, meta?: Record<string, any>) {
    this.logger.info(`User Action: ${action}`, {
      service: this.serviceName,
      userId,
      action,
      category: 'user',
      ...meta,
    });
  }

  /**
   * Log payment events
   */
  payment(paymentId: string, event: string, meta?: Record<string, any>) {
    this.logger.info(`Payment: ${event}`, {
      service: this.serviceName,
      paymentId,
      event,
      category: 'payment',
      ...meta,
    });
  }

  /**
   * Log authentication events
   */
  auth(userId: string, event: string, meta?: Record<string, any>) {
    this.logger.info(`Auth: ${event}`, {
      service: this.serviceName,
      userId,
      event,
      category: 'authentication',
      ...meta,
    });
  }

  /**
   * Log audit trail
   */
  audit(userId: string, action: string, resource: string, meta?: Record<string, any>) {
    this.logger.info(`Audit: ${action} on ${resource}`, {
      service: this.serviceName,
      userId,
      action,
      resource,
      category: 'audit',
      ...meta,
    });
  }

  /**
   * Log system health
   */
  health(component: string, status: 'healthy' | 'unhealthy', meta?: Record<string, any>) {
    const level = status === 'healthy' ? 'info' : 'error';
    this.logger[level](`Health: ${component} is ${status}`, {
      service: this.serviceName,
      component,
      status,
      category: 'health',
      ...meta,
    });
  }

  /**
   * Create child logger with additional context
   */
  child(context: Record<string, any>) {
    const childLogger = new EnhancedLogger(this.serviceName);
    childLogger.logger = this.logger.child(context);
    return childLogger;
  }
}

// Create enhanced logger instance
export const enhancedLogger = new EnhancedLogger();

// Export default logger for backward compatibility
export default logger;
