import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
        iat?: number;
        exp?: number;
      };
    }
  }
}

export interface PerformanceMetric {
  responseTime: number;
  statusCode: number;
  method: string;
  endpoint: string;
  timestamp: Date;
}

export {};