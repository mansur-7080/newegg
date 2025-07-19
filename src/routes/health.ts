import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database?: 'connected' | 'disconnected' | 'error';
    redis?: 'connected' | 'disconnected' | 'error';
    external?: 'available' | 'unavailable' | 'error';
  };
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  system: {
    loadavg: number[];
    platform: string;
    arch: string;
    nodeVersion: string;
  };
}

// Basic health check
router.get('/', async (req: Request, res: Response) => {
  try {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
    const usedMemory = memoryUsage.heapUsed;
    const freeMemory = totalMemory - usedMemory;
    
    const healthStatus: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        // These would be checked against actual connections
        database: 'connected',
        redis: 'connected',
        external: 'available'
      },
      memory: {
        used: Math.round((usedMemory / 1024 / 1024) * 100) / 100, // MB
        free: Math.round((freeMemory / 1024 / 1024) * 100) / 100, // MB
        total: Math.round((totalMemory / 1024 / 1024) * 100) / 100, // MB
        percentage: Math.round((usedMemory / totalMemory) * 100)
      },
      system: {
        loadavg: require('os').loadavg(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version
      }
    };

    // Check if system is under stress
    if (healthStatus.memory.percentage > 90) {
      healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(healthStatus);

  } catch (error) {
    logger.error('Health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Detailed health check
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      
      // Process information
      process: {
        pid: process.pid,
        ppid: process.ppid,
        title: process.title,
        argv: process.argv,
        execPath: process.execPath,
        cwd: process.cwd()
      },
      
      // Memory usage
      memory: {
        ...process.memoryUsage(),
        external: Math.round((process.memoryUsage().external / 1024 / 1024) * 100) / 100,
        heapUsed: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        heapTotal: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100
      },
      
      // CPU usage
      cpu: {
        usage: process.cpuUsage(),
        loadavg: require('os').loadavg()
      },
      
      // System information
      system: {
        platform: process.platform,
        arch: process.arch,
        release: require('os').release(),
        type: require('os').type(),
        hostname: require('os').hostname(),
        freememory: Math.round((require('os').freemem() / 1024 / 1024) * 100) / 100,
        totalmemory: Math.round((require('os').totalmem() / 1024 / 1024) * 100) / 100,
        cpus: require('os').cpus().length
      },
      
      // Network interfaces
      network: require('os').networkInterfaces()
    };

    res.json(healthData);

  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'error',
      message: 'Detailed health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Readiness probe (for Kubernetes)
router.get('/ready', (req: Request, res: Response) => {
  // Check if all required services are ready
  // This is a simplified check - you'd check actual database connections, etc.
  const isReady = true; // Replace with actual readiness checks
  
  if (isReady) {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness probe (for Kubernetes)
router.get('/live', (req: Request, res: Response) => {
  // Simple liveness check
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export { router as healthRouter };