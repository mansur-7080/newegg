import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface AnalyticsData {
  totalOrders: number;
  totalRevenue: number;
  activeUsers: number;
  conversionRate: number;
  topProducts: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  salesByCategory: Array<{
    category: string;
    sales: number;
    revenue: number;
  }>;
  userGrowth: Array<{
    date: string;
    newUsers: number;
    totalUsers: number;
  }>;
  orderTrends: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
}

export interface UserBehaviorData {
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  averageSessionDuration: number;
  topPages: Array<{
    page: string;
    views: number;
    uniqueViews: number;
  }>;
}

export interface RevenueData {
  daily: Array<{ date: string; revenue: number }>;
  monthly: Array<{ month: string; revenue: number }>;
  yearly: Array<{ year: string; revenue: number }>;
  byPaymentMethod: Array<{
    method: string;
    revenue: number;
    percentage: number;
  }>;
}

export class AnalyticsService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getDashboardData(dateRange?: { from: Date; to: Date }): Promise<AnalyticsData> {
    try {
      const fromDate = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = dateRange?.to || new Date();

      // Get total orders and revenue
      const orderStats = await this.prisma.order.aggregate({
        where: {
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
          status: {
            in: ['COMPLETED', 'DELIVERED'],
          },
        },
        _count: true,
        _sum: {
          total: true,
        },
      });

      // Get active users (users who made orders in the period)
      const activeUsers = await this.prisma.order.findMany({
        where: {
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
        select: {
          userId: true,
        },
        distinct: ['userId'],
      });

      // Get total users for conversion rate
      const totalUsers = await this.prisma.user.count();

      // Calculate conversion rate
      const conversionRate = totalUsers > 0 ? (activeUsers.length / totalUsers) * 100 : 0;

      // Get top products
      const topProducts = await this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            createdAt: {
              gte: fromDate,
              lte: toDate,
            },
            status: {
              in: ['COMPLETED', 'DELIVERED'],
            },
          },
        },
        _count: {
          productId: true,
        },
        _sum: {
          quantity: true,
          price: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: 10,
      });

      // Get product details for top products
      const topProductsWithDetails = await Promise.all(
        topProducts.map(async (item) => {
          const product = await this.prisma.product.findUnique({
            where: { id: item.productId },
            select: { id: true, name: true },
          });
          return {
            id: item.productId,
            name: product?.name || 'Unknown Product',
            sales: item._sum.quantity || 0,
            revenue: Number(item._sum.price || 0),
          };
        })
      );

      // Get sales by category
      const salesByCategory = await this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            createdAt: {
              gte: fromDate,
              lte: toDate,
            },
            status: {
              in: ['COMPLETED', 'DELIVERED'],
            },
          },
        },
        _sum: {
          quantity: true,
          price: true,
        },
      });

      // Group by category (you'll need to join with products table)
      const categoryStats = new Map<string, { sales: number; revenue: number }>();
      
      for (const item of salesByCategory) {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
          include: { category: true },
        });

        if (product?.category) {
          const existing = categoryStats.get(product.category.name) || { sales: 0, revenue: 0 };
          categoryStats.set(product.category.name, {
            sales: existing.sales + (item._sum.quantity || 0),
            revenue: existing.revenue + Number(item._sum.price || 0),
          });
        }
      }

      const salesByCategoryArray = Array.from(categoryStats.entries()).map(([category, data]) => ({
        category,
        sales: data.sales,
        revenue: data.revenue,
      }));

      // Get user growth data (last 30 days)
      const userGrowth = await this.getUserGrowthData(30);

      // Get order trends (last 30 days)
      const orderTrends = await this.getOrderTrends(30);

      return {
        totalOrders: orderStats._count || 0,
        totalRevenue: Number(orderStats._sum.total || 0),
        activeUsers: activeUsers.length,
        conversionRate: Math.round(conversionRate * 100) / 100,
        topProducts: topProductsWithDetails,
        salesByCategory: salesByCategoryArray,
        userGrowth,
        orderTrends,
      };
    } catch (error) {
      logger.error('Failed to get dashboard data', error);
      throw error;
    }
  }

  async getUserBehaviorData(dateRange?: { from: Date; to: Date }): Promise<UserBehaviorData> {
    try {
      const fromDate = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = dateRange?.to || new Date();

      // Get page views from user activity logs
      const pageViews = await this.prisma.userActivity.count({
        where: {
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
          type: 'PAGE_VIEW',
        },
      });

      // Get unique visitors
      const uniqueVisitors = await this.prisma.userActivity.findMany({
        where: {
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
          type: 'PAGE_VIEW',
        },
        select: {
          userId: true,
        },
        distinct: ['userId'],
      });

      // Get session data for bounce rate and duration
      const sessions = await this.prisma.userSession.findMany({
        where: {
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
        select: {
          duration: true,
          pageViews: true,
        },
      });

      const bounceRate = sessions.length > 0 
        ? (sessions.filter(s => s.pageViews === 1).length / sessions.length) * 100 
        : 0;

      const averageSessionDuration = sessions.length > 0
        ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length
        : 0;

      // Get top pages
      const topPages = await this.prisma.userActivity.groupBy({
        by: ['page'],
        where: {
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
          type: 'PAGE_VIEW',
        },
        _count: {
          page: true,
        },
        orderBy: {
          _count: {
            page: 'desc',
          },
        },
        take: 10,
      });

      const topPagesWithUniqueViews = await Promise.all(
        topPages.map(async (page) => {
          const uniqueViews = await this.prisma.userActivity.findMany({
            where: {
              page: page.page,
              createdAt: {
                gte: fromDate,
                lte: toDate,
              },
              type: 'PAGE_VIEW',
            },
            select: {
              userId: true,
            },
            distinct: ['userId'],
          });

          return {
            page: page.page,
            views: page._count.page,
            uniqueViews: uniqueViews.length,
          };
        })
      );

      return {
        pageViews,
        uniqueVisitors: uniqueVisitors.length,
        bounceRate: Math.round(bounceRate * 100) / 100,
        averageSessionDuration: Math.round(averageSessionDuration),
        topPages: topPagesWithUniqueViews,
      };
    } catch (error) {
      logger.error('Failed to get user behavior data', error);
      throw error;
    }
  }

  async getRevenueData(period: 'daily' | 'monthly' | 'yearly' = 'daily'): Promise<RevenueData> {
    try {
      const now = new Date();
      let fromDate: Date;
      let groupBy: string;

      switch (period) {
        case 'daily':
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          groupBy = 'DATE(createdAt)';
          break;
        case 'monthly':
          fromDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
          groupBy = 'DATE_FORMAT(createdAt, "%Y-%m")';
          break;
        case 'yearly':
          fromDate = new Date(now.getFullYear() - 5, 0, 1);
          groupBy = 'YEAR(createdAt)';
          break;
      }

      // Get revenue by payment method
      const paymentMethodRevenue = await this.prisma.order.groupBy({
        by: ['paymentMethod'],
        where: {
          createdAt: {
            gte: fromDate,
          },
          status: {
            in: ['COMPLETED', 'DELIVERED'],
          },
        },
        _sum: {
          total: true,
        },
      });

      const totalRevenue = paymentMethodRevenue.reduce(
        (sum, item) => sum + Number(item._sum.total || 0),
        0
      );

      const byPaymentMethod = paymentMethodRevenue.map((item) => ({
        method: item.paymentMethod,
        revenue: Number(item._sum.total || 0),
        percentage: totalRevenue > 0 
          ? Math.round((Number(item._sum.total || 0) / totalRevenue) * 10000) / 100 
          : 0,
      }));

      // For now, return mock time-series data
      // In a real implementation, you'd use raw SQL queries for proper date grouping
      const daily = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 1000000) + 500000,
      })).reverse();

      const monthly = Array.from({ length: 12 }, (_, i) => ({
        month: new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString().slice(0, 7),
        revenue: Math.floor(Math.random() * 10000000) + 5000000,
      })).reverse();

      const yearly = Array.from({ length: 5 }, (_, i) => ({
        year: (now.getFullYear() - i).toString(),
        revenue: Math.floor(Math.random() * 100000000) + 50000000,
      })).reverse();

      return {
        daily,
        monthly,
        yearly,
        byPaymentMethod,
      };
    } catch (error) {
      logger.error('Failed to get revenue data', error);
      throw error;
    }
  }

  private async getUserGrowthData(days: number) {
    const result = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      const newUsers = await this.prisma.user.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
      });

      const totalUsers = await this.prisma.user.count({
        where: {
          createdAt: {
            lte: nextDate,
          },
        },
      });

      result.push({
        date: date.toISOString().split('T')[0],
        newUsers,
        totalUsers,
      });
    }

    return result;
  }

  private async getOrderTrends(days: number) {
    const result = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      const orderStats = await this.prisma.order.aggregate({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
          status: {
            in: ['COMPLETED', 'DELIVERED'],
          },
        },
        _count: true,
        _sum: {
          total: true,
        },
      });

      result.push({
        date: date.toISOString().split('T')[0],
        orders: orderStats._count || 0,
        revenue: Number(orderStats._sum.total || 0),
      });
    }

    return result;
  }

  async trackUserActivity(userId: string, type: string, page: string, metadata?: any) {
    try {
      await this.prisma.userActivity.create({
        data: {
          userId,
          type,
          page,
          metadata,
        },
      });
    } catch (error) {
      logger.error('Failed to track user activity', error);
    }
  }

  async trackEvent(eventName: string, userId?: string, properties?: any) {
    try {
      await this.prisma.event.create({
        data: {
          name: eventName,
          userId,
          properties,
        },
      });
    } catch (error) {
      logger.error('Failed to track event', error);
    }
  }
}