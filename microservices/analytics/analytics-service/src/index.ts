/**
 * UltraMarket Analytics Service
 * Professional analytics and business intelligence service
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { config } from 'dotenv';
import jwt from 'jsonwebtoken';
import './types/express';
import { PerformanceMetric } from './types/express';

// Load environment variables
config();

const app = express();
const PORT = process.env.ANALYTICS_SERVICE_PORT || 3020;
const prisma = new PrismaClient();
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Redis connection
redis.connect().catch(console.error);

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // requests per window
  message: 'Juda ko\'p so\'rov yuborildi, keyinroq urinib ko\'ring.',
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Auth middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token talab qilinadi' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Yaroqsiz token' });
  }
};

// Helper functions
const getCacheKey = (prefix: string, params: any) => {
  return `analytics:${prefix}:${JSON.stringify(params)}`;
};

const cacheResponse = async (key: string, data: any, ttl: number = 300) => {
  try {
    await redis.setEx(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.error('Redis cache error:', error);
  }
};

const getCachedResponse = async (key: string) => {
  try {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'analytics-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// 1. Dashboard Analytics
app.get('/api/analytics/dashboard', authenticateToken, async (req, res) => {
  try {
    const { period = '30d', storeId } = req.query;
    const cacheKey = getCacheKey('dashboard', { period, storeId, userId: req.user.userId });
    
    // Check cache first
    const cached = await getCachedResponse(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Calculate date range
    const days = parseInt(period.toString().replace('d', '')) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build where clause
    const whereClause: any = {
      createdAt: { gte: startDate }
    };

    if (storeId && req.user.role !== 'ADMIN') {
      whereClause.storeId = storeId;
    }

    // Get analytics data
    const [
      totalOrders,
      totalRevenue,
      averageOrderValue,
      activeUsers,
      totalProducts,
      conversionStats
    ] = await Promise.all([
      prisma.order.count({ where: whereClause }),
      prisma.order.aggregate({
        where: whereClause,
        _sum: { totalAmount: true }
      }),
      prisma.order.aggregate({
        where: whereClause,
        _avg: { totalAmount: true }
      }),
      prisma.order.groupBy({
        by: ['userId'],
        where: whereClause
      }).then(result => result.length),
      prisma.product.count({
        where: storeId ? { storeId } : {}
      }),
      prisma.order.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true
      })
    ]);

    const analytics = {
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      averageOrderValue: averageOrderValue._avg.totalAmount || 0,
      activeUsers,
      totalProducts,
      conversionRate: totalOrders > 0 ? ((totalOrders / (activeUsers || 1)) * 100).toFixed(2) : 0,
      orderStatusBreakdown: conversionStats,
      period: `${days} kun`,
      lastUpdated: new Date().toISOString()
    };

    // Cache for 5 minutes
    await cacheResponse(cacheKey, analytics, 300);

    res.json(analytics);

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ error: 'Analitika olishda xatolik' });
  }
});

// 2. Sales Analytics
app.get('/api/analytics/sales', authenticateToken, async (req, res) => {
  try {
    const { period = '30d', storeId, groupBy = 'day' } = req.query;
    const cacheKey = getCacheKey('sales', { period, storeId, groupBy });

    const cached = await getCachedResponse(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const days = parseInt(period.toString().replace('d', '')) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // SQL query for time-series data
    const timeFormat = groupBy === 'hour' ? 'YYYY-MM-DD HH24:00:00' : 'YYYY-MM-DD';
    
    const salesData = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(created_at, ${timeFormat}) as period,
        COUNT(*)::int as order_count,
        SUM(total_amount)::float as revenue,
        AVG(total_amount)::float as avg_order_value
      FROM orders 
      WHERE created_at >= ${startDate}
      ${storeId ? prisma.$queryRaw`AND store_id = ${storeId}` : prisma.$queryRaw``}
      GROUP BY TO_CHAR(created_at, ${timeFormat})
      ORDER BY period ASC
    `;

    const result = {
      salesData,
      summary: {
        totalRevenue: salesData.reduce((sum: number, item: any) => sum + item.revenue, 0),
        totalOrders: salesData.reduce((sum: number, item: any) => sum + item.order_count, 0),
        averageDaily: salesData.length > 0 ? 
          salesData.reduce((sum: number, item: any) => sum + item.revenue, 0) / salesData.length : 0
      },
      period: `${days} kun`,
      groupBy
    };

    await cacheResponse(cacheKey, result, 600); // 10 minutes cache
    res.json(result);

  } catch (error) {
    console.error('Sales analytics error:', error);
    res.status(500).json({ error: 'Sotuv analitikasi olishda xatolik' });
  }
});

// 3. Product Analytics
app.get('/api/analytics/products', authenticateToken, async (req, res) => {
  try {
    const { storeId, limit = 20, sortBy = 'revenue' } = req.query;
    const cacheKey = getCacheKey('products', { storeId, limit, sortBy });

    const cached = await getCachedResponse(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const productAnalytics = await prisma.$queryRaw`
      SELECT 
        p.id,
        p.name,
        p.price::float,
        p.quantity,
        COUNT(oi.id)::int as total_sold,
        SUM(oi.total)::float as revenue,
        AVG(pr.rating)::float as avg_rating,
        COUNT(pr.id)::int as review_count
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN product_reviews pr ON p.id = pr.product_id
      ${storeId ? prisma.$queryRaw`WHERE p.store_id = ${storeId}` : prisma.$queryRaw``}
      GROUP BY p.id, p.name, p.price, p.quantity
      ORDER BY ${sortBy === 'revenue' ? 'revenue' : 'total_sold'} DESC NULLS LAST
      LIMIT ${parseInt(limit.toString())}
    `;

    const result = {
      products: productAnalytics,
      totalProducts: productAnalytics.length,
      sortBy,
      lastUpdated: new Date().toISOString()
    };

    await cacheResponse(cacheKey, result, 900); // 15 minutes cache
    res.json(result);

  } catch (error) {
    console.error('Product analytics error:', error);
    res.status(500).json({ error: 'Mahsulot analitikasi olishda xatolik' });
  }
});

// 4. Customer Analytics
app.get('/api/analytics/customers', authenticateToken, async (req, res) => {
  try {
    const { period = '30d', storeId } = req.query;
    const cacheKey = getCacheKey('customers', { period, storeId });

    const cached = await getCachedResponse(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const days = parseInt(period.toString().replace('d', '')) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const customerData = await prisma.$queryRaw`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        COUNT(o.id)::int as total_orders,
        SUM(o.total_amount)::float as total_spent,
        AVG(o.total_amount)::float as avg_order_value,
        MAX(o.created_at) as last_order_date
      FROM users u
      INNER JOIN orders o ON u.id = o.user_id
      WHERE o.created_at >= ${startDate}
      ${storeId ? prisma.$queryRaw`AND o.store_id = ${storeId}` : prisma.$queryRaw``}
      GROUP BY u.id, u.first_name, u.last_name, u.email
      ORDER BY total_spent DESC
      LIMIT 50
    `;

    const topCustomers = {
      customers: customerData,
      period: `${days} kun`,
      lastUpdated: new Date().toISOString()
    };

    await cacheResponse(cacheKey, topCustomers, 1800); // 30 minutes cache
    res.json(topCustomers);

  } catch (error) {
    console.error('Customer analytics error:', error);
    res.status(500).json({ error: 'Mijoz analitikasi olishda xatolik' });
  }
});

// 5. Performance Metrics
app.get('/api/analytics/performance', authenticateToken, async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    const cacheKey = getCacheKey('performance', { period });

    const cached = await getCachedResponse(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const hours = parseInt(period.toString().replace('h', '')) || 24;
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    // Get performance metrics from Redis if available
    const performanceKeys = await redis.keys('performance:*');
    const performanceData: PerformanceMetric[] = [];

    for (const key of performanceKeys.slice(0, 100)) { // Limit to 100 metrics
      const data = await redis.get(key);
      if (data) {
        try {
          performanceData.push(JSON.parse(data) as PerformanceMetric);
        } catch (error) {
          console.error('Error parsing performance data:', error);
        }
      }
    }

    const responseTimes = performanceData.map(m => m.responseTime || 0).filter(rt => rt > 0);
    
    const metrics = {
      responseTime: {
        avg: responseTimes.length > 0 ? 
          responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length : 0,
        min: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
        max: responseTimes.length > 0 ? Math.max(...responseTimes) : 0
      },
      requestCount: performanceData.length,
      errorRate: performanceData.filter(m => m.statusCode >= 400).length / (performanceData.length || 1) * 100,
      period: `${hours} soat`,
      lastUpdated: new Date().toISOString()
    };

    await cacheResponse(cacheKey, metrics, 300); // 5 minutes cache
    res.json(metrics);

  } catch (error) {
    console.error('Performance analytics error:', error);
    res.status(500).json({ error: 'Performance analitikasi olishda xatolik' });
  }
});

// 6. Export Data
app.get('/api/analytics/export', authenticateToken, async (req, res) => {
  try {
    const { type, format = 'json', startDate, endDate, storeId } = req.query;

    if (!type || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Type, startDate va endDate parametrlari majburiy' 
      });
    }

    const start = new Date(startDate.toString());
    const end = new Date(endDate.toString());

    let data: any = {};

    switch (type) {
      case 'sales':
        data = await prisma.order.findMany({
          where: {
            createdAt: { gte: start, lte: end },
            ...(storeId && { storeId: storeId.toString() })
          },
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        });
        break;

      case 'products':
        data = await prisma.product.findMany({
          where: {
            createdAt: { gte: start, lte: end },
            ...(storeId && { storeId: storeId.toString() })
          },
          include: {
            images: true,
            reviews: true
          }
        });
        break;

      default:
        return res.status(400).json({ error: 'Noto\'g\'ri export turi' });
    }

    if (format === 'csv') {
      // CSV format implementation would go here
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-export.csv"`);
      res.send('CSV export hali ishlab chiqilmagan');
    } else {
      res.json({
        type,
        period: { start, end },
        count: Array.isArray(data) ? data.length : 1,
        data
      });
    }

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Ma\'lumot eksport qilishda xatolik' });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Ichki server xatoligi',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Sahifa topilmadi',
    message: 'So\'ralgan resurs mavjud emas'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  await redis.disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`📊 Analytics Service ishga tushdi: http://localhost:${PORT}`);
  console.log(`📈 Health check: http://localhost:${PORT}/health`);
});

export default app;
