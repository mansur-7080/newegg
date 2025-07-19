import { createClient, RedisClientType } from 'redis';
import { logger } from '../logging/logger';
import { connectionPool } from '../database/connection-pool';

interface InventoryLockOptions {
  timeout?: number; // Lock timeout in milliseconds
  retries?: number; // Number of retry attempts
  retryDelay?: number; // Delay between retries in milliseconds
}

interface LockResult {
  success: boolean;
  lockId?: string;
  error?: string;
}

interface InventoryOperation {
  productId: string;
  quantityChange: number; // Positive for add, negative for subtract
  orderId?: string;
  userId?: string;
}

class InventoryLockService {
  private static instance: InventoryLockService;
  private redisClient: RedisClientType;
  private activeLocks = new Map<string, { lockId: string; expires: number }>();
  private lockCounter = 0;

  private constructor() {
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
        lazyConnect: true,
      },
    });

    this.setupRedisHandlers();
  }

  static getInstance(): InventoryLockService {
    if (!InventoryLockService.instance) {
      InventoryLockService.instance = new InventoryLockService();
    }
    return InventoryLockService.instance;
  }

  private setupRedisHandlers(): void {
    this.redisClient.on('error', (error) => {
      logger.error('Redis connection error in InventoryLockService:', error);
    });

    this.redisClient.on('connect', () => {
      logger.info('InventoryLockService connected to Redis');
    });
  }

  private async ensureRedisConnection(): Promise<void> {
    if (!this.redisClient.isOpen) {
      await this.redisClient.connect();
    }
  }

  /**
   * Acquire a distributed lock for inventory operations
   */
  async acquireInventoryLock(
    productId: string,
    options: InventoryLockOptions = {}
  ): Promise<LockResult> {
    const {
      timeout = 30000, // 30 seconds default
      retries = 3,
      retryDelay = 100,
    } = options;

    const lockKey = `inventory_lock:${productId}`;
    const lockId = `lock_${++this.lockCounter}_${Date.now()}_${Math.random()}`;
    const expires = Date.now() + timeout;

    try {
      await this.ensureRedisConnection();

      for (let attempt = 1; attempt <= retries; attempt++) {
        // Try to acquire lock with SET NX EX (atomic operation)
        const result = await this.redisClient.set(
          lockKey,
          lockId,
          {
            NX: true, // Only set if key doesn't exist
            EX: Math.ceil(timeout / 1000), // Expire in seconds
          }
        );

        if (result === 'OK') {
          this.activeLocks.set(productId, { lockId, expires });
          
          logger.debug(`Inventory lock acquired for product: ${productId}`, {
            lockId,
            attempt,
            timeout,
          });

          return { success: true, lockId };
        }

        if (attempt < retries) {
          // Exponential backoff with jitter
          const delay = retryDelay * Math.pow(2, attempt - 1) + Math.random() * 100;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          logger.debug(`Lock acquisition failed, retrying... (${attempt}/${retries})`, {
            productId,
            delay,
          });
        }
      }

      return {
        success: false,
        error: `Failed to acquire lock for product ${productId} after ${retries} attempts`,
      };

    } catch (error) {
      logger.error(`Error acquiring inventory lock for product: ${productId}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        lockId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Release a distributed lock for inventory operations
   */
  async releaseInventoryLock(productId: string, lockId: string): Promise<boolean> {
    const lockKey = `inventory_lock:${productId}`;

    try {
      await this.ensureRedisConnection();

      // Use Lua script for atomic release (only release if we own the lock)
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.redisClient.eval(luaScript, {
        keys: [lockKey],
        arguments: [lockId],
      }) as number;

      if (result === 1) {
        this.activeLocks.delete(productId);
        logger.debug(`Inventory lock released for product: ${productId}`, {
          lockId,
        });
        return true;
      } else {
        logger.warn(`Failed to release lock - not owner or already expired`, {
          productId,
          lockId,
        });
        return false;
      }

    } catch (error) {
      logger.error(`Error releasing inventory lock for product: ${productId}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        lockId,
      });
      return false;
    }
  }

  /**
   * Execute inventory operation with automatic locking
   */
  async executeWithLock<T>(
    productId: string,
    operation: () => Promise<T>,
    options: InventoryLockOptions = {}
  ): Promise<T> {
    const lockResult = await this.acquireInventoryLock(productId, options);
    
    if (!lockResult.success) {
      throw new Error(`Cannot acquire inventory lock: ${lockResult.error}`);
    }

    const lockId = lockResult.lockId!;

    try {
      const result = await operation();
      return result;
    } finally {
      await this.releaseInventoryLock(productId, lockId);
    }
  }

  /**
   * Perform atomic inventory update with concurrency control
   */
  async atomicInventoryUpdate(operations: InventoryOperation[]): Promise<{
    success: boolean;
    results: Array<{ productId: string; success: boolean; newQuantity?: number; error?: string }>;
  }> {
    // Sort operations by productId to prevent deadlocks
    const sortedOps = [...operations].sort((a, b) => a.productId.localeCompare(b.productId));
    const lockIds: Array<{ productId: string; lockId: string }> = [];
    const results: Array<{ productId: string; success: boolean; newQuantity?: number; error?: string }> = [];

    try {
      // Acquire all locks first
      for (const operation of sortedOps) {
        const lockResult = await this.acquireInventoryLock(operation.productId, {
          timeout: 15000, // Shorter timeout for batch operations
          retries: 2,
        });

        if (!lockResult.success) {
          throw new Error(`Failed to acquire lock for product ${operation.productId}: ${lockResult.error}`);
        }

        lockIds.push({ productId: operation.productId, lockId: lockResult.lockId! });
      }

      // Perform all operations in a transaction
      const transactionResult = await connectionPool.executeWithConnection(async (prisma) => {
        return await prisma.$transaction(async (tx) => {
          const opResults = [];

          for (const operation of sortedOps) {
            try {
              // First, check current inventory
              const currentInventory = await tx.inventory.findUnique({
                where: { productId: operation.productId },
                select: { quantity: true, reservedQuantity: true },
              });

              if (!currentInventory) {
                opResults.push({
                  productId: operation.productId,
                  success: false,
                  error: 'Product not found in inventory',
                });
                continue;
              }

              const availableQuantity = currentInventory.quantity - currentInventory.reservedQuantity;

              // Check if operation is valid
              if (operation.quantityChange < 0 && availableQuantity < Math.abs(operation.quantityChange)) {
                opResults.push({
                  productId: operation.productId,
                  success: false,
                  error: `Insufficient inventory. Available: ${availableQuantity}, Requested: ${Math.abs(operation.quantityChange)}`,
                });
                continue;
              }

              // Update inventory atomically
              const updatedInventory = await tx.inventory.update({
                where: { productId: operation.productId },
                data: {
                  quantity: {
                    increment: operation.quantityChange,
                  },
                  lastUpdated: new Date(),
                  ...(operation.orderId && {
                    lastOrderId: operation.orderId,
                  }),
                },
                select: { quantity: true },
              });

              // Log inventory change
              await tx.inventoryLog.create({
                data: {
                  productId: operation.productId,
                  changeType: operation.quantityChange > 0 ? 'INCREASE' : 'DECREASE',
                  quantityChange: Math.abs(operation.quantityChange),
                  newQuantity: updatedInventory.quantity,
                  reason: operation.orderId ? 'ORDER' : 'MANUAL',
                  orderId: operation.orderId,
                  userId: operation.userId,
                  timestamp: new Date(),
                },
              });

              opResults.push({
                productId: operation.productId,
                success: true,
                newQuantity: updatedInventory.quantity,
              });

            } catch (error) {
              opResults.push({
                productId: operation.productId,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }

          return opResults;
        }, {
          isolationLevel: 'Serializable', // Highest isolation level
          timeout: 10000, // 10 second timeout
        });
      });

      results.push(...transactionResult);

      const allSuccessful = results.every(r => r.success);
      
      if (allSuccessful) {
        logger.info(`Atomic inventory update successful`, {
          operationsCount: operations.length,
          productIds: operations.map(op => op.productId),
        });
      } else {
        logger.warn(`Some inventory operations failed`, {
          total: operations.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
        });
      }

      return {
        success: allSuccessful,
        results,
      };

    } catch (error) {
      logger.error(`Atomic inventory update failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        operationsCount: operations.length,
        productIds: operations.map(op => op.productId),
      });

      // Add error results for any operations that didn't get processed
      for (const operation of sortedOps) {
        if (!results.find(r => r.productId === operation.productId)) {
          results.push({
            productId: operation.productId,
            success: false,
            error: 'Transaction failed',
          });
        }
      }

      return {
        success: false,
        results,
      };

    } finally {
      // Always release all locks
      for (const { productId, lockId } of lockIds) {
        await this.releaseInventoryLock(productId, lockId);
      }
    }
  }

  /**
   * Clean up expired locks
   */
  async cleanupExpiredLocks(): Promise<number> {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [productId, lockInfo] of this.activeLocks) {
      if (now > lockInfo.expires) {
        await this.releaseInventoryLock(productId, lockInfo.lockId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired inventory locks`);
    }

    return cleanedCount;
  }

  /**
   * Get lock status for monitoring
   */
  getLockStats() {
    return {
      activeLocks: this.activeLocks.size,
      lockDetails: Array.from(this.activeLocks.entries()).map(([productId, info]) => ({
        productId,
        lockId: info.lockId,
        expiresAt: new Date(info.expires).toISOString(),
        timeRemaining: Math.max(0, info.expires - Date.now()),
      })),
    };
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown(): Promise<void> {
    logger.info('Starting InventoryLockService shutdown...');

    // Clean up all active locks
    const lockPromises = Array.from(this.activeLocks.entries()).map(
      ([productId, lockInfo]) => this.releaseInventoryLock(productId, lockInfo.lockId)
    );

    await Promise.allSettled(lockPromises);

    // Close Redis connection
    if (this.redisClient.isOpen) {
      await this.redisClient.quit();
    }

    logger.info('InventoryLockService shutdown completed');
  }
}

// Export singleton instance
export const inventoryLockService = InventoryLockService.getInstance();
export { InventoryLockService, InventoryOperation, LockResult };