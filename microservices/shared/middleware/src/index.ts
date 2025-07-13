import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
// Custom ValidationError class for middleware
export class ValidationError extends Error {
  public statusCode: number;
  public details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.statusCode = 400;
    this.details = details;
  }
}

// Request validation middleware
export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      req.body = validatedData.body;
      req.query = validatedData.query;
      req.params = validatedData.params;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.reduce(
          (acc, err) => {
            const field = err.path.join('.');
            acc[field] = err.message;
            return acc;
          },
          {} as Record<string, string>
        );

        next(new ValidationError('Request validation failed', { validationErrors }));
      } else {
        next(error);
      }
    }
  };
};

// Rate limiting middleware
export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
    max: options.max || 100, // limit each IP to 100 requests per windowMs
    message: options.message || 'Too many requests from this IP',
    standardHeaders: options.standardHeaders !== false, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: options.legacyHeaders !== false, // Disable the `X-RateLimit-*` headers
  });
};

// Security middleware
export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }),
];

// Request ID middleware
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.header('X-Request-ID') || generateRequestId();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// Logging middleware
export const createLoggingMiddleware = (logger: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Log request
    logger.info('Incoming request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.id,
      userId: (req as any).user?.userId || 'anonymous',
    });

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function (chunk?: any, encoding?: any) {
      const duration = Date.now() - startTime;
      
      logger.info('Outgoing response', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        requestId: req.id,
        userId: (req as any).user?.userId || 'anonymous',
      });

      return originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};

// Authentication middleware
export const createAuthMiddleware = (jwtSecret: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return next();
      }

      // Verify token logic would go here
      // For now, we'll just set a mock user
      (req as any).user = {
        userId: 'mock-user-id',
        email: 'mock@example.com',
        role: 'user',
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Authorization middleware
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!(req as any).user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }
  next();
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
    }

    next();
  };
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize params
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Error boundary middleware
export const errorBoundary = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log unhandled errors
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
};

// Health check middleware
export const healthCheck = (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    },
  });
};

// Utility functions
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

// Common validation schemas
export const commonSchemas = {
  pagination: z.object({
    query: z.object({
      page: z.string().optional().transform(val => parseInt(val || '1')),
      limit: z.string().optional().transform(val => parseInt(val || '10')),
      sort: z.string().optional(),
      order: z.enum(['asc', 'desc']).optional().default('desc'),
    }),
  }),

  idParam: z.object({
    params: z.object({
      id: z.string().min(1, 'ID is required'),
    }),
  }),

  searchQuery: z.object({
    query: z.object({
      q: z.string().min(1, 'Search query is required'),
      category: z.string().optional(),
      price_min: z.string().optional().transform(val => parseFloat(val || '0')),
      price_max: z.string().optional().transform(val => parseFloat(val || '999999')),
    }),
  }),
};