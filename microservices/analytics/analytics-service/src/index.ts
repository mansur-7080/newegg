/**
 * UltraMarket Professional Analytics Service
 * Real-time analytics and business intelligence for Uzbekistan market
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { config } from 'dotenv';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3020;
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Types
interface AnalyticsEvent {
  eventType: string;
  userId?: string;
  sessionId: string;
  productId?: string;
  orderId?: string;
  value?: number;
  currency?: string;
  region?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalOrders: number;
  totalRevenue: number;
  conversionRate: number;
  averageOrderValue: number;
  topProducts: any[];
  topRegions: any[];
  salesTrend: any[];
  userGrowth: any[];
}

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Higher limit for analytics
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'analytics-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    redis: redis.status,
  });
});

// Track analytics event
app.post('/api/analytics/track', async (req, res) => {
  try {
    const {
      eventType,
      userId,
      sessionId,
      productId,
      orderId,
      value,
      currency = 'UZS',
      region,
      metadata = {},
    } = req.body;

    // Validate required fields
    if (!eventType || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'eventType and sessionId are required',
      });
    }

    // Create analytics event
    const analyticsEvent = await prisma.analyticsEvent.create({
      data: {
        eventType,
        userId,
        sessionId,
        productId,
        orderId,
        value: value ? Number(value) : null,
        currency,
        region,
        metadata: JSON.stringify(metadata),
        timestamp: new Date(),
      },
    });

    // Cache real-time metrics
    await updateRealTimeMetrics(analyticsEvent);

    res.status(201).json({
      success: true,
      message: 'Analytics event tracked successfully',
      data: {
        eventId: analyticsEvent.id,
        eventType,
        timestamp: analyticsEvent.timestamp,
      },
    });
  } catch (error) {
    console.error('Error tracking analytics event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track analytics event',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get dashboard metrics
app.get('/api/analytics/dashboard', async (req, res) => {
  try {
    const { period = '7d', region } = req.query;
    
    // Check cache first
    const cacheKey = `dashboard:${period}:${region || 'all'}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        message: 'Dashboard metrics retrieved from cache',
        data: JSON.parse(cached),
      });
    }

    // Calculate date range
    const dateRange = getDateRange(period as string);
    
    // Get comprehensive metrics
    const metrics = await getDashboardMetrics(dateRange, region as string);
    
    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(metrics));

    res.json({
      success: true,
      message: 'Dashboard metrics retrieved successfully',
      data: metrics,
    });
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard metrics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get user analytics
app.get('/api/analytics/users', async (req, res) => {
  try {
    const { period = '7d', region } = req.query;
    const dateRange = getDateRange(period as string);

    const userMetrics = await getUserAnalytics(dateRange, region as string);

    res.json({
      success: true,
      message: 'User analytics retrieved successfully',
      data: userMetrics,
    });
  } catch (error) {
    console.error('Error getting user analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user analytics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get product analytics
app.get('/api/analytics/products', async (req, res) => {
  try {
    const { period = '7d', limit = 10 } = req.query;
    const dateRange = getDateRange(period as string);

    const productMetrics = await getProductAnalytics(dateRange, Number(limit));

    res.json({
      success: true,
      message: 'Product analytics retrieved successfully',
      data: productMetrics,
    });
  } catch (error) {
    console.error('Error getting product analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get product analytics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get sales analytics
app.get('/api/analytics/sales', async (req, res) => {
  try {
    const { period = '7d', region, currency = 'UZS' } = req.query;
    const dateRange = getDateRange(period as string);

    const salesMetrics = await getSalesAnalytics(dateRange, region as string, currency as string);

    res.json({
      success: true,
      message: 'Sales analytics retrieved successfully',
      data: salesMetrics,
    });
  } catch (error) {
    console.error('Error getting sales analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sales analytics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get regional analytics (Uzbekistan specific)
app.get('/api/analytics/regions', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const dateRange = getDateRange(period as string);

    const regionalMetrics = await getRegionalAnalytics(dateRange);

    res.json({
      success: true,
      message: 'Regional analytics retrieved successfully',
      data: regionalMetrics,
    });
  } catch (error) {
    console.error('Error getting regional analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get regional analytics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get real-time metrics
app.get('/api/analytics/realtime', async (req, res) => {
  try {
    const realTimeData = await getRealTimeMetrics();

    res.json({
      success: true,
      message: 'Real-time metrics retrieved successfully',
      data: realTimeData,
    });
  } catch (error) {
    console.error('Error getting real-time metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get real-time metrics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Helper functions
function getDateRange(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case '1d':
      start.setDate(start.getDate() - 1);
      break;
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    case '1y':
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setDate(start.getDate() - 7);
  }

  return { start, end };
}

async function getDashboardMetrics(dateRange: { start: Date; end: Date }, region?: string): Promise<DashboardMetrics> {
  const whereClause = {
    timestamp: {
      gte: dateRange.start,
      lte: dateRange.end,
    },
    ...(region && { region }),
  };

  // Get total users
  const totalUsers = await prisma.analyticsEvent.count({
    where: {
      ...whereClause,
      eventType: 'user_registered',
    },
  });

  // Get active users
  const activeUsers = await prisma.analyticsEvent.groupBy({
    by: ['userId'],
    where: {
      ...whereClause,
      userId: { not: null },
    },
  });

  // Get total orders
  const totalOrders = await prisma.analyticsEvent.count({
    where: {
      ...whereClause,
      eventType: 'order_completed',
    },
  });

  // Get total revenue
  const revenueData = await prisma.analyticsEvent.aggregate({
    _sum: {
      value: true,
    },
    where: {
      ...whereClause,
      eventType: 'order_completed',
      value: { not: null },
    },
  });

  const totalRevenue = revenueData._sum.value || 0;

  // Calculate conversion rate
  const pageViews = await prisma.analyticsEvent.count({
    where: {
      ...whereClause,
      eventType: 'page_view',
    },
  });

  const conversionRate = pageViews > 0 ? (totalOrders / pageViews) * 100 : 0;

  // Calculate average order value
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Get top products
  const topProducts = await prisma.analyticsEvent.groupBy({
    by: ['productId'],
    where: {
      ...whereClause,
      eventType: 'product_purchased',
      productId: { not: null },
    },
    _count: {
      productId: true,
    },
    orderBy: {
      _count: {
        productId: 'desc',
      },
    },
    take: 10,
  });

  // Get top regions
  const topRegions = await prisma.analyticsEvent.groupBy({
    by: ['region'],
    where: {
      ...whereClause,
      region: { not: null },
    },
    _count: {
      region: true,
    },
    _sum: {
      value: true,
    },
    orderBy: {
      _sum: {
        value: 'desc',
      },
    },
    take: 10,
  });

  // Get sales trend (daily)
  const salesTrend = await getSalesTrend(dateRange, region);

  // Get user growth
  const userGrowth = await getUserGrowth(dateRange, region);

  return {
    totalUsers,
    activeUsers: activeUsers.length,
    totalOrders,
    totalRevenue,
    conversionRate,
    averageOrderValue,
    topProducts,
    topRegions,
    salesTrend,
    userGrowth,
  };
}

async function getUserAnalytics(dateRange: { start: Date; end: Date }, region?: string) {
  const whereClause = {
    timestamp: {
      gte: dateRange.start,
      lte: dateRange.end,
    },
    ...(region && { region }),
  };

  // New users
  const newUsers = await prisma.analyticsEvent.count({
    where: {
      ...whereClause,
      eventType: 'user_registered',
    },
  });

  // Returning users
  const returningUsers = await prisma.analyticsEvent.groupBy({
    by: ['userId'],
    where: {
      ...whereClause,
      userId: { not: null },
      eventType: 'user_login',
    },
    having: {
      userId: {
        _count: {
          gt: 1,
        },
      },
    },
  });

  // User engagement
  const userEngagement = await prisma.analyticsEvent.groupBy({
    by: ['userId'],
    where: {
      ...whereClause,
      userId: { not: null },
    },
    _count: {
      userId: true,
    },
    _avg: {
      value: true,
    },
  });

  return {
    newUsers,
    returningUsers: returningUsers.length,
    totalActiveUsers: userEngagement.length,
    averageSessionsPerUser: userEngagement.length > 0 
      ? userEngagement.reduce((sum, user) => sum + user._count.userId, 0) / userEngagement.length 
      : 0,
  };
}

async function getProductAnalytics(dateRange: { start: Date; end: Date }, limit: number) {
  // Most viewed products
  const mostViewed = await prisma.analyticsEvent.groupBy({
    by: ['productId'],
    where: {
      timestamp: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
      eventType: 'product_view',
      productId: { not: null },
    },
    _count: {
      productId: true,
    },
    orderBy: {
      _count: {
        productId: 'desc',
      },
    },
    take: limit,
  });

  // Most purchased products
  const mostPurchased = await prisma.analyticsEvent.groupBy({
    by: ['productId'],
    where: {
      timestamp: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
      eventType: 'product_purchased',
      productId: { not: null },
    },
    _count: {
      productId: true,
    },
    _sum: {
      value: true,
    },
    orderBy: {
      _sum: {
        value: 'desc',
      },
    },
    take: limit,
  });

  // Products added to cart
  const addedToCart = await prisma.analyticsEvent.groupBy({
    by: ['productId'],
    where: {
      timestamp: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
      eventType: 'add_to_cart',
      productId: { not: null },
    },
    _count: {
      productId: true,
    },
    orderBy: {
      _count: {
        productId: 'desc',
      },
    },
    take: limit,
  });

  return {
    mostViewed,
    mostPurchased,
    addedToCart,
  };
}

async function getSalesAnalytics(dateRange: { start: Date; end: Date }, region?: string, currency: string = 'UZS') {
  const whereClause = {
    timestamp: {
      gte: dateRange.start,
      lte: dateRange.end,
    },
    eventType: 'order_completed',
    currency,
    ...(region && { region }),
  };

  // Total sales
  const totalSales = await prisma.analyticsEvent.aggregate({
    _sum: {
      value: true,
    },
    _count: {
      id: true,
    },
    where: whereClause,
  });

  // Sales by day
  const salesByDay = await prisma.analyticsEvent.groupBy({
    by: ['timestamp'],
    where: whereClause,
    _sum: {
      value: true,
    },
    _count: {
      id: true,
    },
    orderBy: {
      timestamp: 'asc',
    },
  });

  // Sales by region
  const salesByRegion = await prisma.analyticsEvent.groupBy({
    by: ['region'],
    where: {
      ...whereClause,
      region: { not: null },
    },
    _sum: {
      value: true,
    },
    _count: {
      id: true,
    },
    orderBy: {
      _sum: {
        value: 'desc',
      },
    },
  });

  return {
    totalRevenue: totalSales._sum.value || 0,
    totalOrders: totalSales._count || 0,
    averageOrderValue: totalSales._count > 0 ? (totalSales._sum.value || 0) / totalSales._count : 0,
    salesByDay,
    salesByRegion,
  };
}

async function getRegionalAnalytics(dateRange: { start: Date; end: Date }) {
  const uzbekistanRegions = [
    'Toshkent',
    'Samarqand',
    'Buxoro',
    'Andijon',
    'Farg\'ona',
    'Namangan',
    'Qashqadaryo',
    'Surxondaryo',
    'Sirdaryo',
    'Jizzax',
    'Navoiy',
    'Xorazm',
    'Qoraqalpog\'iston',
  ];

  const regionalData = await Promise.all(
    uzbekistanRegions.map(async (region) => {
      const metrics = await prisma.analyticsEvent.aggregate({
        _sum: {
          value: true,
        },
        _count: {
          id: true,
        },
        where: {
          timestamp: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
          region,
        },
      });

      const users = await prisma.analyticsEvent.groupBy({
        by: ['userId'],
        where: {
          timestamp: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
          region,
          userId: { not: null },
        },
      });

      return {
        region,
        totalRevenue: metrics._sum.value || 0,
        totalEvents: metrics._count || 0,
        uniqueUsers: users.length,
      };
    })
  );

  return regionalData.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

async function getSalesTrend(dateRange: { start: Date; end: Date }, region?: string) {
  // Generate daily sales data
  const days: Array<{ date: string; revenue: number; orders: number }> = [];
  const current = new Date(dateRange.start);
  
  while (current <= dateRange.end) {
    const dayStart = new Date(current);
    const dayEnd = new Date(current);
    dayEnd.setHours(23, 59, 59, 999);

    const dailySales = await prisma.analyticsEvent.aggregate({
      _sum: {
        value: true,
      },
      _count: {
        id: true,
      },
      where: {
        timestamp: {
          gte: dayStart,
          lte: dayEnd,
        },
        eventType: 'order_completed',
        ...(region && { region }),
      },
    });

    days.push({
      date: current.toISOString().split('T')[0],
      revenue: dailySales._sum.value || 0,
      orders: dailySales._count || 0,
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
}

async function getUserGrowth(dateRange: { start: Date; end: Date }, region?: string) {
  const days: Array<{ date: string; newUsers: number }> = [];
  const current = new Date(dateRange.start);
  
  while (current <= dateRange.end) {
    const dayStart = new Date(current);
    const dayEnd = new Date(current);
    dayEnd.setHours(23, 59, 59, 999);

    const newUsers = await prisma.analyticsEvent.count({
      where: {
        timestamp: {
          gte: dayStart,
          lte: dayEnd,
        },
        eventType: 'user_registered',
        ...(region && { region }),
      },
    });

    days.push({
      date: current.toISOString().split('T')[0],
      newUsers,
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
}

async function updateRealTimeMetrics(event: any) {
  const now = new Date();
  const hour = now.getHours();
  const minute = Math.floor(now.getMinutes() / 5) * 5; // 5-minute intervals

  const key = `realtime:${now.toISOString().split('T')[0]}:${hour}:${minute}`;

  // Update real-time counters
  await redis.hincrby(key, 'events', 1);
  await redis.hincrby(key, event.eventType, 1);
  
  if (event.value) {
    await redis.hincrbyfloat(key, 'revenue', event.value);
  }
  
  if (event.userId) {
    await redis.sadd(`${key}:users`, event.userId);
  }

  // Set expiration for 24 hours
  await redis.expire(key, 24 * 60 * 60);
}

async function getRealTimeMetrics() {
  const now = new Date();
  const keys: string[] = [];

  // Get last 24 hours of data
  for (let i = 0; i < 24; i++) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = time.getHours();
    
    for (let j = 0; j < 60; j += 5) {
      const key = `realtime:${time.toISOString().split('T')[0]}:${hour}:${j}`;
      keys.push(key);
    }
  }

  const metrics = await Promise.all(
    keys.map(async (key: string) => {
      const data = await redis.hgetall(key);
      const userCount = await redis.scard(`${key}:users`);
      
      return {
        timestamp: key.split(':').slice(1).join(':'),
        events: parseInt(data.events || '0'),
        revenue: parseFloat(data.revenue || '0'),
        users: userCount,
        ...data,
      };
    })
  );

  return metrics.filter(m => m.events > 0);
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Error handler
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`✅ Professional Analytics Service running on port ${PORT}`);
  console.log(`📊 Real-time analytics and business intelligence ready`);
});

export default app;
