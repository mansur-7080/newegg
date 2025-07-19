import winston from 'winston';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.colorize({ all: !isProduction })
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: isDevelopment 
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        : winston.format.json()
    }),

    // File transports for production
    ...(isProduction ? [
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 10
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 10
      })
    ] : [])
  ],
  exitOnError: false
});

// Handle uncaught exceptions and unhandled rejections
if (isProduction) {
  logger.exceptions.handle(
    new winston.transports.File({ 
      filename: 'logs/exceptions.log',
      maxsize: 5242880,
      maxFiles: 5
    })
  );

  logger.rejections.handle(
    new winston.transports.File({ 
      filename: 'logs/rejections.log',
      maxsize: 5242880,
      maxFiles: 5
    })
  );
}

export default logger;