/**
 * Professional logging utility for Product Service
 */

interface LogData {
  [key: string]: any;
}

class Logger {
  private serviceName: string = 'ProductService';

  private formatMessage(level: string, message: string, data?: LogData): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      service: this.serviceName,
      message,
      ...(data && { data })
    };
    return JSON.stringify(logEntry);
  }

  info(message: string, data?: LogData): void {
    console.log(this.formatMessage('info', message, data));
  }

  error(message: string, error?: Error | any, data?: LogData): void {
    const errorData = {
      ...data,
      ...(error && {
        error: {
          message: error.message || error,
          stack: error.stack,
          name: error.name
        }
      })
    };
    console.error(this.formatMessage('error', message, errorData));
  }

  warn(message: string, data?: LogData): void {
    console.warn(this.formatMessage('warn', message, data));
  }

  debug(message: string, data?: LogData): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  /**
   * Log API requests
   */
  apiRequest(method: string, path: string, data?: LogData): void {
    this.info(`API ${method} ${path}`, {
      method,
      path,
      ...data
    });
  }

  /**
   * Log API responses
   */
  apiResponse(method: string, path: string, statusCode: number, data?: LogData): void {
    this.info(`API ${method} ${path} - ${statusCode}`, {
      method,
      path,
      statusCode,
      ...data
    });
  }

  /**
   * Log database operations
   */
  dbOperation(operation: string, table: string, data?: LogData): void {
    this.debug(`DB ${operation} ${table}`, {
      operation,
      table,
      ...data
    });
  }

  /**
   * Log business operations
   */
  businessEvent(event: string, data?: LogData): void {
    this.info(`Business Event: ${event}`, {
      event,
      ...data
    });
  }

  /**
   * Log security events
   */
  securityEvent(event: string, data?: LogData): void {
    this.warn(`Security Event: ${event}`, {
      event,
      security: true,
      ...data
    });
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, data?: LogData): void {
    this.info(`Performance: ${operation} took ${duration}ms`, {
      operation,
      duration,
      performance: true,
      ...data
    });
  }
}

// Export singleton instance
export const logger = new Logger();