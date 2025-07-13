/**
 * UltraMarket Store Service
 * Professional store management service for e-commerce platform
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import winston from 'winston';

// Load environment variables
config();

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'store-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

const app = express();
const PORT = process.env.PORT || 3010;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'store-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected',
    redis: 'connected',
  });
});

// Store CRUD endpoints
app.post('/api/stores', async (req, res) => {
  try {
    const { name, description, address, phone, email, ownerId, category, status } = req.body;

    // Validate required fields
    if (!name || !ownerId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Name and ownerId are required',
      });
    }

    const store = await prisma.store.create({
      data: {
        name,
        description,
        address,
        phone,
        email,
        ownerId,
        category,
        status: status || 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Clear cache
    await redis.del('stores:all');
    await redis.del(`stores:owner:${ownerId}`);

    logger.info(`Store created: ${store.id}`);
    res.status(201).json({
      message: 'Store created successfully',
      data: store,
    });
  } catch (error) {
    logger.error('Error creating store:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create store',
    });
  }
});

app.get('/api/stores', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, status, ownerId } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Try to get from cache first
    const cacheKey = `stores:list:${page}:${limit}:${category}:${status}:${ownerId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (ownerId) where.ownerId = ownerId;

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { products: true, orders: true }
          }
        }
      }),
      prisma.store.count({ where })
    ]);

    const result = {
      data: stores,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    };

    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(result));

    res.json(result);
  } catch (error) {
    logger.error('Error fetching stores:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch stores',
    });
  }
});

app.get('/api/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Try cache first
    const cacheKey = `store:${id}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        products: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { products: true, orders: true }
        }
      }
    });

    if (!store) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Store not found',
      });
    }

    // Cache for 10 minutes
    await redis.setex(cacheKey, 600, JSON.stringify(store));

    res.json(store);
  } catch (error) {
    logger.error('Error fetching store:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch store',
    });
  }
});

app.put('/api/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, address, phone, email, category, status } = req.body;

    const store = await prisma.store.update({
      where: { id },
      data: {
        name,
        description,
        address,
        phone,
        email,
        category,
        status,
        updatedAt: new Date(),
      },
    });

    // Clear cache
    await redis.del(`store:${id}`);
    await redis.del('stores:all');
    await redis.del(`stores:owner:${store.ownerId}`);

    logger.info(`Store updated: ${id}`);
    res.json({
      message: 'Store updated successfully',
      data: store,
    });
  } catch (error) {
    logger.error('Error updating store:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update store',
    });
  }
});

app.delete('/api/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const store = await prisma.store.delete({
      where: { id },
    });

    // Clear cache
    await redis.del(`store:${id}`);
    await redis.del('stores:all');
    await redis.del(`stores:owner:${store.ownerId}`);

    logger.info(`Store deleted: ${id}`);
    res.json({
      message: 'Store deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting store:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete store',
    });
  }
});

// Store analytics endpoints
app.get('/api/stores/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30d' } = req.query;

    const cacheKey = `store:analytics:${id}:${period}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true, orders: true }
        }
      }
    });

    if (!store) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Store not found',
      });
    }

    // Calculate analytics
    const analytics = {
      storeId: id,
      period,
      totalProducts: store._count.products,
      totalOrders: store._count.orders,
      revenue: 0, // Would be calculated from orders
      averageOrderValue: 0,
      topProducts: [],
      recentActivity: [],
    };

    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(analytics));

    res.json(analytics);
  } catch (error) {
    logger.error('Error fetching store analytics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch store analytics',
    });
  }
});

// Store search endpoint
app.get('/api/stores/search', async (req, res) => {
  try {
    const { q, category, status } = req.query;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q as string, mode: 'insensitive' } },
        { description: { contains: q as string, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;
    if (status) where.status = status;

    const stores = await prisma.store.findMany({
      where,
      skip,
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      data: stores,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      },
    });
  } catch (error) {
    logger.error('Error searching stores:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search stores',
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message,
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`Store Service running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

export default app;