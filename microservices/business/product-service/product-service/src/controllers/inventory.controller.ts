import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/inventory.service';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { CacheService } from '../services/cache.service';
import { QueueService } from '../services/queue.service';
import { MetricsService } from '../services/metrics.service';

export class InventoryController {
  private inventoryService: InventoryService;
  private cacheService: CacheService;
  private queueService: QueueService;
  private metricsService: MetricsService;

  constructor() {
    this.inventoryService = new InventoryService();
    this.cacheService = CacheService.getInstance();
    this.queueService = QueueService.getInstance();
    this.metricsService = MetricsService.getInstance();
  }

  /**
   * Get product inventory
   */
  getProductInventory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;
      const userId = req.user?.id;

      logger.info('Getting product inventory', { productId, userId });

      // Try cache first
      const cacheKey = `inventory:${productId}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.metricsService.recordCacheHit();
        return res.json({
          success: true,
          data: cached,
        });
      }

      this.metricsService.recordCacheMiss();

      const inventory = await this.inventoryService.getProductInventory(productId);

      // Cache the result
      await this.cacheService.set(cacheKey, inventory, {
        ttl: 300, // 5 minutes
        tags: [`product:${productId}`, 'inventory'],
      });

      res.json({
        success: true,
        data: inventory,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get variants inventory
   */
  getVariantsInventory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;

      logger.info('Getting variants inventory', { productId });

      const inventory = await this.inventoryService.getVariantsInventory(productId);

      res.json({
        success: true,
        data: inventory,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get low stock products
   */
  getLowStockProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { threshold = 10, page = 1, limit = 20 } = req.query;

      logger.info('Getting low stock products', { threshold, page, limit });

      const result = await this.inventoryService.getLowStockProducts(
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
   * Update inventory
   */
  updateInventory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;
      const { quantity, operation, reason } = req.body;
      const userId = req.user?.id;

      logger.info('Updating inventory', { productId, quantity, operation, userId });

      const inventory = await this.inventoryService.updateInventory(
        productId,
        quantity,
        operation,
        userId,
        reason
      );

      // Invalidate cache
      await this.cacheService.deletePattern(`inventory:${productId}`);
      await this.cacheService.invalidateByTags([`product:${productId}`, 'inventory']);

      // Queue for sync
      await this.queueService.addJob('inventory-sync', {
        productId,
        quantity: inventory.quantity,
        operation: 'update',
      });

      // Check if low stock alert needed
      if (inventory.quantity <= inventory.lowStockThreshold) {
        await this.queueService.addJob('notification', {
          type: 'low-stock',
          recipient: 'admin',
          data: {
            productId,
            quantity: inventory.quantity,
            threshold: inventory.lowStockThreshold,
          },
        });
      }

      res.json({
        success: true,
        data: inventory,
        message: 'Inventory updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update variant inventory
   */
  updateVariantInventory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId, variantId } = req.params;
      const { quantity, operation } = req.body;
      const userId = req.user?.id;

      logger.info('Updating variant inventory', { productId, variantId, quantity, operation });

      const inventory = await this.inventoryService.updateVariantInventory(
        variantId,
        quantity,
        operation,
        userId
      );

      // Invalidate cache
      await this.cacheService.deletePattern(`inventory:${productId}`);

      res.json({
        success: true,
        data: inventory,
        message: 'Variant inventory updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Reserve inventory
   */
  reserveInventory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;
      const { quantity, orderId } = req.body;
      const userId = req.user?.id;

      logger.info('Reserving inventory', { productId, quantity, orderId, userId });

      const inventory = await this.inventoryService.reserveInventory(
        productId,
        quantity,
        orderId,
        userId
      );

      // Invalidate cache
      await this.cacheService.deletePattern(`inventory:${productId}`);

      res.json({
        success: true,
        data: inventory,
        message: 'Inventory reserved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Release inventory
   */
  releaseInventory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;
      const { quantity, orderId } = req.body;
      const userId = req.user?.id;

      logger.info('Releasing inventory', { productId, quantity, orderId, userId });

      const inventory = await this.inventoryService.releaseInventory(
        productId,
        quantity,
        orderId,
        userId
      );

      // Invalidate cache
      await this.cacheService.deletePattern(`inventory:${productId}`);

      res.json({
        success: true,
        data: inventory,
        message: 'Inventory released successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Batch update inventory
   */
  batchUpdateInventory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { updates } = req.body;
      const userId = req.user?.id;

      logger.info('Batch updating inventory', { count: updates.length, userId });

      const results = await this.inventoryService.batchUpdateInventory(updates, userId);

      // Invalidate cache for all updated products
      const productIds = updates.map((u: any) => u.productId);
      await Promise.all(
        productIds.map((id: string) => this.cacheService.deletePattern(`inventory:${id}`))
      );

      res.json({
        success: true,
        data: results,
        message: `Updated inventory for ${results.success.length} products`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get inventory history
   */
  getInventoryHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;
      const { startDate, endDate } = req.query;

      logger.info('Getting inventory history', { productId, startDate, endDate });

      const history = await this.inventoryService.getInventoryHistory(
        productId,
        startDate as Date | undefined,
        endDate as Date | undefined
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  };
}