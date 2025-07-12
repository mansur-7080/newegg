import { Request, Response, NextFunction } from 'express';

// Logger middleware
export const logger = (req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const userAgent = req.get('User-Agent') || 'Unknown';

  console.log(`[${timestamp}] ${method} ${url} - ${userAgent}`);

  next();
};

// Error handler middleware
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[ERROR] ${error.message}`);
  console.error(error.stack);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: isDevelopment ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString(),
    service: 'tech-product-service',
  });
};
