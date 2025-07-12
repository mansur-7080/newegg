import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Basic health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                   example: user-service
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 */
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'user-service',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

/**
 * @swagger
 * /api/v1/health/detailed:
 *   get:
 *     summary: Detailed health check with dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service and dependencies are healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                   example: user-service
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 dependencies:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: ok
 *                         latency:
 *                           type: string
 *                           example: 2ms
 *                     redis:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: ok
 *                         latency:
 *                           type: string
 *                           example: 1ms
 *       503:
 *         description: Service or dependencies are unhealthy
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const healthCheck = {
    status: 'ok',
    service: 'user-service',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    dependencies: {
      database: { status: 'unknown', latency: '0ms' },
      redis: { status: 'unknown', latency: '0ms' },
    },
  };

  let isHealthy = true;

  try {
    // Check database connection
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;

    healthCheck.dependencies.database = {
      status: 'ok',
      latency: `${dbLatency}ms`,
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    healthCheck.dependencies.database = {
      status: 'error',
      latency: '0ms',
    };
    isHealthy = false;
  }

  try {
    // Check Redis connection
    const redisStart = Date.now();
    await redis.ping();
    const redisLatency = Date.now() - redisStart;

    healthCheck.dependencies.redis = {
      status: 'ok',
      latency: `${redisLatency}ms`,
    };
  } catch (error) {
    logger.error('Redis health check failed:', error);
    healthCheck.dependencies.redis = {
      status: 'error',
      latency: '0ms',
    };
    isHealthy = false;
  }

  if (!isHealthy) {
    healthCheck.status = 'degraded';
    res.status(503).json(healthCheck);
  } else {
    res.status(200).json(healthCheck);
  }
});

/**
 * @swagger
 * /api/v1/health/ready:
 *   get:
 *     summary: Readiness probe
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready to accept requests
 *       503:
 *         description: Service is not ready
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if service can handle requests
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api/v1/health/live:
 *   get:
 *     summary: Liveness probe
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

export default router;
