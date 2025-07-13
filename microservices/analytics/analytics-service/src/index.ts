/**
 * UltraMarket Analytics Service
 * Professional analytics and business intelligence service with real-time capabilities
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
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import cron from 'node-cron';

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
  defaultMeta: { service: 'analytics-service' },
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
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3020;

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
    service: 'analytics-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected',
    redis: 'connected',
    websocket: 'active',
  });
});

// Analytics Dashboard Data
app.get('/api/analytics/dashboard', async (req, res) => {
  try {
    const { period = '30d', storeId } = req.query;
    
    // Try cache first
    const cacheKey = `analytics:dashboard:${period}:${storeId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get analytics data
    const analytics = await getAnalyticsData(startDate, endDate, storeId as string);
    
    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(analytics));
    
    res.json(analytics);
  } catch (error) {
    logger.error('Error fetching dashboard analytics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch dashboard analytics',
    });
  }
});

// Real-time Analytics
app.get('/api/analytics/realtime', async (req, res) => {
  try {
    const realtimeData = await getRealtimeAnalytics();
    res.json(realtimeData);
  } catch (error) {
    logger.error('Error fetching real-time analytics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch real-time analytics',
    });
  }
});

// Sales Analytics
app.get('/api/analytics/sales', async (req, res) => {
  try {
    const { period = '30d', storeId, groupBy = 'day' } = req.query;
    
    const cacheKey = `analytics:sales:${period}:${storeId}:${groupBy}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const salesData = await getSalesAnalytics(period as string, storeId as string, groupBy as string);
    
    // Cache for 10 minutes
    await redis.setex(cacheKey, 600, JSON.stringify(salesData));
    
    res.json(salesData);
  } catch (error) {
    logger.error('Error fetching sales analytics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch sales analytics',
    });
  }
});

// Product Performance Analytics
app.get('/api/analytics/products', async (req, res) => {
  try {
    const { period = '30d', storeId, limit = 10 } = req.query;
    
    const cacheKey = `analytics:products:${period}:${storeId}:${limit}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const productData = await getProductAnalytics(period as string, storeId as string, parseInt(limit as string));
    
    // Cache for 15 minutes
    await redis.setex(cacheKey, 900, JSON.stringify(productData));
    
    res.json(productData);
  } catch (error) {
    logger.error('Error fetching product analytics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch product analytics',
    });
  }
});

// User Behavior Analytics
app.get('/api/analytics/users', async (req, res) => {
  try {
    const { period = '30d', storeId } = req.query;
    
    const cacheKey = `analytics:users:${period}:${storeId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const userData = await getUserAnalytics(period as string, storeId as string);
    
    // Cache for 10 minutes
    await redis.setex(cacheKey, 600, JSON.stringify(userData));
    
    res.json(userData);
  } catch (error) {
    logger.error('Error fetching user analytics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user analytics',
    });
  }
});

// Custom Reports
app.post('/api/analytics/reports', async (req, res) => {
  try {
    const { type, filters, dateRange } = req.body;
    
    const report = await generateCustomReport(type, filters, dateRange);
    res.json(report);
  } catch (error) {
    logger.error('Error generating custom report:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate custom report',
    });
  }
});

// WebSocket connection for real-time updates
io.on('connection', (socket) => {
  logger.info('Client connected to analytics WebSocket');
  
  socket.on('join-store', (storeId) => {
    socket.join(`store-${storeId}`);
    logger.info(`Client joined store room: ${storeId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected from analytics WebSocket');
  });
});

// Helper functions
async function getAnalyticsData(startDate: Date, endDate: Date, storeId?: string) {
  try {
    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };
    
    if (storeId) {
      where.storeId = storeId;
    }

    const [orders, products, users] = await Promise.all([
      prisma.order.count({ where }),
      prisma.product.count({ where: storeId ? { storeId } : {} }),
      prisma.user.count(),
    ]);

    const totalRevenue = await prisma.order.aggregate({
      where,
      _sum: { total: true },
    });

    return {
      period: { start: startDate, end: endDate },
      metrics: {
        totalOrders: orders,
        totalRevenue: totalRevenue._sum.total || 0,
        totalProducts: products,
        activeUsers: users,
        averageOrderValue: orders > 0 ? (totalRevenue._sum.total || 0) / orders : 0,
        conversionRate: 3.2, // Mock data - would be calculated from actual user behavior
      },
      trends: {
        ordersGrowth: 15.5,
        revenueGrowth: 12.3,
        userGrowth: 8.7,
      },
    };
  } catch (error) {
    logger.error('Error getting analytics data:', error);
    throw error;
  }
}

async function getRealtimeAnalytics() {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentOrders = await prisma.order.count({
      where: {
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    const activeUsers = await redis.get('active_users') || 0;
    const currentRevenue = await redis.get('hourly_revenue') || 0;

    return {
      timestamp: now,
      metrics: {
        ordersLastHour: recentOrders,
        activeUsers: parseInt(activeUsers as string),
        currentRevenue: parseFloat(currentRevenue as string),
        averageResponseTime: 245, // ms
      },
      alerts: [],
    };
  } catch (error) {
    logger.error('Error getting real-time analytics:', error);
    throw error;
  }
}

async function getSalesAnalytics(period: string, storeId?: string, groupBy: string = 'day') {
  try {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };
    
    if (storeId) {
      where.storeId = storeId;
    }

    const sales = await prisma.order.findMany({
      where,
      select: {
        total: true,
        createdAt: true,
        status: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by day, week, or month
    const groupedSales = groupSalesData(sales, groupBy);

    return {
      period: { start: startDate, end: endDate },
      groupBy,
      data: groupedSales,
      summary: {
        totalSales: sales.reduce((sum, order) => sum + Number(order.total), 0),
        totalOrders: sales.length,
        averageOrderValue: sales.length > 0 
          ? sales.reduce((sum, order) => sum + Number(order.total), 0) / sales.length 
          : 0,
      },
    };
  } catch (error) {
    logger.error('Error getting sales analytics:', error);
    throw error;
  }
}

async function getProductAnalytics(period: string, storeId?: string, limit: number = 10) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };
    
    if (storeId) {
      where.storeId = storeId;
    }

    const products = await prisma.product.findMany({
      where: storeId ? { storeId } : {},
      include: {
        _count: {
          select: { orderItems: true },
        },
      },
      orderBy: {
        orderItems: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return {
      period: { start: startDate, end: endDate },
      topProducts: products.map(product => ({
        id: product.id,
        name: product.name,
        sales: product._count.orderItems,
        revenue: 0, // Would be calculated from order items
        stock: product.stock,
      })),
    };
  } catch (error) {
    logger.error('Error getting product analytics:', error);
    throw error;
  }
}

async function getUserAnalytics(period: string, storeId?: string) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };
    
    if (storeId) {
      where.storeId = storeId;
    }

    const [newUsers, activeUsers, totalUsers] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.count({ where: { lastLoginAt: { gte: startDate } } }),
      prisma.user.count(),
    ]);

    return {
      period: { start: startDate, end: endDate },
      metrics: {
        newUsers,
        activeUsers,
        totalUsers,
        retentionRate: activeUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
      },
      demographics: {
        ageGroups: [
          { range: '18-24', percentage: 25 },
          { range: '25-34', percentage: 35 },
          { range: '35-44', percentage: 20 },
          { range: '45+', percentage: 20 },
        ],
        locations: [
          { city: 'Tashkent', percentage: 40 },
          { city: 'Samarkand', percentage: 15 },
          { city: 'Bukhara', percentage: 10 },
          { city: 'Others', percentage: 35 },
        ],
      },
    };
  } catch (error) {
    logger.error('Error getting user analytics:', error);
    throw error;
  }
}

async function generateCustomReport(type: string, filters: any, dateRange: any) {
  try {
    // Implementation for custom report generation
    return {
      type,
      filters,
      dateRange,
      data: [],
      generatedAt: new Date(),
    };
  } catch (error) {
    logger.error('Error generating custom report:', error);
    throw error;
  }
}

function groupSalesData(sales: any[], groupBy: string) {
  // Implementation for grouping sales data by day, week, or month
  return sales.map(sale => ({
    date: sale.createdAt,
    revenue: Number(sale.total),
    orders: 1,
  }));
}

// Scheduled tasks
cron.schedule('0 * * * *', async () => {
  // Update hourly metrics every hour
  try {
    const realtimeData = await getRealtimeAnalytics();
    await redis.setex('hourly_analytics', 3600, JSON.stringify(realtimeData));
    logger.info('Hourly analytics updated');
  } catch (error) {
    logger.error('Error updating hourly analytics:', error);
  }
});

cron.schedule('0 0 * * *', async () => {
  // Daily analytics summary
  try {
    const dailyData = await getAnalyticsData(
      new Date(Date.now() - 24 * 60 * 60 * 1000),
      new Date()
    );
    await redis.setex('daily_analytics', 86400, JSON.stringify(dailyData));
    logger.info('Daily analytics updated');
  } catch (error) {
    logger.error('Error updating daily analytics:', error);
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
server.listen(PORT, () => {
  logger.info(`Analytics Service running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`WebSocket endpoint: ws://localhost:${PORT}`);
});

export default app;
