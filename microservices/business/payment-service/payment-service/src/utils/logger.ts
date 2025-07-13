import winston from 'winston';

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'payment-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Create a stream object for Morgan
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

// Export logger instance
export { logger };

// Logging utility functions
export const logError = (message: string, error?: Error, context?: Record<string, unknown>) => {
  logger.error(message, {
    error: error?.message,
    stack: error?.stack,
    ...context
  });
};

export const logInfo = (message: string, context?: Record<string, unknown>) => {
  logger.info(message, context);
};

export const logWarn = (message: string, context?: Record<string, unknown>) => {
  logger.warn(message, context);
};

export const logDebug = (message: string, context?: Record<string, unknown>) => {
  logger.debug(message, context);
};

// Payment-specific logging functions
export const logPaymentEvent = (event: string, paymentData: Record<string, unknown>) => {
  logger.info(`Payment ${event}`, {
    event,
    ...paymentData,
    timestamp: new Date().toISOString()
  });
};

export const logPaymentError = (event: string, error: Error, paymentData?: Record<string, unknown>) => {
  logger.error(`Payment ${event} failed`, {
    event,
    error: error.message,
    stack: error.stack,
    ...paymentData,
    timestamp: new Date().toISOString()
  });
};

export const logWebhookEvent = (provider: string, event: string, data: Record<string, unknown>) => {
  logger.info(`Webhook ${provider} ${event}`, {
    provider,
    event,
    ...data,
    timestamp: new Date().toISOString()
  });
};

export const logSecurityEvent = (event: string, userId?: string, ip?: string, details?: Record<string, unknown>) => {
  logger.warn(`Security ${event}`, {
    event,
    userId,
    ip,
    ...details,
    timestamp: new Date().toISOString()
  });
};
