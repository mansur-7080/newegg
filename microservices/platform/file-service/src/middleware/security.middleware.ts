import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

// Rate limiting configurations
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
    
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: '15 minutes',
      timestamp: new Date().toISOString(),
    });
  },
});

export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 uploads per hour
  message: {
    error: 'Too many uploads',
    message: 'Too many file uploads from this IP, please try again later.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Upload rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
    
    res.status(429).json({
      error: 'Too many uploads',
      message: 'Upload rate limit exceeded. Please try again later.',
      retryAfter: '1 hour',
      timestamp: new Date().toISOString(),
    });
  },
});

export const downloadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 downloads per 15 minutes
  message: {
    error: 'Too many downloads',
    message: 'Too many file downloads from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers middleware
export const securityMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

// File type validation
export const validateFileType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];
    
    for (const file of files as Express.Multer.File[]) {
      if (file && !allowedTypes.includes(file.mimetype)) {
        res.status(400).json({
          error: 'Invalid file type',
          message: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    next();
  };
};

// File size validation
export const validateFileSize = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];
    
    for (const file of files as Express.Multer.File[]) {
      if (file && file.size > maxSize) {
        res.status(400).json({
          error: 'File too large',
          message: `File size ${file.size} exceeds maximum allowed size of ${maxSize} bytes`,
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    next();
  };
};

// Virus scanning placeholder (would integrate with actual antivirus)
export const virusScan = (req: Request, res: Response, next: NextFunction): void => {
  // This is a placeholder for virus scanning
  // In production, integrate with actual antivirus solutions like ClamAV
  
  if (req.file || req.files) {
    logger.info('File virus scan initiated', {
      files: req.file ? [req.file.originalname] : req.files ? Object.keys(req.files) : [],
      timestamp: new Date().toISOString(),
    });
    
    // Simulate virus scan (always passes for now)
    const scanResults = { clean: true, threats: [] };
    
    if (!scanResults.clean) {
      logger.error('Virus detected in uploaded file', {
        threats: scanResults.threats,
        timestamp: new Date().toISOString(),
      });
      
      res.status(400).json({
        error: 'Security threat detected',
        message: 'The uploaded file contains malicious content and has been rejected.',
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }
  
  next();
};

// IP whitelist middleware
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress || '';
    
    if (!allowedIPs.includes(clientIP)) {
      logger.warn('Access denied for IP not in whitelist', {
        ip: clientIP,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString(),
      });
      
      res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address is not authorized to access this service.',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    next();
  };
};

// API key validation (for service-to-service communication)
export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKey = process.env.FILE_SERVICE_API_KEY;
  
  if (!validApiKey) {
    // If no API key is configured, skip validation (development mode)
    return next();
  }
  
  if (!apiKey || apiKey !== validApiKey) {
    logger.warn('Invalid API key provided', {
      providedKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'none',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
    
    res.status(401).json({
      error: 'Invalid API key',
      message: 'A valid API key is required to access this endpoint.',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  next();
};