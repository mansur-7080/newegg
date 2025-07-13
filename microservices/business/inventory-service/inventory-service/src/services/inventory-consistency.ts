import { logger } from '../utils/logger';

// Enhanced logger for consistency events
const consistencyLogger = {
  info: (message: string, meta?: any) => console.log(`[CONSISTENCY-INFO] ${message}`, meta),
  error: (message: string, meta?: any) => console.error(`[CONSISTENCY-ERROR] ${message}`, meta),
  warn: (message: string, meta?: any) => console.warn(`[CONSISTENCY-WARN] ${message}`, meta),
  security: (message: string, meta?: any) => console.log(`[SECURITY] ${message}`, meta),
};

export interface InventoryLock {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  lockType: 'reservation' | 'adjustment' | 'transfer';
  expiresAt: Date;
  createdAt: Date;
}

export interface ConsistencyCheck {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  discrepancies: InventoryDiscrepancy[];
}

export interface InventoryDiscrepancy {
  productId: string;
  warehouseId: string;
  expectedQuantity: number;
  actualQuantity: number;
  difference: number;
  type: 'shortage' | 'excess' | 'missing';
}

export interface TransactionResult {
  success: boolean;
  transactionId: string;
  changes: any[];
  errors: string[];
  rollbackRequired: boolean;
}

// Mock database for demonstration
class MockDatabase {
  private locks: InventoryLock[] = [];
  private inventory: any[] = [];
  private movements: any[] = [];

  async findFirst(where: any): Promise<any> {
    // Mock implementation
    return this.inventory.find(item => 
      item.productId === where.productId && 
      item.warehouseId === where.warehouseId
    );
  }

  async create(data: any): Promise<any> {
    const newItem = { ...data, id: `mock_${Date.now()}` };
    if (data.expiresAt) {
      this.locks.push(newItem as InventoryLock);
    } else if (data.type) {
      this.movements.push(newItem);
    } else {
      this.inventory.push(newItem);
    }
    return newItem;
  }

  async delete(where: any): Promise<any> {
    const index = this.locks.findIndex(lock => lock.id === where.id);
    if (index !== -1) {
      this.locks.splice(index, 1);
    }
    return { count: 1 };
  }

  async deleteMany(where: any): Promise<any> {
    const beforeCount = this.locks.length;
    this.locks = this.locks.filter(lock => lock.expiresAt >= new Date());
    return { count: beforeCount - this.locks.length };
  }

  async update(where: any, data: any): Promise<any> {
    const item = this.inventory.find(i => i.id === where.id);
    if (item) {
      Object.assign(item, data);
    }
    return item;
  }

  async updateMany(where: any, data: any): Promise<any> {
    const items = this.inventory.filter(item => 
      item.productId === where.productId && 
      item.warehouseId === where.warehouseId
    );
    items.forEach(item => Object.assign(item, data));
    return { count: items.length };
  }

  async findMany(where: any): Promise<any[]> {
    if (where.OR) {
      return this.inventory.filter(item => 
        item.availableQuantity < 0 || item.totalQuantity < 0
      );
    }
    if (where.expiresAt) {
      return this.locks.filter(lock => lock.expiresAt < new Date());
    }
    return this.inventory.filter(item => 
      item.availableQuantity > item.totalQuantity
    );
  }

  async $transaction(callback: (tx: any) => Promise<any>): Promise<any> {
    return callback(this);
  }
}

export class InventoryConsistencyService {
  private db: MockDatabase;
  private lockTimeout = 30000; // 30 seconds
  private maxRetries = 3;

  constructor() {
    this.db = new MockDatabase();
  }

  /**
   * ENHANCED: Acquire inventory lock to prevent race conditions
   */
  async acquireInventoryLock(
    productId: string,
    warehouseId: string,
    quantity: number,
    lockType: 'reservation' | 'adjustment' | 'transfer',
    timeoutMs: number = this.lockTimeout
  ): Promise<InventoryLock | null> {
    try {
      const lockId = `lock_${productId}_${warehouseId}_${Date.now()}`;
      const expiresAt = new Date(Date.now() + timeoutMs);

      // Check if lock already exists
      const existingLock = await this.db.findFirst({
        productId,
        warehouseId,
        expiresAt: { gt: new Date() },
      });

      if (existingLock) {
        consistencyLogger.warn('Inventory lock already exists', {
          productId,
          warehouseId,
          existingLockId: existingLock.id,
        });
        return null;
      }

      // Create new lock
      const lock = await this.db.create({
        id: lockId,
        productId,
        warehouseId,
        quantity,
        lockType,
        expiresAt,
      });

      consistencyLogger.info('Inventory lock acquired', {
        lockId,
        productId,
        warehouseId,
        quantity,
        lockType,
      });

      return lock as InventoryLock;
    } catch (error) {
      consistencyLogger.error('Failed to acquire inventory lock', {
        error,
        productId,
        warehouseId,
        quantity,
      });
      return null;
    }
  }

  /**
   * ENHANCED: Release inventory lock
   */
  async releaseInventoryLock(lockId: string): Promise<boolean> {
    try {
      await this.db.delete({ id: lockId });
      consistencyLogger.info('Inventory lock released', { lockId });
      return true;
    } catch (error) {
      consistencyLogger.error('Failed to release inventory lock', { error, lockId });
      return false;
    }
  }

  /**
   * ENHANCED: Clean up expired locks
   */
  async cleanupExpiredLocks(): Promise<number> {
    try {
      const result = await this.db.deleteMany({
        expiresAt: { lt: new Date() },
      });

      consistencyLogger.info('Expired locks cleaned up', { count: result.count });
      return result.count;
    } catch (error) {
      consistencyLogger.error('Failed to cleanup expired locks', { error });
      return 0;
    }
  }

  /**
   * ENHANCED: Perform inventory transaction with consistency checks
   */
  async performInventoryTransaction(
    operations: Array<{
      type: 'add' | 'remove' | 'adjust' | 'transfer';
      productId: string;
      warehouseId: string;
      quantity: number;
      unitCost?: number;
      reference: {
        type: string;
        id: string;
        notes?: string;
      };
      performedBy: string;
    }>,
    retryCount: number = 0
  ): Promise<TransactionResult> {
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const result: TransactionResult = {
      success: false,
      transactionId,
      changes: [],
      errors: [],
      rollbackRequired: false,
    };

    const acquiredLocks: InventoryLock[] = [];

    try {
      // Acquire locks for all affected inventory items
      for (const operation of operations) {
        const lock = await this.acquireInventoryLock(
          operation.productId,
          operation.warehouseId,
          operation.quantity,
          operation.type === 'transfer' ? 'transfer' : 'adjustment'
        );

        if (!lock) {
          result.errors.push(`Failed to acquire lock for ${operation.productId} in ${operation.warehouseId}`);
          result.rollbackRequired = true;
          break;
        }

        acquiredLocks.push(lock);
      }

      if (result.rollbackRequired) {
        // Release acquired locks
        for (const lock of acquiredLocks) {
          await this.releaseInventoryLock(lock.id);
        }
        return result;
      }

      // Perform transaction
      await this.db.$transaction(async (tx) => {
        for (const operation of operations) {
          // Get current inventory
          const inventory = await tx.findFirst({
            productId: operation.productId,
            warehouseId: operation.warehouseId,
          });

          if (!inventory) {
            throw new Error(`Inventory not found for ${operation.productId} in ${operation.warehouseId}`);
          }

          // Calculate new quantities
          let newAvailableQuantity = inventory.availableQuantity;
          let newTotalQuantity = inventory.totalQuantity;

          switch (operation.type) {
            case 'add':
              newAvailableQuantity += operation.quantity;
              newTotalQuantity += operation.quantity;
              break;
            case 'remove':
              if (newAvailableQuantity < operation.quantity) {
                throw new Error(`Insufficient stock for ${operation.productId}`);
              }
              newAvailableQuantity -= operation.quantity;
              newTotalQuantity -= operation.quantity;
              break;
            case 'adjust':
              newAvailableQuantity = operation.quantity;
              break;
            case 'transfer':
              // Handle transfer logic
              break;
          }

          // Update inventory
          await tx.update(
            { id: inventory.id },
            {
              availableQuantity: newAvailableQuantity,
              totalQuantity: newTotalQuantity,
              updatedAt: new Date(),
            }
          );

          // Record movement
          await tx.create({
            inventoryId: inventory.id,
            type: operation.type,
            quantity: operation.quantity,
            unitCost: operation.unitCost,
            totalCost: operation.unitCost ? operation.quantity * operation.unitCost : undefined,
            reference: operation.reference,
            performedBy: operation.performedBy,
          });

          result.changes.push({
            productId: operation.productId,
            warehouseId: operation.warehouseId,
            oldQuantity: inventory.availableQuantity,
            newQuantity: newAvailableQuantity,
            operation: operation.type,
          });
        }
      });

      result.success = true;

      consistencyLogger.info('Inventory transaction completed', {
        transactionId,
        operationCount: operations.length,
        changes: result.changes.length,
      });

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.rollbackRequired = true;

      consistencyLogger.error('Inventory transaction failed', {
        transactionId,
        error,
        retryCount,
      });

      // Retry logic
      if (retryCount < this.maxRetries) {
        consistencyLogger.info('Retrying inventory transaction', {
          transactionId,
          retryCount: retryCount + 1,
        });

        return this.performInventoryTransaction(operations, retryCount + 1);
      }
    } finally {
      // Release all locks
      for (const lock of acquiredLocks) {
        await this.releaseInventoryLock(lock.id);
      }
    }

    return result;
  }

  /**
   * ENHANCED: Check inventory consistency
   */
  async checkInventoryConsistency(): Promise<ConsistencyCheck> {
    const result: ConsistencyCheck = {
      isValid: true,
      errors: [],
      warnings: [],
      discrepancies: [],
    };

    try {
      // Check for negative quantities
      const negativeQuantities = await this.db.findMany({
        OR: [
          { availableQuantity: { lt: 0 } },
          { totalQuantity: { lt: 0 } },
        ],
      });

      if (negativeQuantities.length > 0) {
        result.isValid = false;
        result.errors.push(`Found ${negativeQuantities.length} items with negative quantities`);
        
        for (const item of negativeQuantities) {
          result.discrepancies.push({
            productId: item.productId,
            warehouseId: item.warehouseId,
            expectedQuantity: 0,
            actualQuantity: item.availableQuantity,
            difference: Math.abs(item.availableQuantity),
            type: 'shortage',
          });
        }
      }

      // Check for quantity mismatches (available > total)
      const quantityMismatches = await this.db.findMany({
        availableQuantity: { gt: 'totalQuantity' },
      });

      if (quantityMismatches.length > 0) {
        result.warnings.push(`Found ${quantityMismatches.length} items with available > total quantity`);
        
        for (const item of quantityMismatches) {
          result.discrepancies.push({
            productId: item.productId,
            warehouseId: item.warehouseId,
            expectedQuantity: item.totalQuantity,
            actualQuantity: item.availableQuantity,
            difference: item.availableQuantity - item.totalQuantity,
            type: 'excess',
          });
        }
      }

      // Check for expired locks
      const expiredLocks = await this.db.findMany({
        expiresAt: { lt: new Date() },
      });

      if (expiredLocks.length > 0) {
        result.warnings.push(`Found ${expiredLocks.length} expired inventory locks`);
      }

      consistencyLogger.info('Inventory consistency check completed', {
        isValid: result.isValid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        discrepancyCount: result.discrepancies.length,
      });

      return result;
    } catch (error) {
      consistencyLogger.error('Inventory consistency check failed', { error });
      result.isValid = false;
      result.errors.push('Consistency check failed due to system error');
      return result;
    }
  }

  /**
   * ENHANCED: Fix inventory discrepancies
   */
  async fixInventoryDiscrepancies(discrepancies: InventoryDiscrepancy[]): Promise<{
    success: boolean;
    fixed: number;
    errors: string[];
  }> {
    const result = {
      success: true,
      fixed: 0,
      errors: [] as string[],
    };

    try {
      for (const discrepancy of discrepancies) {
        try {
          await this.db.updateMany(
            {
              productId: discrepancy.productId,
              warehouseId: discrepancy.warehouseId,
            },
            {
              availableQuantity: discrepancy.expectedQuantity,
              updatedAt: new Date(),
            }
          );

          // Record adjustment movement
          await this.db.create({
            inventoryId: discrepancy.productId,
            type: 'adjustment',
            quantity: discrepancy.difference,
            reference: {
              type: 'consistency_fix',
              id: `fix_${Date.now()}`,
              notes: `Automatic fix for ${discrepancy.type} discrepancy`,
            },
            performedBy: 'system',
          });

          result.fixed++;
        } catch (error) {
          result.errors.push(`Failed to fix discrepancy for ${discrepancy.productId}: ${error}`);
        }
      }

      consistencyLogger.info('Inventory discrepancies fixed', {
        total: discrepancies.length,
        fixed: result.fixed,
        errors: result.errors.length,
      });

      return result;
    } catch (error) {
      consistencyLogger.error('Failed to fix inventory discrepancies', { error });
      result.success = false;
      result.errors.push('Failed to fix discrepancies due to system error');
      return result;
    }
  }

  /**
   * ENHANCED: Get inventory audit trail
   */
  async getInventoryAuditTrail(
    productId: string,
    warehouseId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    try {
      // Mock implementation
      const movements = [
        {
          id: 'mock_movement_1',
          inventoryId: 'mock_inventory_1',
          type: 'add',
          quantity: 100,
          createdAt: new Date(),
          reference: { type: 'purchase_order', id: 'PO-001' },
          performedBy: 'system',
        },
      ];

      consistencyLogger.info('Inventory audit trail retrieved', {
        productId,
        warehouseId,
        movementCount: movements.length,
        dateRange: { startDate, endDate },
      });

      return movements;
    } catch (error) {
      consistencyLogger.error('Failed to get inventory audit trail', { error });
      return [];
    }
  }
}

// Export singleton instance
export const inventoryConsistencyService = new InventoryConsistencyService();