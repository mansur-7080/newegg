/**
 * UltraMarket Analytics Service
 * Professional business intelligence and real-time analytics
 * O'zbekiston bozori uchun maxsus analytics
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
import cron from 'node-cron';
import { Server } from 'socket.io';
import { createServer } from 'http';

// Load environment variables
config();

// Initialize services
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

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
    new winston.transports.File({ filename: 'logs/analytics-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/analytics.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const PORT = process.env.PORT || 3020;

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
  max: 200,
  message: {
    error: 'Too many requests',
    message: 'Juda ko\'p so\'rov. Iltimos, keyinroq urinib ko\'ring.'
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Validation schemas
const analyticsQuerySchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  period: Joi.string().valid('1d', '7d', '30d', '90d', '1y').default('30d'),
  storeId: Joi.string().uuid().optional(),
  category: Joi.string().optional(),
  region: Joi.string().optional()
});

// Analytics calculation functions
class AnalyticsService {
  
  async calculateSalesAnalytics(filters: any) {
    const { startDate, endDate, storeId, category, region } = filters;
    
    const whereClause: any = {};
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    if (storeId) whereClause.storeId = storeId;

    const [orders, revenue, avgOrderValue] = await Promise.all([
      prisma.order.count({ where: whereClause }),
      prisma.order.aggregate({
        where: { ...whereClause, status: 'completed' },
        _sum: { total: true }
      }),
      prisma.order.aggregate({
        where: { ...whereClause, status: 'completed' },
        _avg: { total: true }
      })
    ]);

    return {
      totalOrders: orders || 0,
      totalRevenue: revenue._sum.total || 0,
      averageOrderValue: avgOrderValue._avg.total || 0
    };
  }

  async calculateUserAnalytics(filters: any) {
    const { startDate, endDate } = filters;
    
    // Simulate user analytics (would connect to user service in real implementation)
    const activeUsers = await redis.get('analytics:active_users') || '0';
    const newUsers = await redis.get('analytics:new_users') || '0';
    
    return {
      activeUsers: parseInt(activeUsers),
      newUsers: parseInt(newUsers),
      userRetention: 0.75, // 75% retention rate
      averageSessionDuration: 420 // 7 minutes in seconds
    };
  }

  async calculateProductAnalytics(filters: any) {
    const { storeId, category } = filters;
    
    const whereClause: any = {};
    if (storeId) whereClause.storeId = storeId;
    if (category) whereClause.category = category;

    const [totalProducts, activeProducts, topProducts] = await Promise.all([
      prisma.product.count({ where: whereClause }),
      prisma.product.count({ where: { ...whereClause, isActive: true } }),
      prisma.product.findMany({
        where: whereClause,
        include: {
          _count: {
            select: { orderItems: true }
          }
        },
        orderBy: {
          orderItems: {
            _count: 'desc'
          }
        },
        take: 10
      })
    ]);

    return {
      totalProducts,
      activeProducts,
      topSellingProducts: topProducts.map(p => ({
        id: p.id,
        name: p.name,
        sales: p._count.orderItems,
        revenue: 0 // Would calculate from order items
      }))
    };
  }

  async calculateRegionalAnalytics() {
    // O'zbekiston viloyatlari bo'yicha analytics
    const regions = [
      'Toshkent', 'Samarqand', 'Buxoro', 'Andijon', 'Farg\'ona', 
      'Namangan', 'Qashqadaryo', 'Surxondaryo', 'Jizzax', 
      'Sirdaryo', 'Navoiy', 'Xorazm', 'Qoraqalpog\'iston'
    ];

    const regionalData = await Promise.all(
      regions.map(async (region) => {
        const orders = await redis.get(`analytics:region:${region}:orders`) || '0';
        const revenue = await redis.get(`analytics:region:${region}:revenue`) || '0';
        
        return {
          region,
          orders: parseInt(orders),
          revenue: parseFloat(revenue),
          growth: Math.random() * 20 - 10 // Simulated growth rate
        };
      })
    );

    return regionalData;
  }

  async calculateRealTimeMetrics() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [recentOrders, activeUsers, currentRevenue] = await Promise.all([
      prisma.order.count({
        where: {
          createdAt: { gte: oneHourAgo }
        }
      }),
      redis.get('analytics:current_active_users') || '0',
      prisma.order.aggregate({
        where: {
          createdAt: { gte: oneHourAgo },
          status: 'completed'
        },
        _sum: { total: true }
      })
    ]);

    return {
      ordersLastHour: recentOrders,
      activeUsers: parseInt(activeUsers),
      revenueLastHour: currentRevenue._sum.total || 0,
      timestamp: now.toISOString()
    };
  }
}

const analyticsService = new AnalyticsService();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'analytics-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.0.0'
  });
});

// Dashboard analytics
app.get('/api/analytics/dashboard', async (req, res) => {
  try {
    const { error, value } = analyticsQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'So\'rov parametrlari noto\'g\'ri',
        details: error.details
      });
    }

    // Calculate date range
    const endDate = value.endDate || new Date();
    const startDate = value.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filters = { ...value, startDate, endDate };

    const [salesData, userData, productData, regionalData] = await Promise.all([
      analyticsService.calculateSalesAnalytics(filters),
      analyticsService.calculateUserAnalytics(filters),
      analyticsService.calculateProductAnalytics(filters),
      analyticsService.calculateRegionalAnalytics()
    ]);

    const dashboardData = {
      sales: salesData,
      users: userData,
      products: productData,
      regional: regionalData,
      period: value.period,
      lastUpdated: new Date().toISOString()
    };

    // Cache dashboard data for 5 minutes
    await redis.setEx('analytics:dashboard', 300, JSON.stringify(dashboardData));

    res.json({
      success: true,
      message: 'Dashboard ma\'lumotlari muvaffaqiyatli olindi',
      data: dashboardData
    });

  } catch (error) {
    logger.error('Error fetching dashboard analytics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Analitika ma\'lumotlarini olishda xatolik'
    });
  }
});

// Sales analytics
app.get('/api/analytics/sales', async (req, res) => {
  try {
    const { error, value } = analyticsQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details
      });
    }

    const salesData = await analyticsService.calculateSalesAnalytics(value);

    res.json({
      success: true,
      data: salesData
    });

  } catch (error) {
    logger.error('Error fetching sales analytics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Sotuv analitikasini olishda xatolik'
    });
  }
});

// Product performance analytics
app.get('/api/analytics/products', async (req, res) => {
  try {
    const { error, value } = analyticsQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details
      });
    }

    const productData = await analyticsService.calculateProductAnalytics(value);

    res.json({
      success: true,
      data: productData
    });

  } catch (error) {
    logger.error('Error fetching product analytics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Mahsulot analitikasini olishda xatolik'
    });
  }
});

// Regional analytics (O'zbekiston specific)
app.get('/api/analytics/regional', async (req, res) => {
  try {
    const regionalData = await analyticsService.calculateRegionalAnalytics();

    res.json({
      success: true,
      message: 'Viloyatlar bo\'yicha analitika',
      data: regionalData
    });

  } catch (error) {
    logger.error('Error fetching regional analytics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Viloyat analitikasini olishda xatolik'
    });
  }
});

// Real-time metrics
app.get('/api/analytics/realtime', async (req, res) => {
  try {
    const realtimeData = await analyticsService.calculateRealTimeMetrics();

    res.json({
      success: true,
      data: realtimeData
    });

  } catch (error) {
    logger.error('Error fetching realtime analytics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Real-time ma\'lumotlarni olishda xatolik'
    });
  }
});

// Custom reports endpoint
app.post('/api/analytics/reports', async (req, res) => {
  try {
    const { reportType, filters, format = 'json' } = req.body;

    let reportData;
    switch (reportType) {
      case 'sales':
        reportData = await analyticsService.calculateSalesAnalytics(filters);
        break;
      case 'products':
        reportData = await analyticsService.calculateProductAnalytics(filters);
        break;
      case 'regional':
        reportData = await analyticsService.calculateRegionalAnalytics();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid report type',
          message: 'Noto\'g\'ri hisobot turi'
        });
    }

    res.json({
      success: true,
      reportType,
      format,
      data: reportData,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error generating custom report', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Hisobot yaratishda xatolik'
    });
  }
});

// WebSocket for real-time analytics
io.on('connection', (socket) => {
  logger.info('Client connected to analytics', { socketId: socket.id });

  socket.on('subscribe-realtime', () => {
    socket.join('realtime-analytics');
    logger.info('Client subscribed to realtime analytics', { socketId: socket.id });
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected from analytics', { socketId: socket.id });
  });
});

// Cron job for updating analytics cache
cron.schedule('*/5 * * * *', async () => {
  try {
    logger.info('Updating analytics cache...');
    
    const realtimeData = await analyticsService.calculateRealTimeMetrics();
    
    // Broadcast real-time data to connected clients
    io.to('realtime-analytics').emit('analytics-update', realtimeData);
    
    // Update cache
    await redis.setEx('analytics:realtime', 300, JSON.stringify(realtimeData));
    
    logger.info('Analytics cache updated successfully');
  } catch (error) {
    logger.error('Error updating analytics cache', { error: error.message });
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
    server.close();
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

    server.listen(PORT, () => {
      logger.info(`Analytics Service running on port ${PORT}`);
      console.log(`📊 Analytics Service ishlamoqda: http://localhost:${PORT}`);
      console.log(`🔍 Real-time analytics: WebSocket enabled`);
      console.log(`📈 Health check: http://localhost:${PORT}/health`);
    });

  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

startServer();

export default app;
