import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { logger } from '../logging/logger';

// =================== SECURITY CONFIGURATION ===================

export interface SecurityConfig {
  cors: {
    origin: string | string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
  };
  rateLimit: {
    windowMs: number;
    max: number;
    message: string;
    standardHeaders: boolean;
    legacyHeaders: boolean;
  };
  helmet: {
    enabled: boolean;
    contentSecurityPolicy: boolean;
    hsts: boolean;
    noSniff: boolean;
    frameguard: boolean;
  };
  security: {
    enableXssProtection: boolean;
    enableHsts: boolean;
    enableNoSniff: boolean;
    enableFrameguard: boolean;
    enableContentSecurityPolicy: boolean;
  };
}

// Default security configuration
export const defaultSecurityConfig: SecurityConfig = {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Correlation-ID',
    ],
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  helmet: {
    enabled: process.env.HELMET_ENABLED !== 'false',
    contentSecurityPolicy: process.env.CSP_ENABLED !== 'false',
    hsts: true,
    noSniff: true,
    frameguard: true,
  },
  security: {
    enableXssProtection: true,
    enableHsts: true,
    enableNoSniff: true,
    enableFrameguard: true,
    enableContentSecurityPolicy: process.env.CSP_ENABLED !== 'false',
  },
};

// =================== SECURITY MIDDLEWARE ===================

/**
 * CORS middleware with professional configuration
 */
export function corsMiddleware(config: Partial<SecurityConfig['cors']> = {}) {
  const corsConfig = { ...defaultSecurityConfig.cors, ...config };

  logger.info('CORS middleware configured', {
    origins: corsConfig.origin,
    credentials: corsConfig.credentials,
    methods: corsConfig.methods,
  });

  return cors({
    origin: corsConfig.origin,
    credentials: corsConfig.credentials,
    methods: corsConfig.methods,
    allowedHeaders: corsConfig.allowedHeaders,
    optionsSuccessStatus: 200,
  });
}

/**
 * Rate limiting middleware
 */
export function rateLimitMiddleware(config: Partial<SecurityConfig['rateLimit']> = {}) {
  const rateLimitConfig = { ...defaultSecurityConfig.rateLimit, ...config };

  logger.info('Rate limiting middleware configured', {
    windowMs: rateLimitConfig.windowMs,
    max: rateLimitConfig.max,
  });

  return rateLimit({
    windowMs: rateLimitConfig.windowMs,
    max: rateLimitConfig.max,
    message: {
      success: false,
      error: {
        message: rateLimitConfig.message,
        code: 'RATE_LIMIT_EXCEEDED',
        timestamp: new Date(),
      },
    },
    standardHeaders: rateLimitConfig.standardHeaders,
    legacyHeaders: rateLimitConfig.legacyHeaders,
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
      });

      res.status(429).json({
        success: false,
        error: {
          message: rateLimitConfig.message,
          code: 'RATE_LIMIT_EXCEEDED',
          timestamp: new Date(),
          path: req.originalUrl,
          method: req.method,
        },
      });
    },
  });
}

/**
 * Helmet security middleware
 */
export function helmetMiddleware(config: Partial<SecurityConfig['helmet']> = {}) {
  const helmetConfig = { ...defaultSecurityConfig.helmet, ...config };

  if (!helmetConfig.enabled) {
    logger.warn('Helmet security middleware is disabled');
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  logger.info('Helmet security middleware configured', {
    contentSecurityPolicy: helmetConfig.contentSecurityPolicy,
    hsts: helmetConfig.hsts,
    noSniff: helmetConfig.noSniff,
    frameguard: helmetConfig.frameguard,
  });

  const helmetOptions: any = {};

  // Content Security Policy
  if (helmetConfig.contentSecurityPolicy) {
    helmetOptions.contentSecurityPolicy = {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    };
  }

  // HTTP Strict Transport Security
  if (helmetConfig.hsts) {
    helmetOptions.hsts = {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    };
  }

  // X-Content-Type-Options
  if (helmetConfig.noSniff) {
    helmetOptions.noSniff = true;
  }

  // X-Frame-Options
  if (helmetConfig.frameguard) {
    helmetOptions.frameguard = {
      action: 'deny',
    };
  }

  return helmet(helmetOptions);
}

/**
 * Input validation middleware
 */
export function inputValidationMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeInput(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeInput(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeInput(req.params);
    }

    next();
  };
}

/**
 * SQL Injection protection middleware
 */
export function sqlInjectionProtectionMiddleware() {
  const sqlKeywords = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
    'UNION', 'EXEC', 'EXECUTE', 'SCRIPT', 'DECLARE', 'CAST', 'CONVERT',
    'WAITFOR', 'DELAY', 'BENCHMARK', 'SLEEP', 'LOAD_FILE', 'INTO OUTFILE',
  ];

  return (req: Request, res: Response, next: NextFunction) => {
    const checkForSqlInjection = (obj: any): boolean => {
      if (typeof obj === 'string') {
        const upperStr = obj.toUpperCase();
        return sqlKeywords.some(keyword => upperStr.includes(keyword));
      }
      if (typeof obj === 'object' && obj !== null) {
        return Object.values(obj).some(value => checkForSqlInjection(value));
      }
      return false;
    };

    const hasSqlInjection = checkForSqlInjection(req.body) || 
                           checkForSqlInjection(req.query) || 
                           checkForSqlInjection(req.params);

    if (hasSqlInjection) {
      logger.warn('Potential SQL injection attempt detected', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        body: req.body,
        query: req.query,
        params: req.params,
      });

      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid input detected',
          code: 'INVALID_INPUT',
          timestamp: new Date(),
          path: req.originalUrl,
          method: req.method,
        },
      });
    }

    next();
  };
}

/**
 * XSS Protection middleware
 */
export function xssProtectionMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set XSS protection headers
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    next();
  };
}

/**
 * Request size limiter middleware
 */
export function requestSizeLimiter(maxSize: string = '10mb') {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSizeBytes = parseSizeString(maxSize);

    if (contentLength > maxSizeBytes) {
      logger.warn('Request size limit exceeded', {
        ip: req.ip,
        contentLength,
        maxSizeBytes,
        url: req.originalUrl,
      });

      return res.status(413).json({
        success: false,
        error: {
          message: 'Request entity too large',
          code: 'REQUEST_TOO_LARGE',
          timestamp: new Date(),
          path: req.originalUrl,
          method: req.method,
        },
      });
    }

    next();
  };
}

/**
 * Security headers middleware
 */
export function securityHeadersMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Security headers
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Remove sensitive headers
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    next();
  };
}

// =================== UTILITY FUNCTIONS ===================

/**
 * Sanitize input data
 */
function sanitizeInput(data: any): any {
  if (typeof data === 'string') {
    return data
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeInput(item));
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return data;
}

/**
 * Parse size string to bytes
 */
function parseSizeString(sizeStr: string): number {
  const units: { [key: string]: number } = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024,
  };

  const match = sizeStr.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/);
  if (!match) {
    return 10 * 1024 * 1024; // Default 10MB
  }

  const [, size, unit] = match;
  return parseFloat(size) * units[unit];
}

/**
 * Comprehensive security middleware setup
 */
export function setupSecurityMiddleware(config: Partial<SecurityConfig> = {}) {
  const securityConfig = {
    cors: { ...defaultSecurityConfig.cors, ...config.cors },
    rateLimit: { ...defaultSecurityConfig.rateLimit, ...config.rateLimit },
    helmet: { ...defaultSecurityConfig.helmet, ...config.helmet },
    security: { ...defaultSecurityConfig.security, ...config.security },
  };

  logger.info('Setting up security middleware', {
    corsEnabled: true,
    rateLimitEnabled: true,
    helmetEnabled: securityConfig.helmet.enabled,
    cspEnabled: securityConfig.helmet.contentSecurityPolicy,
  });

  return [
    corsMiddleware(securityConfig.cors),
    rateLimitMiddleware(securityConfig.rateLimit),
    helmetMiddleware(securityConfig.helmet),
    inputValidationMiddleware(),
    sqlInjectionProtectionMiddleware(),
    xssProtectionMiddleware(),
    requestSizeLimiter(),
    securityHeadersMiddleware(),
  ];
}

// =================== EXPORTS ===================

export {
  corsMiddleware,
  rateLimitMiddleware,
  helmetMiddleware,
  inputValidationMiddleware,
  sqlInjectionProtectionMiddleware,
  xssProtectionMiddleware,
  requestSizeLimiter,
  securityHeadersMiddleware,
  setupSecurityMiddleware,
};

export type {
  SecurityConfig,
}; 