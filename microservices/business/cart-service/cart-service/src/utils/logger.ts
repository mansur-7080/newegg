import winston from 'winston';
import path from 'path';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(logColors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, userId, cartId, ...meta }) => {
    let logMessage = `${timestamp} [${service || 'cart-service'}] ${level}: ${message}`;
    
    // Add user context if available
    if (userId) {
      logMessage += ` | User: ${userId}`;
    }
    
    // Add cart context if available
    if (cartId) {
      logMessage += ` | Cart: ${cartId}`;
    }
    
    // Add metadata if present
    const metaKeys = Object.keys(meta);
    if (metaKeys.length > 0) {
      const metaString = metaKeys
        .map(key => `${key}: ${JSON.stringify(meta[key])}`)
        .join(', ');
      logMessage += ` | ${metaString}`;
    }
    
    return logMessage;
  })
);

// Determine log level based on environment
const getLogLevel = (): string => {
  const env = process.env.NODE_ENV || 'development';
  const logLevel = process.env.LOG_LEVEL;
  
  if (logLevel) {
    return logLevel.toLowerCase();
  }
  
  switch (env) {
    case 'production':
      return 'info';
    case 'staging':
      return 'warn';
    case 'test':
      return 'error';
    default:
      return 'debug';
  }
};

// Create winston logger instance
const logger = winston.createLogger({
  level: getLogLevel(),
  levels: logLevels,
  format: logFormat,
  defaultMeta: {
    service: 'cart-service',
    version: process.env.SERVICE_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'app.log'),
      format: logFormat,
    }),
    
    // Separate file for errors
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      format: logFormat,
    }),
    
    // Separate file for cart operations
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'cart.log'),
      format: logFormat,
      level: 'info',
    }),
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
    }),
  ],
  
  // Handle unhandled rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log'),
    }),
  ],
});

// Enhanced logging methods with context
export const createContextLogger = (context: {
  userId?: string;
  cartId?: string;
  sessionId?: string;
  requestId?: string;
}) => {
  return {
    error: (message: string, meta?: any) => {
      logger.error(message, { ...context, ...meta });
    },
    warn: (message: string, meta?: any) => {
      logger.warn(message, { ...context, ...meta });
    },
    info: (message: string, meta?: any) => {
      logger.info(message, { ...context, ...meta });
    },
    http: (message: string, meta?: any) => {
      logger.http(message, { ...context, ...meta });
    },
    debug: (message: string, meta?: any) => {
      logger.debug(message, { ...context, ...meta });
    },
  };
};

// Cart-specific logging methods
export const cartLogger = {
  cartCreated: (userId: string, cartId: string, sessionId?: string) => {
    logger.info('Cart created', {
      action: 'cart_created',
      userId,
      cartId,
      sessionId,
      timestamp: new Date().toISOString(),
    });
  },
  
  itemAdded: (userId: string, cartId: string, productId: string, quantity: number) => {
    logger.info('Item added to cart', {
      action: 'item_added',
      userId,
      cartId,
      productId,
      quantity,
      timestamp: new Date().toISOString(),
    });
  },
  
  itemUpdated: (userId: string, cartId: string, itemId: string, oldQuantity: number, newQuantity: number) => {
    logger.info('Cart item updated', {
      action: 'item_updated',
      userId,
      cartId,
      itemId,
      oldQuantity,
      newQuantity,
      timestamp: new Date().toISOString(),
    });
  },
  
  itemRemoved: (userId: string, cartId: string, itemId: string, productId: string) => {
    logger.info('Item removed from cart', {
      action: 'item_removed',
      userId,
      cartId,
      itemId,
      productId,
      timestamp: new Date().toISOString(),
    });
  },
  
  cartCleared: (userId: string, cartId: string) => {
    logger.info('Cart cleared', {
      action: 'cart_cleared',
      userId,
      cartId,
      timestamp: new Date().toISOString(),
    });
  },
  
  couponApplied: (userId: string, cartId: string, couponCode: string, discountAmount: number) => {
    logger.info('Coupon applied to cart', {
      action: 'coupon_applied',
      userId,
      cartId,
      couponCode,
      discountAmount,
      timestamp: new Date().toISOString(),
    });
  },
  
  cartMerged: (guestCartId: string, userCartId: string, userId: string, itemCount: number) => {
    logger.info('Guest cart merged with user cart', {
      action: 'cart_merged',
      guestCartId,
      userCartId,
      userId,
      itemCount,
      timestamp: new Date().toISOString(),
    });
  },
  
  cartExpired: (cartId: string, sessionId?: string) => {
    logger.info('Cart expired and cleaned up', {
      action: 'cart_expired',
      cartId,
      sessionId,
      timestamp: new Date().toISOString(),
    });
  },
};

// Performance logging
export const performanceLogger = {
  requestStarted: (requestId: string, method: string, url: string) => {
    logger.http('Request started', {
      requestId,
      method,
      url,
      timestamp: new Date().toISOString(),
    });
  },
  
  requestCompleted: (requestId: string, method: string, url: string, statusCode: number, duration: number) => {
    logger.http('Request completed', {
      requestId,
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  },
  
  databaseQuery: (operation: string, table: string, duration: number) => {
    logger.debug('Database query', {
      operation,
      table,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  },
  
  cacheOperation: (operation: 'hit' | 'miss' | 'set' | 'delete', key: string, duration?: number) => {
    logger.debug('Cache operation', {
      operation,
      key,
      duration: duration ? `${duration}ms` : undefined,
      timestamp: new Date().toISOString(),
    });
  },
};

// Security logging
export const securityLogger = {
  authenticationFailed: (ip: string, userAgent?: string, reason?: string) => {
    logger.warn('Authentication failed', {
      event: 'auth_failed',
      ip,
      userAgent,
      reason,
      timestamp: new Date().toISOString(),
    });
  },
  
  rateLimitExceeded: (ip: string, endpoint: string, userAgent?: string) => {
    logger.warn('Rate limit exceeded', {
      event: 'rate_limit_exceeded',
      ip,
      endpoint,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  },
  
  suspiciousActivity: (userId: string, activity: string, details: any) => {
    logger.warn('Suspicious activity detected', {
      event: 'suspicious_activity',
      userId,
      activity,
      details,
      timestamp: new Date().toISOString(),
    });
  },
  
  unauthorizedAccess: (ip: string, endpoint: string, userAgent?: string) => {
    logger.warn('Unauthorized access attempt', {
      event: 'unauthorized_access',
      ip,
      endpoint,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  },
};

// Error logging with stack traces
export const errorLogger = {
  applicationError: (error: Error, context?: any) => {
    logger.error('Application error', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
      timestamp: new Date().toISOString(),
    });
  },
  
  databaseError: (error: Error, operation: string, context?: any) => {
    logger.error('Database error', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      operation,
      context,
      timestamp: new Date().toISOString(),
    });
  },
  
  validationError: (errors: any[], context?: any) => {
    logger.warn('Validation error', {
      errors,
      context,
      timestamp: new Date().toISOString(),
    });
  },
  
  businessLogicError: (error: string, operation: string, context?: any) => {
    logger.warn('Business logic error', {
      error,
      operation,
      context,
      timestamp: new Date().toISOString(),
    });
  },
};

// Create logs directory if it doesn't exist
import fs from 'fs';
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Export the main logger instance
export { logger };

// Export logger as default
export default logger;
