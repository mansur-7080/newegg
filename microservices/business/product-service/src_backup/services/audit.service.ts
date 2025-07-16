/**
 * UltraMarket Audit Service
 * Professional audit logging service for product operations
 */

import { logger } from '@ultramarket/shared/logging/logger';

export interface AuditLogData {
  userId?: string;
  productId?: string;
  productName?: string;
  categoryId?: string;
  categoryName?: string;
  vendorId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  changes?: Record<string, { from: any; to: any }>;
  resourceType?: string;
  resourceId?: string;
}

export type AuditAction =
  // Product actions
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_DELETED'
  | 'PRODUCT_VIEWED'
  | 'PRODUCT_ACTIVATED'
  | 'PRODUCT_DEACTIVATED'
  | 'PRODUCT_FEATURED'
  | 'PRODUCT_UNFEATURED'
  | 'PRODUCT_INVENTORY_UPDATED'
  | 'PRODUCT_PRICE_UPDATED'
  // Category actions
  | 'CATEGORY_CREATED'
  | 'CATEGORY_UPDATED'
  | 'CATEGORY_DELETED'
  | 'CATEGORY_VIEWED'
  // Search actions
  | 'PRODUCT_SEARCHED'
  | 'PRODUCTS_FILTERED'
  // Admin actions
  | 'BULK_PRODUCTS_UPDATED'
  | 'BULK_PRODUCTS_DELETED'
  | 'PRODUCT_IMPORT'
  | 'PRODUCT_EXPORT';

/**
 * Log a product-related action
 */
export async function logProductAction(
  action: AuditAction,
  data: AuditLogData
): Promise<void> {
  try {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      service: 'product-service',
      action,
      userId: data.userId,
      productId: data.productId,
      productName: data.productName,
      categoryId: data.categoryId,
      categoryName: data.categoryName,
      vendorId: data.vendorId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      resourceType: data.resourceType || 'product',
      resourceId: data.resourceId || data.productId,
      metadata: data.metadata,
      changes: data.changes,
    };

    // Log to structured logger
    logger.info('Audit log entry', {
      audit: true,
      ...auditEntry,
    });

    // In production, you might also want to:
    // 1. Send to dedicated audit log storage (e.g., separate database)
    // 2. Send to external audit service
    // 3. Send to message queue for async processing
    
    // Example: Save to audit database
    // await saveToAuditDatabase(auditEntry);
    
  } catch (error) {
    logger.error('Error logging audit action', {
      error: error.message,
      action,
      data,
    });
  }
}

/**
 * Log category-related action
 */
export async function logCategoryAction(
  action: AuditAction,
  data: AuditLogData
): Promise<void> {
  return logProductAction(action, {
    ...data,
    resourceType: 'category',
    resourceId: data.categoryId,
  });
}

/**
 * Log bulk operation
 */
export async function logBulkOperation(
  action: AuditAction,
  data: {
    userId?: string;
    affectedCount: number;
    criteria?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      service: 'product-service',
      action,
      userId: data.userId,
      resourceType: 'bulk_operation',
      affectedCount: data.affectedCount,
      criteria: data.criteria,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: data.metadata,
    };

    logger.info('Bulk operation audit log', {
      audit: true,
      bulk: true,
      ...auditEntry,
    });
  } catch (error) {
    logger.error('Error logging bulk operation', {
      error: error.message,
      action,
      data,
    });
  }
}

/**
 * Log search operation
 */
export async function logSearchOperation(data: {
  userId?: string;
  query?: string;
  filters?: Record<string, any>;
  resultCount?: number;
  page?: number;
  limit?: number;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      service: 'product-service',
      action: 'PRODUCT_SEARCHED' as AuditAction,
      userId: data.userId,
      resourceType: 'search',
      query: data.query,
      filters: data.filters,
      resultCount: data.resultCount,
      page: data.page,
      limit: data.limit,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    };

    logger.info('Search operation audit log', {
      audit: true,
      search: true,
      ...auditEntry,
    });
  } catch (error) {
    logger.error('Error logging search operation', {
      error: error.message,
      data,
    });
  }
}

/**
 * Log API access
 */
export async function logApiAccess(data: {
  userId?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime?: number;
  ipAddress?: string;
  userAgent?: string;
  requestSize?: number;
  responseSize?: number;
}): Promise<void> {
  try {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      service: 'product-service',
      action: 'API_ACCESS' as AuditAction,
      userId: data.userId,
      resourceType: 'api',
      endpoint: data.endpoint,
      method: data.method,
      statusCode: data.statusCode,
      responseTime: data.responseTime,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      requestSize: data.requestSize,
      responseSize: data.responseSize,
    };

    logger.info('API access audit log', {
      audit: true,
      api: true,
      ...auditEntry,
    });
  } catch (error) {
    logger.error('Error logging API access', {
      error: error.message,
      data,
    });
  }
}

/**
 * Create audit trail for data changes
 */
export function createChangeAudit(
  oldData: Record<string, any>,
  newData: Record<string, any>
): Record<string, { from: any; to: any }> {
  const changes: Record<string, { from: any; to: any }> = {};

  // Compare all fields in newData
  for (const key in newData) {
    if (newData[key] !== oldData[key]) {
      changes[key] = {
        from: oldData[key],
        to: newData[key],
      };
    }
  }

  return changes;
}

/**
 * Get audit logs for a resource
 * Note: In production, this would query the audit database
 */
export async function getAuditLogs(
  resourceType: string,
  resourceId: string,
  options: {
    limit?: number;
    offset?: number;
    actions?: AuditAction[];
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<any[]> {
  try {
    // This is a placeholder - in production, you'd query your audit database
    logger.info('Audit logs requested', {
      resourceType,
      resourceId,
      options,
    });

    // Return empty array for now
    return [];
  } catch (error) {
    logger.error('Error getting audit logs', {
      error: error.message,
      resourceType,
      resourceId,
      options,
    });
    return [];
  }
}

export default {
  logProductAction,
  logCategoryAction,
  logBulkOperation,
  logSearchOperation,
  logApiAccess,
  createChangeAudit,
  getAuditLogs,
};