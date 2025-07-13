import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../config/database';
import { logger } from '../utils/logger';

export interface PriceAlert {
  id: string;
  productId: string;
  targetPrice: number;
  email?: string;
  userId?: string;
  isActive: boolean;
}

export class PriceService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  async getPriceHistory(productId: string, days: number, interval: string = 'daily') {
    try {
      const priceHistory = await this.prisma.priceHistory.findMany({
        where: {
          productId,
          date: {
            gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { date: 'asc' }
      });

      return {
        productId,
        history: priceHistory,
        currentPrice: priceHistory[priceHistory.length - 1]?.price || 0,
        lowestPrice: Math.min(...priceHistory.map(p => p.price)),
        highestPrice: Math.max(...priceHistory.map(p => p.price)),
      };
    } catch (error) {
      logger.error('Failed to get price history', error);
      throw new Error('Failed to retrieve price history');
    }
  }

  async createPriceAlert(data: {
    productId: string;
    targetPrice: number;
    email?: string;
    userId?: string;
  }): Promise<PriceAlert> {
    try {
      const alert = await this.prisma.priceAlert.create({
        data: {
          productId: data.productId,
          targetPrice: data.targetPrice,
          email: data.email,
          userId: data.userId,
          isActive: true,
        }
      });

      return alert as PriceAlert;
    } catch (error) {
      logger.error('Failed to create price alert', error);
      throw new Error('Failed to create price alert');
    }
  }

  async getUserPriceAlerts(userId: string, activeOnly: boolean = true) {
    try {
      const alerts = await this.prisma.priceAlert.findMany({
        where: {
          userId,
          ...(activeOnly && { isActive: true })
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
            }
          }
        }
      });

      return alerts;
    } catch (error) {
      logger.error('Failed to get user price alerts', error);
      throw new Error('Failed to retrieve user price alerts');
    }
  }
}