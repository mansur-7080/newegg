/**
 * UltraMarket Store Service
 * Complete vendor/marketplace management service
 * O'zbekiston bozori uchun maxsus moslashtirilgan
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import winston from 'winston';
import { config } from 'dotenv';
import Joi from 'joi';

// Load environment variables
config();

// Initialize services
const app = express();
const prisma = new PrismaClient();
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/store-service-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/store-service.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const PORT = process.env.PORT || 3004;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too many requests',
    message: 'Juda ko\'p so\'rov. Iltimos, keyinroq urinib ko\'ring.'
  }
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Validation schemas
const storeCreateSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),
  category: Joi.string().valid('electronics', 'clothing', 'books', 'home', 'sports', 'beauty', 'automotive', 'food').required(),
  ownerId: Joi.string().uuid().required(),
  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    region: Joi.string().valid('Toshkent', 'Samarqand', 'Buxoro', 'Andijon', 'Farg\'ona', 'Namangan', 'Qashqadaryo', 'Surxondaryo', 'Jizzax', 'Sirdaryo', 'Navoiy', 'Xorazm', 'Qoraqalpog\'iston').required(),
    postalCode: Joi.string().pattern(/^\d{6}$/).required()
  }).required(),
  contact: Joi.object({
    phone: Joi.string().pattern(/^\+998\d{9}$/).required(),
    email: Joi.string().email().required(),
    website: Joi.string().uri().optional()
  }).required(),
  businessInfo: Joi.object({
    businessType: Joi.string().valid('individual', 'llc', 'corporation').required(),
    taxId: Joi.string().required(),
    bankAccount: Joi.string().required(),
    license: Joi.string().optional()
  }).required()
});

const storeUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().min(10).max(1000).optional(),
  category: Joi.string().valid('electronics', 'clothing', 'books', 'home', 'sports', 'beauty', 'automotive', 'food').optional(),
  address: Joi.object({
    street: Joi.string().optional(),
    city: Joi.string().optional(),
    region: Joi.string().valid('Toshkent', 'Samarqand', 'Buxoro', 'Andijon', 'Farg\'ona', 'Namangan', 'Qashqadaryo', 'Surxondaryo', 'Jizzax', 'Sirdaryo', 'Navoiy', 'Xorazm', 'Qoraqalpog\'iston').optional(),
    postalCode: Joi.string().pattern(/^\d{6}$/).optional()
  }).optional(),
  contact: Joi.object({
    phone: Joi.string().pattern(/^\+998\d{9}$/).optional(),
    email: Joi.string().email().optional(),
    website: Joi.string().uri().optional()
  }).optional(),
  status: Joi.string().valid('active', 'inactive', 'suspended', 'pending').optional()
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'store-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Create new store
app.post('/api/stores', async (req, res) => {
  try {
    const { error, value } = storeCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Ma\'lumotlarni to\'g\'ri kiriting',
        details: error.details
      });
    }

    // Check if store name already exists
    const existingStore = await prisma.store.findFirst({
      where: { name: value.name }
    });

    if (existingStore) {
      return res.status(409).json({
        success: false,
        error: 'Store name already exists',
        message: 'Bu nom bilan do\'kon allaqachon mavjud'
      });
    }

    // Create store
    const store = await prisma.store.create({
      data: {
        name: value.name,
        description: value.description,
        category: value.category,
        ownerId: value.ownerId,
        address: value.address,
        contact: value.contact,
        businessInfo: value.businessInfo,
        status: 'pending',
        rating: 0,
        totalSales: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Cache store data
    await redis.setEx(`store:${store.id}`, 3600, JSON.stringify(store));

    logger.info('Store created successfully', { storeId: store.id, ownerId: value.ownerId });

    res.status(201).json({
      success: true,
      message: 'Do\'kon muvaffaqiyatli yaratildi',
      data: store
    });

  } catch (error) {
    logger.error('Error creating store', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Do\'kon yaratishda xatolik yuz berdi'
    });
  }
});

// Get all stores with filtering and pagination
app.get('/api/stores', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    const region = req.query.region as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const skip = (page - 1) * limit;

    // Build filter conditions
    const where: any = {};
    if (category) where.category = category;
    if (region) where.address = { path: ['region'], equals: region };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get stores with pagination
    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { products: true }
          }
        }
      }),
      prisma.store.count({ where })
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    res.json({
      success: true,
      data: stores,
      pagination: {
        current: page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev
      }
    });

  } catch (error) {
    logger.error('Error fetching stores', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Do\'konlarni olishda xatolik yuz berdi'
    });
  }
});

// Get single store by ID
app.get('/api/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check cache first
    const cached = await redis.get(`store:${id}`);
    if (cached) {
      const store = JSON.parse(cached);
      return res.json({
        success: true,
        data: store,
        cached: true
      });
    }

    // Get from database
    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        products: {
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
        success: false,
        error: 'Store not found',
        message: 'Do\'kon topilmadi'
      });
    }

    // Cache for 1 hour
    await redis.setEx(`store:${id}`, 3600, JSON.stringify(store));

    res.json({
      success: true,
      data: store
    });

  } catch (error) {
    logger.error('Error fetching store', { error: error.message, storeId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Do\'konni olishda xatolik yuz berdi'
    });
  }
});

// Update store
app.put('/api/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = storeUpdateSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Ma\'lumotlarni to\'g\'ri kiriting',
        details: error.details
      });
    }

    // Check if store exists
    const existingStore = await prisma.store.findUnique({
      where: { id }
    });

    if (!existingStore) {
      return res.status(404).json({
        success: false,
        error: 'Store not found',
        message: 'Do\'kon topilmadi'
      });
    }

    // Update store
    const updatedStore = await prisma.store.update({
      where: { id },
      data: {
        ...value,
        updatedAt: new Date()
      }
    });

    // Update cache
    await redis.setEx(`store:${id}`, 3600, JSON.stringify(updatedStore));

    logger.info('Store updated successfully', { storeId: id });

    res.json({
      success: true,
      message: 'Do\'kon muvaffaqiyatli yangilandi',
      data: updatedStore
    });

  } catch (error) {
    logger.error('Error updating store', { error: error.message, storeId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Do\'konni yangilashda xatolik yuz berdi'
    });
  }
});

// Delete store (soft delete)
app.delete('/api/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const store = await prisma.store.findUnique({
      where: { id }
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found',
        message: 'Do\'kon topilmadi'
      });
    }

    // Soft delete
    await prisma.store.update({
      where: { id },
      data: {
        status: 'inactive',
        deletedAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Remove from cache
    await redis.del(`store:${id}`);

    logger.info('Store deleted successfully', { storeId: id });

    res.json({
      success: true,
      message: 'Do\'kon muvaffaqiyatli o\'chirildi'
    });

  } catch (error) {
    logger.error('Error deleting store', { error: error.message, storeId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Do\'konni o\'chirishda xatolik yuz berdi'
    });
  }
});

// Get store analytics
app.get('/api/stores/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30d' } = req.query;

    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const [orders, revenue, products, reviews] = await Promise.all([
      prisma.order.count({
        where: {
          storeId: id,
          createdAt: { gte: startDate }
        }
      }),
      prisma.order.aggregate({
        where: {
          storeId: id,
          status: 'completed',
          createdAt: { gte: startDate }
        },
        _sum: { total: true }
      }),
      prisma.product.count({
        where: { storeId: id }
      }),
      prisma.review.aggregate({
        where: {
          product: { storeId: id },
          createdAt: { gte: startDate }
        },
        _avg: { rating: true },
        _count: { id: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        period,
        orders: orders || 0,
        revenue: revenue._sum.total || 0,
        products: products || 0,
        averageRating: reviews._avg.rating || 0,
        totalReviews: reviews._count.id || 0
      }
    });

  } catch (error) {
    logger.error('Error fetching store analytics', { error: error.message, storeId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Analitikani olishda xatolik yuz berdi'
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack, url: req.url });
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: 'Ichki server xatoligi'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'So\'ralgan resurs topilmadi'
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  
  try {
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    // Connect to Redis
    await redis.connect();
    logger.info('Connected to Redis');

    // Test database connection
    await prisma.$connect();
    logger.info('Connected to database');

    app.listen(PORT, () => {
      logger.info(`Store Service running on port ${PORT}`);
      console.log(`🏪 Store Service ishlamoqda: http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });

  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

startServer();

export default app;