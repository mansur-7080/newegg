/**
 * UltraMarket Analytics Service
 * Professional business intelligence and data analytics
 */

import { prisma } from '../index';
import { redis } from '../index';
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
  topCategories: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  salesByDate: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
  userGrowth: Array<{
    date: string;
    newUsers: number;
    activeUsers: number;
  }>;
}

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  vendorId?: string;
  productId?: string;
}

export class AnalyticsService {
  private cacheKey = 'analytics:dashboard';

  async getDashboardAnalytics(filters: AnalyticsFilters = {}): Promise<AnalyticsData> {
    try {
      // Check cache first
      const cached = await redis.get(this.cacheKey);
      if (cached) {
        logger.debug('Analytics data retrieved from cache');
        return JSON.parse(cached);
      }

      logger.info('Generating dashboard analytics', filters);

      // Get total orders
      const totalOrders = await this.getTotalOrders(filters);

      // Get total revenue
      const totalRevenue = await this.getTotalRevenue(filters);

      // Get active users
      const activeUsers = await this.getActiveUsers(filters);

      // Get conversion rate
      const conversionRate = await this.getConversionRate(filters);

      // Get top products
      const topProducts = await this.getTopProducts(filters);

      // Get top categories
      const topCategories = await this.getTopCategories(filters);

      // Get sales by date
      const salesByDate = await this.getSalesByDate(filters);

      // Get user growth
      const userGrowth = await this.getUserGrowth(filters);

      const analyticsData: AnalyticsData = {
        totalOrders,
        totalRevenue,
        activeUsers,
        conversionRate,
        topProducts,
        topCategories,
        salesByDate,
        userGrowth,
      };

      // Cache for 5 minutes
      await redis.setex(this.cacheKey, 300, JSON.stringify(analyticsData));

      logger.info('Dashboard analytics generated successfully');
      return analyticsData;
    } catch (error) {
      logger.error('Error generating dashboard analytics:', error);
      throw new Error('Failed to generate analytics data');
    }
  }

  private async getTotalOrders(filters: AnalyticsFilters): Promise<number> {
    try {
      const whereClause: any = {};
      
      if (filters.startDate && filters.endDate) {
        whereClause.createdAt = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        };
      }

      const count = await prisma.order.count({
        where: whereClause,
      });

      return count;
    } catch (error) {
      logger.error('Error getting total orders:', error);
      return 0;
    }
  }

  private async getTotalRevenue(filters: AnalyticsFilters): Promise<number> {
    try {
      const whereClause: any = {
        status: 'completed',
      };
      
      if (filters.startDate && filters.endDate) {
        whereClause.createdAt = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        };
      }

      const result = await prisma.order.aggregate({
        where: whereClause,
        _sum: {
          totalAmount: true,
        },
      });

      return result._sum.totalAmount || 0;
    } catch (error) {
      logger.error('Error getting total revenue:', error);
      return 0;
    }
  }

  private async getActiveUsers(filters: AnalyticsFilters): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const count = await prisma.user.count({
        where: {
          lastLoginAt: {
            gte: thirtyDaysAgo,
          },
        },
      });

      return count;
    } catch (error) {
      logger.error('Error getting active users:', error);
      return 0;
    }
  }

  private async getConversionRate(filters: AnalyticsFilters): Promise<number> {
    try {
      const totalVisitors = await this.getTotalVisitors(filters);
      const totalOrders = await this.getTotalOrders(filters);

      if (totalVisitors === 0) return 0;

      return (totalOrders / totalVisitors) * 100;
    } catch (error) {
      logger.error('Error getting conversion rate:', error);
      return 0;
    }
  }

  private async getTotalVisitors(filters: AnalyticsFilters): Promise<number> {
    try {
      // This would typically come from analytics tracking
      // For now, we'll use a placeholder
      return 10000;
    } catch (error) {
      logger.error('Error getting total visitors:', error);
      return 0;
    }
  }

  private async getTopProducts(filters: AnalyticsFilters): Promise<Array<{id: string, name: string, sales: number, revenue: number}>> {
    try {
      const whereClause: any = {};
      
      if (filters.startDate && filters.endDate) {
        whereClause.createdAt = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        };
      }

      const topProducts = await prisma.orderItem.groupBy({
        by: ['productId'],
        where: whereClause,
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

      return topProducts.map(item => ({
        id: item.productId,
        name: `Product ${item.productId}`, // Would need to join with products table
        sales: item._sum.quantity || 0,
        revenue: (item._sum.price || 0) * (item._sum.quantity || 0),
      }));
    } catch (error) {
      logger.error('Error getting top products:', error);
      return [];
    }
  }

  private async getTopCategories(filters: AnalyticsFilters): Promise<Array<{id: string, name: string, sales: number, revenue: number}>> {
    try {
      // This would require joining with products and categories tables
      // For now, return placeholder data
      return [
        { id: '1', name: 'Electronics', sales: 150, revenue: 1500000 },
        { id: '2', name: 'Clothing', sales: 120, revenue: 1200000 },
        { id: '3', name: 'Home & Garden', sales: 100, revenue: 1000000 },
      ];
    } catch (error) {
      logger.error('Error getting top categories:', error);
      return [];
    }
  }

  private async getSalesByDate(filters: AnalyticsFilters): Promise<Array<{date: string, orders: number, revenue: number}>> {
    try {
      const whereClause: any = {};
      
      if (filters.startDate && filters.endDate) {
        whereClause.createdAt = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        };
      }

      const salesByDate = await prisma.order.groupBy({
        by: ['createdAt'],
        where: whereClause,
        _count: {
          id: true,
        },
        _sum: {
          totalAmount: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      return salesByDate.map(item => ({
        date: item.createdAt.toISOString().split('T')[0],
        orders: item._count.id,
        revenue: item._sum.totalAmount || 0,
      }));
    } catch (error) {
      logger.error('Error getting sales by date:', error);
      return [];
    }
  }

  private async getUserGrowth(filters: AnalyticsFilters): Promise<Array<{date: string, newUsers: number, activeUsers: number}>> {
    try {
      // This would require more complex analytics tracking
      // For now, return placeholder data
      const days = 30;
      const result = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        result.push({
          date: date.toISOString().split('T')[0],
          newUsers: Math.floor(Math.random() * 50) + 10,
          activeUsers: Math.floor(Math.random() * 200) + 100,
        });
      }

      return result;
    } catch (error) {
      logger.error('Error getting user growth:', error);
      return [];
    }
  }

  async getReports(): Promise<Array<{id: number, name: string, type: string}>> {
    try {
      return [
        { id: 1, name: 'Sales Report', type: 'sales' },
        { id: 2, name: 'User Activity Report', type: 'users' },
        { id: 3, name: 'Product Performance Report', type: 'products' },
        { id: 4, name: 'Revenue Report', type: 'revenue' },
        { id: 5, name: 'Inventory Report', type: 'inventory' },
      ];
    } catch (error) {
      logger.error('Error getting reports:', error);
      return [];
    }
  }

  async clearCache(): Promise<void> {
    try {
      await redis.del(this.cacheKey);
      logger.info('Analytics cache cleared');
    } catch (error) {
      logger.error('Error clearing analytics cache:', error);
    }
  }
}

export const analyticsService = new AnalyticsService();