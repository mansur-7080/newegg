import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface LoggedRequest extends Request {
  startTime?: number;
  requestId?: string;
}

export const requestLogger = (req: LoggedRequest, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  req.startTime = startTime;
  req.requestId = requestId;

  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);

  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    timestamp: new Date().toISOString(),
  });

  // Log outgoing response
  const originalSend = res.send;
  res.send = function(body: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    logger.info('Outgoing response', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
      timestamp: new Date().toISOString(),
    });

    return originalSend.call(this, body);
  };

  next();
};

export const fileUploadLogger = (req: LoggedRequest, res: Response, next: NextFunction): void => {
  if (req.file || req.files) {
    const fileInfo = req.file ? {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    } : req.files ? {
      count: Array.isArray(req.files) ? req.files.length : Object.keys(req.files).length,
      files: Array.isArray(req.files) ? req.files.map(f => ({
        filename: f.originalname,
        size: f.size,
        mimetype: f.mimetype,
      })) : Object.values(req.files).flat().map((f: any) => ({
        filename: f.originalname,
        size: f.size,
        mimetype: f.mimetype,
      })),
    } : null;

    logger.info('File upload detected', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      fileInfo,
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

export const sensitiveDataFilter = (req: LoggedRequest, res: Response, next: NextFunction): void => {
  // Filter out sensitive data from logs
  const originalJson = res.json;
  res.json = function(body: any) {
    const filteredBody = filterSensitiveData(body);
    
    if (req.requestId) {
      logger.debug('Response data', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        body: filteredBody,
        timestamp: new Date().toISOString(),
      });
    }

    return originalJson.call(this, body);
  };

  next();
};

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function filterSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  const filtered = { ...data };

  for (const key in filtered) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      filtered[key] = '[FILTERED]';
    } else if (typeof filtered[key] === 'object') {
      filtered[key] = filterSensitiveData(filtered[key]);
    }
  }

  return filtered;
}