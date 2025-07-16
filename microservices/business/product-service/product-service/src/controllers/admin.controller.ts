import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { logger } from '../utils/logger';
import { CacheService } from '../services/cache.service';
import { QueueService } from '../services/queue.service';
import { MetricsService } from '../services/metrics.service';

export class AdminController {
  private adminService: AdminService;
  private cacheService: CacheService;
  private queueService: QueueService;
  private metricsService: MetricsService;

  constructor() {
    this.adminService = new AdminService();
    this.cacheService = CacheService.getInstance();
    this.queueService = QueueService.getInstance();
    this.metricsService = MetricsService.getInstance();
  }

  /**
   * Get dashboard statistics
   */
  getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.info('Getting dashboard statistics');

      const stats = await this.adminService.getDashboardStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Bulk import products
   */
  bulkImportProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      const { overwrite = false } = req.body;
      const userId = req.user!.id;

      if (!file) {
        throw new Error('No file uploaded');
      }

      logger.info('Bulk importing products', {
        filename: file.originalname,
        size: file.size,
        overwrite,
        userId,
      });

      // Queue the import job
      const job = await this.queueService.addJob('product-import', {
        file: {
          buffer: file.buffer,
          mimetype: file.mimetype,
          originalname: file.originalname,
        },
        overwrite,
        userId,
      });

      res.status(202).json({
        success: true,
        message: 'Import job queued',
        data: {
          jobId: job.id,
          status: 'queued',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Bulk export products
   */
  bulkExportProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { format, filters = {} } = req.body;
      const userId = req.user!.id;

      logger.info('Bulk exporting products', { format, filters, userId });

      // Queue the export job
      const job = await this.queueService.addJob('product-export', {
        format,
        filters,
        userId,
      });

      res.status(202).json({
        success: true,
        message: 'Export job queued',
        data: {
          jobId: job.id,
          status: 'queued',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Bulk update products
   */
  bulkUpdateProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productIds, updates } = req.body;
      const userId = req.user!.id;

      logger.info('Bulk updating products', {
        count: productIds.length,
        updates,
        userId,
      });

      const result = await this.adminService.bulkUpdateProducts(productIds, updates, userId);

      // Invalidate cache for updated products
      await Promise.all(
        result.success.map(id => 
          this.cacheService.invalidateByTags([`product:${id}`])
        )
      );

      res.json({
        success: true,
        data: result,
        message: `Updated ${result.success.length} products`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Bulk delete products
   */
  bulkDeleteProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productIds } = req.body;
      const userId = req.user!.id;

      logger.info('Bulk deleting products', {
        count: productIds.length,
        userId,
      });

      const result = await this.adminService.bulkDeleteProducts(productIds, userId);

      // Invalidate cache for deleted products
      await Promise.all(
        result.success.map(id => 
          this.cacheService.invalidateByTags([`product:${id}`])
        )
      );

      res.json({
        success: true,
        data: result,
        message: `Deleted ${result.success.length} products`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Reorder categories
   */
  reorderCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { categories } = req.body;
      const userId = req.user!.id;

      logger.info('Reordering categories', { count: categories.length, userId });

      await this.adminService.reorderCategories(categories);

      // Invalidate category cache
      await this.cacheService.invalidateByTags(['categories']);

      res.json({
        success: true,
        message: 'Categories reordered successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Moderate reviews
   */
  moderateReviews = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewIds, action, reason } = req.body;
      const userId = req.user!.id;

      logger.info('Moderating reviews', {
        count: reviewIds.length,
        action,
        userId,
      });

      const result = await this.adminService.moderateReviews(
        reviewIds,
        action,
        userId,
        reason
      );

      // Invalidate review cache
      await this.cacheService.invalidateByTags(['reviews']);

      res.json({
        success: true,
        data: result,
        message: `Moderated ${result.success.length} reviews`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get low stock alerts
   */
  getLowStockAlerts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { threshold = 10, page = 1, limit = 20 } = req.query;

      logger.info('Getting low stock alerts', { threshold, page, limit });

      const result = await this.adminService.getLowStockAlerts(
        Number(threshold),
        Number(page),
        Number(limit)
      );

      res.json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Clear cache
   */
  clearCache = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pattern, tags } = req.body;

      logger.info('Clearing cache', { pattern, tags });

      if (pattern) {
        await this.cacheService.deletePattern(pattern);
      }

      if (tags && tags.length > 0) {
        await this.cacheService.invalidateByTags(tags);
      }

      if (!pattern && !tags) {
        await this.cacheService.flush();
      }

      res.json({
        success: true,
        message: 'Cache cleared successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get queue jobs
   */
  getQueueJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { queueName } = req.params;
      const { status } = req.query;

      logger.info('Getting queue jobs', { queueName, status });

      const jobs = await this.queueService.getJobs(
        queueName,
        status ? [status as any] : undefined
      );

      const jobData = await Promise.all(
        jobs.map(async job => ({
          id: job.id,
          data: job.data,
          progress: job.progress(),
          attemptsMade: job.attemptsMade,
          failedReason: job.failedReason,
          timestamp: job.timestamp,
          finishedOn: job.finishedOn,
          processedOn: job.processedOn,
        }))
      );

      res.json({
        success: true,
        data: jobData,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get sales report
   */
  getSalesReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate, groupBy = 'day' } = req.query;

      logger.info('Getting sales report', { startDate, endDate, groupBy });

      const report = await this.adminService.getSalesReport(
        startDate as Date | undefined,
        endDate as Date | undefined,
        groupBy as string
      );

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get audit logs
   */
  getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { 
        userId, 
        action, 
        resource, 
        page = 1, 
        limit = 50 
      } = req.query;

      logger.info('Getting audit logs', {
        userId,
        action,
        resource,
        page,
        limit,
      });

      const result = await this.adminService.getAuditLogs({
        userId: userId as string,
        action: action as string,
        resource: resource as string,
        page: Number(page),
        limit: Number(limit),
      });

      res.json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };
}