import { Request, Response, NextFunction } from 'express';
import { logger } from '@ultramarket/shared';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  // Generate request ID for tracking
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add request ID to request object for use in other middleware
  (req as any).requestId = requestId;
  
  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): Response {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
    
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};