import { Router, Request, Response } from 'express';
import { getRedisClient } from '../config/redis';
import mongoose from 'mongoose';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed'
    });
  }
});

router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const redisClient = getRedisClient();
    
    // Check Redis
    const redisStatus = await redisClient.ping().then(() => 'OK').catch(() => 'ERROR');
    
    // Check MongoDB
    const mongoStatus = mongoose.connection.readyState === 1 ? 'OK' : 'ERROR';
    
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        redis: redisStatus,
        mongodb: mongoStatus
      }
    };

    const hasErrors = Object.values(health.services).some(status => status === 'ERROR');
    
    res.status(hasErrors ? 503 : 200).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Detailed health check failed'
    });
  }
});

export default router;