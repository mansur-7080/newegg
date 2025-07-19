import { logger } from '../logging/logger';
import { eventManager } from '../utils/event-manager';
import { connectionPool } from '../database/connection-pool';
import { inventoryLockService } from '../services/inventory-lock.service';

interface ShutdownTask {
  name: string;
  priority: number; // Lower number = higher priority
  timeout?: number; // Task-specific timeout in ms
  task: () => Promise<void> | void;
}

interface ShutdownOptions {
  gracefulTimeout?: number; // Maximum time to wait for graceful shutdown
  forceTimeout?: number; // Time before force exit
  allowForceExit?: boolean; // Allow process.exit() as last resort
}

class GracefulShutdownManager {
  private static instance: GracefulShutdownManager;
  private tasks: ShutdownTask[] = [];
  private shutdownInProgress = false;
  private shutdownPromise: Promise<void> | null = null;
  private activeOperations = new Set<string>();
  private shutdownStartTime = 0;

  private constructor() {
    this.registerBuiltinTasks();
    this.setupSignalHandlers();
  }

  static getInstance(): GracefulShutdownManager {
    if (!GracefulShutdownManager.instance) {
      GracefulShutdownManager.instance = new GracefulShutdownManager();
    }
    return GracefulShutdownManager.instance;
  }

  private registerBuiltinTasks(): void {
    // Register core cleanup tasks with priorities
    this.registerTask({
      name: 'stop-accepting-new-requests',
      priority: 1,
      timeout: 1000,
      task: async () => {
        // This would typically involve stopping HTTP servers from accepting new connections
        logger.info('Stopped accepting new requests');
      },
    });

    this.registerTask({
      name: 'wait-for-active-operations',
      priority: 2,
      timeout: 15000,
      task: async () => {
        const maxWaitTime = 15000;
        const startTime = Date.now();
        
        while (this.activeOperations.size > 0 && (Date.now() - startTime) < maxWaitTime) {
          logger.info(`Waiting for ${this.activeOperations.size} active operations to complete...`, {
            operations: Array.from(this.activeOperations),
          });
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (this.activeOperations.size > 0) {
          logger.warn(`Forcing shutdown with ${this.activeOperations.size} operations still active`, {
            operations: Array.from(this.activeOperations),
          });
        } else {
          logger.info('All active operations completed successfully');
        }
      },
    });

    this.registerTask({
      name: 'cleanup-inventory-locks',
      priority: 3,
      timeout: 5000,
      task: async () => {
        await inventoryLockService.gracefulShutdown();
      },
    });

    this.registerTask({
      name: 'cleanup-event-listeners',
      priority: 4,
      timeout: 5000,
      task: async () => {
        await eventManager.cleanupAll();
      },
    });

    this.registerTask({
      name: 'close-database-connections',
      priority: 5,
      timeout: 10000,
      task: async () => {
        await connectionPool.gracefulShutdown();
      },
    });

    this.registerTask({
      name: 'flush-logs',
      priority: 6,
      timeout: 2000,
      task: async () => {
        // Ensure all logs are written
        logger.info('Flushing final logs before shutdown');
        await new Promise(resolve => setTimeout(resolve, 500)); // Give time for log flush
      },
    });
  }

  private setupSignalHandlers(): void {
    // Handle different shutdown signals
    const gracefulSignals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
    const immediateSignals: NodeJS.Signals[] = ['SIGQUIT', 'SIGUSR2'];

    gracefulSignals.forEach(signal => {
      process.once(signal, () => {
        logger.info(`Received ${signal}. Starting graceful shutdown...`);
        this.initiateGracefulShutdown(signal);
      });
    });

    immediateSignals.forEach(signal => {
      process.once(signal, () => {
        logger.warn(`Received ${signal}. Starting immediate shutdown...`);
        this.initiateGracefulShutdown(signal, { gracefulTimeout: 5000, forceTimeout: 10000 });
      });
    });

    // Handle uncaught exceptions and unhandled rejections
    process.once('uncaughtException', (error) => {
      logger.error('Uncaught exception, initiating emergency shutdown', {
        error: error.message,
        stack: error.stack,
      });
      this.initiateGracefulShutdown('uncaughtException', { 
        gracefulTimeout: 3000, 
        forceTimeout: 5000, 
        allowForceExit: true 
      });
    });

    process.once('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection, initiating emergency shutdown', {
        reason: reason instanceof Error ? reason.message : String(reason),
        promise: promise,
      });
      this.initiateGracefulShutdown('unhandledRejection', { 
        gracefulTimeout: 3000, 
        forceTimeout: 5000, 
        allowForceExit: true 
      });
    });
  }

  /**
   * Register a custom shutdown task
   */
  registerTask(task: ShutdownTask): void {
    if (this.shutdownInProgress) {
      logger.warn(`Cannot register task '${task.name}' - shutdown already in progress`);
      return;
    }

    // Check for duplicate names
    const existingTask = this.tasks.find(t => t.name === task.name);
    if (existingTask) {
      logger.warn(`Task '${task.name}' already registered, replacing it`);
      this.tasks = this.tasks.filter(t => t.name !== task.name);
    }

    this.tasks.push(task);
    this.tasks.sort((a, b) => a.priority - b.priority);

    logger.debug(`Registered shutdown task: ${task.name}`, {
      priority: task.priority,
      timeout: task.timeout,
      totalTasks: this.tasks.length,
    });
  }

  /**
   * Remove a shutdown task
   */
  removeTask(name: string): boolean {
    const initialCount = this.tasks.length;
    this.tasks = this.tasks.filter(task => task.name !== name);
    
    if (this.tasks.length < initialCount) {
      logger.debug(`Removed shutdown task: ${name}`);
      return true;
    }
    
    return false;
  }

  /**
   * Track an active operation
   */
  trackOperation(operationId: string): void {
    this.activeOperations.add(operationId);
    logger.debug(`Tracking operation: ${operationId}`, {
      totalOperations: this.activeOperations.size,
    });
  }

  /**
   * Complete an active operation
   */
  completeOperation(operationId: string): void {
    const wasTracked = this.activeOperations.delete(operationId);
    if (wasTracked) {
      logger.debug(`Completed operation: ${operationId}`, {
        remainingOperations: this.activeOperations.size,
      });
    }
  }

  /**
   * Execute operation with automatic tracking
   */
  async executeTrackedOperation<T>(
    operationId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    this.trackOperation(operationId);
    try {
      const result = await operation();
      return result;
    } finally {
      this.completeOperation(operationId);
    }
  }

  /**
   * Initiate graceful shutdown
   */
  async initiateGracefulShutdown(
    trigger: string,
    options: ShutdownOptions = {}
  ): Promise<void> {
    if (this.shutdownInProgress) {
      logger.info(`Shutdown already in progress, waiting for existing shutdown...`);
      return this.shutdownPromise || Promise.resolve();
    }

    this.shutdownInProgress = true;
    this.shutdownStartTime = Date.now();

    const {
      gracefulTimeout = 30000, // 30 seconds default
      forceTimeout = 45000, // 45 seconds default
      allowForceExit = false,
    } = options;

    logger.info(`Starting graceful shutdown triggered by: ${trigger}`, {
      gracefulTimeout,
      forceTimeout,
      totalTasks: this.tasks.length,
      activeOperations: this.activeOperations.size,
    });

    this.shutdownPromise = this.performGracefulShutdown(gracefulTimeout, forceTimeout, allowForceExit);
    
    return this.shutdownPromise;
  }

  private async performGracefulShutdown(
    gracefulTimeout: number,
    forceTimeout: number,
    allowForceExit: boolean
  ): Promise<void> {
    const shutdownId = `shutdown_${Date.now()}`;
    
    try {
      // Set up force exit timeout if allowed
      let forceExitTimer: NodeJS.Timeout | null = null;
      if (allowForceExit && forceTimeout > 0) {
        forceExitTimer = setTimeout(() => {
          logger.error(`Force exit after ${forceTimeout}ms timeout`);
          process.exit(1);
        }, forceTimeout);
      }

      // Create graceful shutdown timeout
      const shutdownPromise = this.executeTasks();
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Graceful shutdown timeout after ${gracefulTimeout}ms`));
        }, gracefulTimeout);
      });

      try {
        await Promise.race([shutdownPromise, timeoutPromise]);
        logger.info('Graceful shutdown completed successfully', {
          duration: Date.now() - this.shutdownStartTime,
          shutdownId,
        });
      } catch (error) {
        logger.error('Graceful shutdown failed or timed out', {
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - this.shutdownStartTime,
          shutdownId,
        });
      }

      // Clear force exit timer
      if (forceExitTimer) {
        clearTimeout(forceExitTimer);
      }

      // Final exit
      logger.info('Process exiting gracefully');
      process.exit(0);

    } catch (error) {
      logger.error('Critical error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
        shutdownId,
      });
      
      if (allowForceExit) {
        process.exit(1);
      }
      throw error;
    }
  }

  private async executeTasks(): Promise<void> {
    logger.info(`Executing ${this.tasks.length} shutdown tasks...`);

    for (const task of this.tasks) {
      const taskStartTime = Date.now();
      const taskTimeout = task.timeout || 10000; // Default 10 second timeout per task

      try {
        logger.debug(`Executing shutdown task: ${task.name}`, {
          priority: task.priority,
          timeout: taskTimeout,
        });

        // Create task timeout promise
        const taskPromise = Promise.resolve(task.task());
        const timeoutPromise = new Promise<void>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Task '${task.name}' timed out after ${taskTimeout}ms`));
          }, taskTimeout);
        });

        await Promise.race([taskPromise, timeoutPromise]);

        const taskDuration = Date.now() - taskStartTime;
        logger.debug(`Completed shutdown task: ${task.name}`, {
          duration: taskDuration,
        });

      } catch (error) {
        const taskDuration = Date.now() - taskStartTime;
        logger.error(`Failed to execute shutdown task: ${task.name}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: taskDuration,
          priority: task.priority,
        });

        // Continue with other tasks even if one fails
        continue;
      }
    }

    logger.info('All shutdown tasks completed', {
      totalDuration: Date.now() - this.shutdownStartTime,
    });
  }

  /**
   * Get shutdown status for monitoring
   */
  getShutdownStatus() {
    return {
      shutdownInProgress: this.shutdownInProgress,
      shutdownStartTime: this.shutdownStartTime ? new Date(this.shutdownStartTime).toISOString() : null,
      activeOperations: Array.from(this.activeOperations),
      registeredTasks: this.tasks.map(task => ({
        name: task.name,
        priority: task.priority,
        timeout: task.timeout,
      })),
      isShuttingDown: this.shutdownInProgress,
    };
  }

  /**
   * Health check method
   */
  isHealthy(): boolean {
    // Service is unhealthy if shutdown is in progress
    return !this.shutdownInProgress;
  }
}

// Export singleton instance
export const gracefulShutdown = GracefulShutdownManager.getInstance();

// Convenience functions
export const registerShutdownTask = (task: ShutdownTask): void => 
  gracefulShutdown.registerTask(task);

export const trackOperation = (operationId: string): void => 
  gracefulShutdown.trackOperation(operationId);

export const completeOperation = (operationId: string): void => 
  gracefulShutdown.completeOperation(operationId);

export const executeTrackedOperation = async <T>(
  operationId: string,
  operation: () => Promise<T>
): Promise<T> => gracefulShutdown.executeTrackedOperation(operationId, operation);

export { GracefulShutdownManager, ShutdownTask, ShutdownOptions };