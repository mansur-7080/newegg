/**
 * Monitoring Service
 * Professional monitoring implementation for UltraMarket
 */

import { logger } from '../utils/logger';

export interface MetricsData {
  timestamp: Date;
  service: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  checks: {
    database: boolean;
    redis: boolean;
    externalServices: boolean;
  };
  details: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: number;
  };
}

export class MonitoringService {
  private metrics: MetricsData[] = [];
  private readonly MAX_METRICS = 1000; // Keep last 1000 metrics
  private startTime: Date = new Date();

  constructor() {
    // Clean up old metrics periodically
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60000); // Every minute
  }

  /**
   * Record API metric
   */
  recordMetric(data: Omit<MetricsData, 'timestamp'>): void {
    try {
      const metric: MetricsData = {
        ...data,
        timestamp: new Date()
      };

      this.metrics.push(metric);

      // Keep only last MAX_METRICS
      if (this.metrics.length > this.MAX_METRICS) {
        this.metrics = this.metrics.slice(-this.MAX_METRICS);
      }

      // Log important metrics
      if (data.statusCode >= 400) {
        logger.warn('API Error', {
          endpoint: data.endpoint,
          method: data.method,
          statusCode: data.statusCode,
          responseTime: data.responseTime,
          userId: data.userId
        });
      }

      // Log slow requests
      if (data.responseTime > 1000) { // > 1 second
        logger.warn('Slow API Request', {
          endpoint: data.endpoint,
          method: data.method,
          responseTime: data.responseTime,
          userId: data.userId
        });
      }
    } catch (error) {
      logger.error('Failed to record metric', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get health check result
   */
  async getHealthCheck(): Promise<HealthCheckResult> {
    try {
      const checks = {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
        externalServices: await this.checkExternalServices()
      };

      const status = this.determineHealthStatus(checks);
      const uptime = Date.now() - this.startTime.getTime();

      return {
        status,
        timestamp: new Date(),
        checks,
        details: {
          uptime,
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage().user
        }
      };
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        status: 'unhealthy',
        timestamp: new Date(),
        checks: {
          database: false,
          redis: false,
          externalServices: false
        },
        details: {
          uptime: Date.now() - this.startTime.getTime(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: 0
        }
      };
    }
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    topEndpoints: Array<{ endpoint: string; count: number }>;
    recentErrors: MetricsData[];
  } {
    try {
      const totalRequests = this.metrics.length;
      const averageResponseTime = totalRequests > 0 
        ? this.metrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests 
        : 0;
      
      const errorCount = this.metrics.filter(m => m.statusCode >= 400).length;
      const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

      // Top endpoints
      const endpointCounts = this.metrics.reduce((acc, metric) => {
        const key = `${metric.method} ${metric.endpoint}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topEndpoints = Object.entries(endpointCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, count }));

      // Recent errors (last 10)
      const recentErrors = this.metrics
        .filter(m => m.statusCode >= 400)
        .slice(-10)
        .reverse();

      return {
        totalRequests,
        averageResponseTime,
        errorRate,
        topEndpoints,
        recentErrors
      };
    } catch (error) {
      logger.error('Failed to get metrics summary', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        topEndpoints: [],
        recentErrors: []
      };
    }
  }

  /**
   * Check database health
   */
  private async checkDatabase(): Promise<boolean> {
    try {
      // Import Prisma dynamically to avoid circular dependency
      const { prisma } = await import('../index');
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Check Redis health
   */
  private async checkRedis(): Promise<boolean> {
    try {
      // This would need Redis client implementation
      // For now, return true if REDIS_URL is configured
      return !!process.env.REDIS_URL;
    } catch (error) {
      logger.error('Redis health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Check external services health
   */
  private async checkExternalServices(): Promise<boolean> {
    try {
      // Check if required environment variables are set
      const requiredServices = [
        'SMTP_HOST',
        'TWILIO_ACCOUNT_SID',
        'JWT_SECRET'
      ];

      const missingServices = requiredServices.filter(service => !process.env[service]);
      
      if (missingServices.length > 0) {
        logger.warn('Missing external service configurations', { missingServices });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('External services health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Determine overall health status
   */
  private determineHealthStatus(checks: { database: boolean; redis: boolean; externalServices: boolean }): 'healthy' | 'unhealthy' | 'degraded' {
    const { database, redis, externalServices } = checks;
    
    if (database && redis && externalServices) {
      return 'healthy';
    } else if (database) { // Database is critical
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      this.metrics = this.metrics.filter(metric => metric.timestamp > oneHourAgo);
    } catch (error) {
      logger.error('Failed to cleanup old metrics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get service uptime
   */
  getUptime(): number {
    return Date.now() - this.startTime.getTime();
  }

  /**
   * Reset metrics (for testing)
   */
  resetMetrics(): void {
    this.metrics = [];
    this.startTime = new Date();
  }
}

export default MonitoringService;