import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { Inventory, Prisma, Product } from '@prisma/client';

export interface InventoryUpdate {
  productId: string;
  quantity: number;
  operation: 'set' | 'add' | 'subtract';
}

export interface BatchUpdateResult {
  success: Array<{ productId: string; inventory: Inventory }>;
  failed: Array<{ productId: string; error: string }>;
}

export interface InventoryHistory {
  id: string;
  productId: string;
  previousQuantity: number;
  newQuantity: number;
  change: number;
  operation: string;
  reason?: string;
  userId?: string;
  createdAt: Date;
}

export class InventoryService {
  /**
   * Get product inventory
   */
  async getProductInventory(productId: string): Promise<Inventory | null> {
    try {
      const inventory = await prisma.inventory.findUnique({
        where: { productId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              status: true,
            },
          },
        },
      });

      if (!inventory) {
        throw new AppError('Inventory not found', 404);
      }

      // Update available quantity
      inventory.availableQuantity = inventory.quantity - inventory.reservedQuantity;

      return inventory;
    } catch (error) {
      logger.error('Error getting product inventory', { error, productId });
      throw error;
    }
  }

  /**
   * Get variants inventory
   */
  async getVariantsInventory(productId: string): Promise<Inventory[]> {
    try {
      const inventories = await prisma.inventory.findMany({
        where: {
          variant: {
            productId,
          },
        },
        include: {
          variant: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
        },
      });

      // Update available quantities
      return inventories.map(inv => ({
        ...inv,
        availableQuantity: inv.quantity - inv.reservedQuantity,
      }));
    } catch (error) {
      logger.error('Error getting variants inventory', { error, productId });
      throw error;
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(threshold: number, page: number, limit: number) {
    try {
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        prisma.inventory.findMany({
          where: {
            quantity: {
              lte: threshold,
            },
            product: {
              isActive: true,
              status: 'ACTIVE',
            },
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                images: {
                  where: { isMain: true },
                  select: { url: true },
                  take: 1,
                },
              },
            },
          },
          skip,
          take: limit,
          orderBy: {
            quantity: 'asc',
          },
        }),
        prisma.inventory.count({
          where: {
            quantity: {
              lte: threshold,
            },
            product: {
              isActive: true,
              status: 'ACTIVE',
            },
          },
        }),
      ]);

      return {
        items: items.map(inv => ({
          ...inv,
          availableQuantity: inv.quantity - inv.reservedQuantity,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting low stock products', { error, threshold });
      throw error;
    }
  }

  /**
   * Update inventory
   */
  async updateInventory(
    productId: string,
    quantity: number,
    operation: 'set' | 'add' | 'subtract',
    userId?: string,
    reason?: string
  ): Promise<Inventory> {
    return await prisma.$transaction(async (tx) => {
      // Get current inventory
      const currentInventory = await tx.inventory.findUnique({
        where: { productId },
      });

      if (!currentInventory) {
        throw new AppError('Inventory not found', 404);
      }

      // Calculate new quantity
      let newQuantity: number;
      switch (operation) {
        case 'set':
          newQuantity = quantity;
          break;
        case 'add':
          newQuantity = currentInventory.quantity + quantity;
          break;
        case 'subtract':
          newQuantity = currentInventory.quantity - quantity;
          if (newQuantity < 0) {
            throw new AppError('Insufficient inventory', 400);
          }
          break;
      }

      // Update inventory
      const updatedInventory = await tx.inventory.update({
        where: { productId },
        data: {
          quantity: newQuantity,
          lastUpdated: new Date(),
        },
      });

      // Record history
      await this.recordInventoryHistory(tx, {
        productId,
        previousQuantity: currentInventory.quantity,
        newQuantity,
        operation,
        reason,
        userId,
      });

      // Update product status based on inventory
      if (newQuantity === 0) {
        await tx.product.update({
          where: { id: productId },
          data: { status: 'INACTIVE' },
        });
      } else if (currentInventory.quantity === 0 && newQuantity > 0) {
        await tx.product.update({
          where: { id: productId },
          data: { status: 'ACTIVE' },
        });
      }

      logger.info('Inventory updated', {
        productId,
        previousQuantity: currentInventory.quantity,
        newQuantity,
        operation,
        userId,
      });

      return {
        ...updatedInventory,
        availableQuantity: updatedInventory.quantity - updatedInventory.reservedQuantity,
      };
    });
  }

  /**
   * Update variant inventory
   */
  async updateVariantInventory(
    variantId: string,
    quantity: number,
    operation: 'set' | 'add' | 'subtract',
    userId?: string
  ): Promise<Inventory> {
    return await prisma.$transaction(async (tx) => {
      const currentInventory = await tx.inventory.findUnique({
        where: { variantId },
      });

      if (!currentInventory) {
        throw new AppError('Variant inventory not found', 404);
      }

      let newQuantity: number;
      switch (operation) {
        case 'set':
          newQuantity = quantity;
          break;
        case 'add':
          newQuantity = currentInventory.quantity + quantity;
          break;
        case 'subtract':
          newQuantity = currentInventory.quantity - quantity;
          if (newQuantity < 0) {
            throw new AppError('Insufficient inventory', 400);
          }
          break;
      }

      const updatedInventory = await tx.inventory.update({
        where: { variantId },
        data: {
          quantity: newQuantity,
          lastUpdated: new Date(),
        },
      });

      return {
        ...updatedInventory,
        availableQuantity: updatedInventory.quantity - updatedInventory.reservedQuantity,
      };
    });
  }

  /**
   * Reserve inventory
   */
  async reserveInventory(
    productId: string,
    quantity: number,
    orderId: string,
    userId?: string
  ): Promise<Inventory> {
    return await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: { productId },
      });

      if (!inventory) {
        throw new AppError('Inventory not found', 404);
      }

      const availableQuantity = inventory.quantity - inventory.reservedQuantity;
      if (availableQuantity < quantity) {
        throw new AppError('Insufficient inventory available', 400);
      }

      const updatedInventory = await tx.inventory.update({
        where: { productId },
        data: {
          reservedQuantity: inventory.reservedQuantity + quantity,
          lastUpdated: new Date(),
        },
      });

      // Record reservation
      await this.recordInventoryHistory(tx, {
        productId,
        previousQuantity: inventory.reservedQuantity,
        newQuantity: updatedInventory.reservedQuantity,
        operation: 'reserve',
        reason: `Order: ${orderId}`,
        userId,
      });

      return {
        ...updatedInventory,
        availableQuantity: updatedInventory.quantity - updatedInventory.reservedQuantity,
      };
    });
  }

  /**
   * Release inventory
   */
  async releaseInventory(
    productId: string,
    quantity: number,
    orderId: string,
    userId?: string
  ): Promise<Inventory> {
    return await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: { productId },
      });

      if (!inventory) {
        throw new AppError('Inventory not found', 404);
      }

      if (inventory.reservedQuantity < quantity) {
        throw new AppError('Cannot release more than reserved quantity', 400);
      }

      const updatedInventory = await tx.inventory.update({
        where: { productId },
        data: {
          reservedQuantity: inventory.reservedQuantity - quantity,
          lastUpdated: new Date(),
        },
      });

      // Record release
      await this.recordInventoryHistory(tx, {
        productId,
        previousQuantity: inventory.reservedQuantity,
        newQuantity: updatedInventory.reservedQuantity,
        operation: 'release',
        reason: `Order: ${orderId}`,
        userId,
      });

      return {
        ...updatedInventory,
        availableQuantity: updatedInventory.quantity - updatedInventory.reservedQuantity,
      };
    });
  }

  /**
   * Batch update inventory
   */
  async batchUpdateInventory(
    updates: InventoryUpdate[],
    userId?: string
  ): Promise<BatchUpdateResult> {
    const results: BatchUpdateResult = {
      success: [],
      failed: [],
    };

    for (const update of updates) {
      try {
        const inventory = await this.updateInventory(
          update.productId,
          update.quantity,
          update.operation,
          userId,
          'Batch update'
        );
        results.success.push({ productId: update.productId, inventory });
      } catch (error: any) {
        results.failed.push({
          productId: update.productId,
          error: error.message || 'Update failed',
        });
      }
    }

    return results;
  }

  /**
   * Get inventory history
   */
  async getInventoryHistory(
    productId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    try {
      const where: any = { productId };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      // Since we don't have an InventoryHistory model in the schema,
      // we'll return a placeholder. In a real implementation, you'd need
      // to add an InventoryHistory model to track changes
      return [];
    } catch (error) {
      logger.error('Error getting inventory history', { error, productId });
      throw error;
    }
  }

  /**
   * Record inventory history (helper method)
   */
  private async recordInventoryHistory(
    tx: any,
    data: {
      productId: string;
      previousQuantity: number;
      newQuantity: number;
      operation: string;
      reason?: string;
      userId?: string;
    }
  ): Promise<void> {
    // In a real implementation, you would create an InventoryHistory record here
    logger.info('Inventory history recorded', data);
  }

  /**
   * Sync inventory with external system
   */
  async syncInventory(productId: string): Promise<void> {
    try {
      const inventory = await this.getProductInventory(productId);
      if (!inventory) {
        throw new AppError('Inventory not found', 404);
      }

      // Here you would implement the actual sync logic with external systems
      logger.info('Inventory synced', { productId, quantity: inventory.quantity });
    } catch (error) {
      logger.error('Error syncing inventory', { error, productId });
      throw error;
    }
  }
}