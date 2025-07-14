/**
 * Audit Service for Product Management
 * Professional audit trail for UltraMarket
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@ultramarket/shared/logging/logger';

const prisma = new PrismaClient();

/**
 * Product audit action types
 */
export enum ProductAuditAction {
  PRODUCT_CREATED = 'PRODUCT_CREATED',
  PRODUCT_UPDATED = 'PRODUCT_UPDATED',
  PRODUCT_DELETED = 'PRODUCT_DELETED',
  PRODUCT_VIEWED = 'PRODUCT_VIEWED',
  PRODUCT_SEARCHED = 'PRODUCT_SEARCHED',
  INVENTORY_UPDATED = 'INVENTORY_UPDATED',
  PRICE_CHANGED = 'PRICE_CHANGED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  CATEGORY_CHANGED = 'CATEGORY_CHANGED',
  IMAGES_UPDATED = 'IMAGES_UPDATED',
  SEO_UPDATED = 'SEO_UPDATED',
}

/**
 * Audit entry interface
 */
export interface ProductAuditEntry {
  action: ProductAuditAction;
  userId?: string;
  productId?: string;
  productName?: string;
  vendorId?: string;
  ipAddress?: string;
  userAgent?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Log product action to audit trail
 */
export async function logProductAction(
  action: ProductAuditAction,
  data: ProductAuditEntry
): Promise<void> {
  try {
    await prisma.productAudit.create({
      data: {
        action,
        userId: data.userId,
        productId: data.productId,
        productName: data.productName,
        vendorId: data.vendorId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        oldValues: data.oldValues as any,
        newValues: data.newValues as any,
        metadata: data.metadata as any,
        timestamp: new Date(),
      },
    });

    logger.info('Product audit entry created', {
      action,
      productId: data.productId,
      userId: data.userId,
      vendorId: data.vendorId,
    });
  } catch (error) {
    logger.error('Failed to create product audit entry', {
      action,
      error: error.message,
      data,
    });
  }
}

/**
 * Log product creation
 */
export async function logProductCreation(
  productId: string,
  productData: any,
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logProductAction(ProductAuditAction.PRODUCT_CREATED, {
    action: ProductAuditAction.PRODUCT_CREATED,
    userId,
    productId,
    productName: productData.name,
    vendorId: productData.vendorId,
    ipAddress,
    userAgent,
    newValues: {
      name: productData.name,
      category: productData.category,
      brand: productData.brand,
      price: productData.price,
      status: productData.status,
    },
    metadata: {
      sku: productData.sku,
      currency: productData.currency,
    },
  });
}

/**
 * Log product update with change tracking
 */
export async function logProductUpdate(
  productId: string,
  oldData: any,
  newData: any,
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  // Track specific changes
  const changes: Record<string, { old: any; new: any }> = {};
  
  // Compare fields
  const fieldsToTrack = [
    'name', 'description', 'category', 'brand', 'price', 'comparePrice',
    'stock', 'status', 'visibility', 'images', 'tags', 'seoTitle'
  ];

  fieldsToTrack.forEach(field => {
    if (oldData[field] !== newData[field]) {
      changes[field] = {
        old: oldData[field],
        new: newData[field],
      };
    }
  });

  // Log general update
  await logProductAction(ProductAuditAction.PRODUCT_UPDATED, {
    action: ProductAuditAction.PRODUCT_UPDATED,
    userId,
    productId,
    productName: newData.name || oldData.name,
    vendorId: oldData.vendorId,
    ipAddress,
    userAgent,
    oldValues: changes,
    newValues: changes,
    metadata: {
      changedFields: Object.keys(changes),
      changeCount: Object.keys(changes).length,
    },
  });

  // Log specific change types
  if (changes.price || changes.comparePrice) {
    await logProductAction(ProductAuditAction.PRICE_CHANGED, {
      action: ProductAuditAction.PRICE_CHANGED,
      userId,
      productId,
      productName: newData.name || oldData.name,
      vendorId: oldData.vendorId,
      ipAddress,
      userAgent,
      oldValues: {
        price: oldData.price,
        comparePrice: oldData.comparePrice,
      },
      newValues: {
        price: newData.price,
        comparePrice: newData.comparePrice,
      },
    });
  }

  if (changes.status) {
    await logProductAction(ProductAuditAction.STATUS_CHANGED, {
      action: ProductAuditAction.STATUS_CHANGED,
      userId,
      productId,
      productName: newData.name || oldData.name,
      vendorId: oldData.vendorId,
      ipAddress,
      userAgent,
      oldValues: { status: oldData.status },
      newValues: { status: newData.status },
    });
  }

  if (changes.category) {
    await logProductAction(ProductAuditAction.CATEGORY_CHANGED, {
      action: ProductAuditAction.CATEGORY_CHANGED,
      userId,
      productId,
      productName: newData.name || oldData.name,
      vendorId: oldData.vendorId,
      ipAddress,
      userAgent,
      oldValues: { category: oldData.category },
      newValues: { category: newData.category },
    });
  }
}

/**
 * Log product deletion
 */
export async function logProductDeletion(
  productId: string,
  productData: any,
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logProductAction(ProductAuditAction.PRODUCT_DELETED, {
    action: ProductAuditAction.PRODUCT_DELETED,
    userId,
    productId,
    productName: productData.name,
    vendorId: productData.vendorId,
    ipAddress,
    userAgent,
    oldValues: {
      name: productData.name,
      status: productData.status,
      stock: productData.stock,
    },
    metadata: {
      sku: productData.sku,
      deletionReason: 'Manual deletion',
    },
  });
}

/**
 * Log product view (for analytics)
 */
export async function logProductView(
  productId: string,
  userId?: string,
  ipAddress?: string,
  userAgent?: string,
  referrer?: string
): Promise<void> {
  try {
    // Only log unique views (not repeated views from same user/IP within 1 hour)
    const recentView = await prisma.productAudit.findFirst({
      where: {
        action: ProductAuditAction.PRODUCT_VIEWED,
        productId,
        OR: [
          { userId: userId || undefined },
          { ipAddress: ipAddress || undefined },
        ],
        timestamp: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
      },
    });

    if (!recentView) {
      await logProductAction(ProductAuditAction.PRODUCT_VIEWED, {
        action: ProductAuditAction.PRODUCT_VIEWED,
        userId,
        productId,
        ipAddress,
        userAgent,
        metadata: {
          referrer,
          viewType: 'page_view',
        },
      });
    }
  } catch (error) {
    logger.warn('Failed to log product view', {
      productId,
      error: error.message,
    });
  }
}

/**
 * Log search query
 */
export async function logProductSearch(
  searchQuery: string,
  filters: any,
  resultCount: number,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await logProductAction(ProductAuditAction.PRODUCT_SEARCHED, {
      action: ProductAuditAction.PRODUCT_SEARCHED,
      userId,
      ipAddress,
      userAgent,
      metadata: {
        searchQuery,
        filters,
        resultCount,
        searchType: 'product_search',
      },
    });
  } catch (error) {
    logger.warn('Failed to log product search', {
      searchQuery,
      error: error.message,
    });
  }
}

/**
 * Log inventory update
 */
export async function logInventoryUpdate(
  productId: string,
  oldStock: number,
  newStock: number,
  userId: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logProductAction(ProductAuditAction.INVENTORY_UPDATED, {
    action: ProductAuditAction.INVENTORY_UPDATED,
    userId,
    productId,
    ipAddress,
    userAgent,
    oldValues: { stock: oldStock },
    newValues: { stock: newStock },
    metadata: {
      reason,
      stockChange: newStock - oldStock,
    },
  });
}

/**
 * Get audit trail for a product
 */
export async function getProductAuditTrail(
  productId: string,
  options: {
    limit?: number;
    page?: number;
    action?: ProductAuditAction;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<{
  entries: any[];
  total: number;
  pagination: any;
}> {
  try {
    const { limit = 50, page = 1, action, userId, startDate, endDate } = options;
    const skip = (page - 1) * limit;

    const where: any = { productId };

    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [entries, total] = await Promise.all([
      prisma.productAudit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.productAudit.count({ where }),
    ]);

    return {
      entries,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  } catch (error) {
    logger.error('Failed to get product audit trail', {
      productId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get audit statistics
 */
export async function getAuditStatistics(
  vendorId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalActions: number;
  actionsByType: Record<string, number>;
  topUsers: Array<{ userId: string; userName: string; actionCount: number }>;
  actionsPerDay: Array<{ date: string; count: number }>;
}> {
  try {
    const where: any = {};

    if (vendorId) where.vendorId = vendorId;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [totalActions, actionsByType, topUsers] = await Promise.all([
      // Total actions count
      prisma.productAudit.count({ where }),

      // Actions by type
      prisma.productAudit.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
      }),

      // Top users by action count
      prisma.productAudit.groupBy({
        by: ['userId'],
        where: { ...where, userId: { not: null } },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      totalActions,
      actionsByType: actionsByType.reduce((acc, item) => {
        acc[item.action] = item._count.action;
        return acc;
      }, {} as Record<string, number>),
      topUsers: topUsers.map(user => ({
        userId: user.userId!,
        userName: 'Unknown', // Would need to join with user table
        actionCount: user._count.userId,
      })),
      actionsPerDay: [], // Would need more complex aggregation
    };
  } catch (error) {
    logger.error('Failed to get audit statistics', {
      vendorId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Clean up old audit entries
 */
export async function cleanupOldAuditEntries(olderThanDays: number = 365): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.productAudit.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
        action: {
          in: [
            ProductAuditAction.PRODUCT_VIEWED,
            ProductAuditAction.PRODUCT_SEARCHED,
          ],
        },
      },
    });

    logger.info('Old audit entries cleaned up', {
      deletedCount: result.count,
      olderThanDays,
    });

    return result.count;
  } catch (error) {
    logger.error('Failed to cleanup old audit entries', {
      error: error.message,
      olderThanDays,
    });
    return 0;
  }
}