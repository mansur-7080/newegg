import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError, NotFoundError } from '../utils/errors';
import { InventoryService } from './inventory.service';

export interface DashboardStats {
  products: {
    total: number;
    active: number;
    inactive: number;
    lowStock: number;
  };
  categories: {
    total: number;
    active: number;
  };
  reviews: {
    total: number;
    averageRating: number;
    pending: number;
  };
  inventory: {
    totalValue: number;
    lowStockItems: number;
    outOfStock: number;
  };
}

export interface BulkOperationResult {
  success: string[];
  failed: Array<{ id: string; error: string }>;
}

export interface AuditLogFilter {
  userId?: string;
  action?: string;
  resource?: string;
  page: number;
  limit: number;
}

export class AdminService {
  private inventoryService: InventoryService;

  constructor() {
    this.inventoryService = new InventoryService();
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const [
        productStats,
        categoryStats,
        reviewStats,
        inventoryStats,
      ] = await Promise.all([
        this.getProductStats(),
        this.getCategoryStats(),
        this.getReviewStats(),
        this.getInventoryStats(),
      ]);

      return {
        products: productStats,
        categories: categoryStats,
        reviews: reviewStats,
        inventory: inventoryStats,
      };
    } catch (error) {
      logger.error('Error getting dashboard stats', { error });
      throw error;
    }
  }

  /**
   * Bulk update products
   */
  async bulkUpdateProducts(
    productIds: string[],
    updates: any,
    userId: string
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: [],
      failed: [],
    };

    for (const productId of productIds) {
      try {
        await prisma.product.update({
          where: { id: productId },
          data: {
            ...updates,
            updatedAt: new Date(),
          },
        });

        result.success.push(productId);

        // Log audit
        await this.logAudit(userId, 'UPDATE', 'PRODUCT', productId, updates);
      } catch (error: any) {
        result.failed.push({
          id: productId,
          error: error.message || 'Update failed',
        });
      }
    }

    logger.info('Bulk update completed', {
      success: result.success.length,
      failed: result.failed.length,
      userId,
    });

    return result;
  }

  /**
   * Bulk delete products
   */
  async bulkDeleteProducts(productIds: string[], userId: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: [],
      failed: [],
    };

    for (const productId of productIds) {
      try {
        // Soft delete
        await prisma.product.update({
          where: { id: productId },
          data: {
            isActive: false,
            status: 'ARCHIVED',
            updatedAt: new Date(),
          },
        });

        result.success.push(productId);

        // Log audit
        await this.logAudit(userId, 'DELETE', 'PRODUCT', productId);
      } catch (error: any) {
        result.failed.push({
          id: productId,
          error: error.message || 'Delete failed',
        });
      }
    }

    logger.info('Bulk delete completed', {
      success: result.success.length,
      failed: result.failed.length,
      userId,
    });

    return result;
  }

  /**
   * Reorder categories
   */
  async reorderCategories(categories: Array<{ id: string; sortOrder: number }>): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        for (const category of categories) {
          await tx.category.update({
            where: { id: category.id },
            data: { sortOrder: category.sortOrder },
          });
        }
      });

      logger.info('Categories reordered', { count: categories.length });
    } catch (error) {
      logger.error('Error reordering categories', { error });
      throw error;
    }
  }

  /**
   * Moderate reviews
   */
  async moderateReviews(
    reviewIds: string[],
    action: 'approve' | 'reject' | 'delete',
    userId: string,
    reason?: string
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: [],
      failed: [],
    };

    for (const reviewId of reviewIds) {
      try {
        switch (action) {
          case 'approve':
            await prisma.review.update({
              where: { id: reviewId },
              data: { isVerified: true },
            });
            break;
          case 'reject':
            await prisma.review.update({
              where: { id: reviewId },
              data: { isVerified: false },
            });
            break;
          case 'delete':
            await prisma.review.delete({
              where: { id: reviewId },
            });
            break;
        }

        result.success.push(reviewId);

        // Log audit
        await this.logAudit(userId, action.toUpperCase(), 'REVIEW', reviewId, { reason });
      } catch (error: any) {
        result.failed.push({
          id: reviewId,
          error: error.message || 'Moderation failed',
        });
      }
    }

    return result;
  }

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts(threshold: number, page: number, limit: number) {
    try {
      return await this.inventoryService.getLowStockProducts(threshold, page, limit);
    } catch (error) {
      logger.error('Error getting low stock alerts', { error });
      throw error;
    }
  }

  /**
   * Get sales report
   */
  async getSalesReport(
    startDate?: Date,
    endDate?: Date,
    groupBy: string = 'day'
  ): Promise<any> {
    try {
      // This would typically integrate with an orders service
      // For now, return a placeholder structure
      const report = {
        period: { startDate, endDate },
        groupBy,
        data: [],
        summary: {
          totalSales: 0,
          totalOrders: 0,
          averageOrderValue: 0,
        },
      };

      logger.info('Sales report generated', { startDate, endDate, groupBy });
      return report;
    } catch (error) {
      logger.error('Error generating sales report', { error });
      throw error;
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(filters: AuditLogFilter) {
    try {
      // In a real implementation, you would have an AuditLog model
      // For now, return a placeholder structure
      const items: any[] = [];
      const total = 0;

      logger.info('Audit logs retrieved', filters);

      return {
        items,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          pages: Math.ceil(total / filters.limit),
        },
      };
    } catch (error) {
      logger.error('Error getting audit logs', { error, filters });
      throw error;
    }
  }

  /**
   * Get product statistics
   */
  private async getProductStats() {
    const [total, active, inactive, lowStockCount] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true, status: 'ACTIVE' } }),
      prisma.product.count({ where: { isActive: false } }),
      prisma.inventory.count({
        where: {
          quantity: { lte: 10 },
          product: { isActive: true },
        },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      lowStock: lowStockCount,
    };
  }

  /**
   * Get category statistics
   */
  private async getCategoryStats() {
    const [total, active] = await Promise.all([
      prisma.category.count(),
      prisma.category.count({ where: { isActive: true } }),
    ]);

    return { total, active };
  }

  /**
   * Get review statistics
   */
  private async getReviewStats() {
    const [total, pending] = await Promise.all([
      prisma.review.count(),
      prisma.review.count({ where: { isVerified: false } }),
    ]);

    // Calculate average rating
    const ratingData = await prisma.review.aggregate({
      _avg: { rating: true },
    });

    return {
      total,
      averageRating: ratingData._avg.rating || 0,
      pending,
    };
  }

  /**
   * Get inventory statistics
   */
  private async getInventoryStats() {
    const [lowStockItems, outOfStock] = await Promise.all([
      prisma.inventory.count({
        where: {
          quantity: { lte: 10 },
          product: { isActive: true },
        },
      }),
      prisma.inventory.count({
        where: {
          quantity: 0,
          product: { isActive: true },
        },
      }),
    ]);

    // Calculate total inventory value
    const inventoryValue = await prisma.inventory.findMany({
      include: {
        product: {
          select: { price: true },
        },
      },
    });

    const totalValue = inventoryValue.reduce(
      (sum, item) => sum + (item.quantity * Number(item.product?.price || 0)),
      0
    );

    return {
      totalValue,
      lowStockItems,
      outOfStock,
    };
  }

  /**
   * Log audit action
   */
  private async logAudit(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    details?: any
  ): Promise<void> {
    try {
      // In a real implementation, you would save to an AuditLog table
      logger.info('Audit log recorded', {
        userId,
        action,
        resource,
        resourceId,
        details,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Error logging audit', { error });
      // Don't throw - audit logging should not break the main operation
    }
  }
}