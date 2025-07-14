import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { logger } from '../../libs/shared/src/logger';

const router = Router();
const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  lazyConnect: true,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 1,
});

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    memory: ServiceStatus;
    disk?: ServiceStatus;
  };
  details?: any;
}

interface ServiceStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: any;
}

// Simple health check
router.get('/', async (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    message: 'UltraMarket Backend API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Detailed health check
router.get('/detailed', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const healthCheck: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: await checkDatabase(),
        redis: await checkRedis(),
        memory: checkMemory(),
      },
    };

    // Determine overall status
    const serviceStatuses = Object.values(healthCheck.services).map(s => s.status);
    
    if (serviceStatuses.includes('unhealthy')) {
      healthCheck.status = 'unhealthy';
    } else if (serviceStatuses.includes('degraded')) {
      healthCheck.status = 'degraded';
    }

    const responseTime = Date.now() - startTime;
    healthCheck.details = {
      responseTime: `${responseTime}ms`,
      checks: Object.keys(healthCheck.services).length,
    };

    // Set HTTP status based on health
    const httpStatus = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503;

    res.status(httpStatus).json(healthCheck);
    
  } catch (error) {
    logger.error('Health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: {
        message: error.message,
        responseTime: `${Date.now() - startTime}ms`,
      },
    });
  }
});

// Readiness probe (for Kubernetes)
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check critical dependencies
    await checkDatabase();
    await checkRedis();
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      message: 'Service is ready to accept traffic',
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: 'Service is not ready',
      details: error.message,
    });
  }
});

// Liveness probe (for Kubernetes)  
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    message: 'Service is alive',
    uptime: process.uptime(),
    pid: process.pid,
  });
});

// Database health check
async function checkDatabase(): Promise<ServiceStatus> {
  const startTime = Date.now();
  
  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1 as test`;
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime < 1000 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        type: 'PostgreSQL',
        responseTime: `${responseTime}ms`,
      },
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message,
      details: {
        type: 'PostgreSQL',
        error: 'Connection failed',
      },
    };
  }
}

// Redis health check
async function checkRedis(): Promise<ServiceStatus> {
  const startTime = Date.now();
  
  try {
    await redis.ping();
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime < 500 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        type: 'Redis',
        responseTime: `${responseTime}ms`,
      },
    };
  } catch (error) {
    logger.error('Redis health check failed:', error);
    
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message,
      details: {
        type: 'Redis',
        error: 'Connection failed',
      },
    };
  }
}

// Memory health check
function checkMemory(): ServiceStatus {
  const memUsage = process.memoryUsage();
  const totalMem = memUsage.heapTotal;
  const usedMem = memUsage.heapUsed;
  const usagePercent = (usedMem / totalMem) * 100;
  
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (usagePercent > 90) {
    status = 'unhealthy';
  } else if (usagePercent > 80) {
    status = 'degraded';
  }
  
  return {
    status,
    details: {
      heapUsed: `${Math.round(usedMem / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(totalMem / 1024 / 1024)}MB`,
      usagePercent: `${usagePercent.toFixed(1)}%`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    },
  };
}

// API version info
router.get('/version', (req: Request, res: Response) => {
  res.json({
    version: process.env.npm_package_version || '1.0.0',
    name: 'UltraMarket Backend API',
    description: 'Professional E-commerce Platform Backend for Uzbekistan',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    pid: process.pid,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// System metrics (for monitoring)
router.get('/metrics', async (req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  try {
    // Get database connection info
    const dbMetrics = await getDatabaseMetrics();
    const redisMetrics = await getRedisMetrics();
    
    res.json({
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      database: dbMetrics,
      redis: redisMetrics,
      eventLoop: {
        delay: await getEventLoopDelay(),
      },
    });
  } catch (error) {
    logger.error('Metrics collection failed:', error);
    res.status(500).json({
      error: 'Failed to collect metrics',
      details: error.message,
    });
  }
});

// Helper functions
async function getDatabaseMetrics() {
  try {
    // This would require custom queries to get connection pool info
    return {
      status: 'connected',
      // connectionPool: await getConnectionPoolMetrics(),
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
    };
  }
}

async function getRedisMetrics() {
  try {
    const info = await redis.memory();
    return {
      status: 'connected',
      memoryUsage: info,
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
    };
  }
}

async function getEventLoopDelay(): Promise<number> {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const delta = process.hrtime.bigint() - start;
      resolve(Number(delta / BigInt(1000000))); // Convert to milliseconds
    });
  });
}

export default router;