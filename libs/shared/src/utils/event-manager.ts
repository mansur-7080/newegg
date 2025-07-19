import { EventEmitter } from 'events';
import { logger } from '../logging/logger';

interface EventListenerInfo {
  id: string;
  emitter: EventEmitter | NodeJS.Process;
  event: string;
  listener: (...args: any[]) => void;
  createdAt: Date;
  source?: string; // Source file or component that created the listener
}

class EventManager {
  private static instance: EventManager;
  private listeners = new Map<string, EventListenerInfo>();
  private listenerCounter = 0;
  private cleanupCallbacks = new Set<() => Promise<void> | void>();

  private constructor() {
    this.setupProcessListeners();
  }

  static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  private setupProcessListeners(): void {
    // Track process shutdown signals for cleanup
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Cleaning up event listeners...`);
      await this.cleanupAll();
    };

    process.once('SIGINT', () => gracefulShutdown('SIGINT'));
    process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.once('beforeExit', () => gracefulShutdown('beforeExit'));
  }

  /**
   * Register an event listener with automatic cleanup tracking
   */
  registerListener<T extends EventEmitter | NodeJS.Process>(
    emitter: T,
    event: string,
    listener: (...args: any[]) => void,
    source?: string
  ): string {
    const id = `listener_${++this.listenerCounter}_${Date.now()}`;
    
    const listenerInfo: EventListenerInfo = {
      id,
      emitter,
      event,
      listener,
      createdAt: new Date(),
      source: source || this.getCallerInfo(),
    };

    this.listeners.set(id, listenerInfo);
    emitter.on(event, listener);

    logger.debug(`Event listener registered: ${event}`, {
      id,
      source: listenerInfo.source,
      totalListeners: this.listeners.size,
    });

    return id;
  }

  /**
   * Register a one-time event listener with automatic cleanup tracking
   */
  registerOnceListener<T extends EventEmitter | NodeJS.Process>(
    emitter: T,
    event: string,
    listener: (...args: any[]) => void,
    source?: string
  ): string {
    const id = `once_listener_${++this.listenerCounter}_${Date.now()}`;
    
    const wrappedListener = (...args: any[]) => {
      // Auto-cleanup after execution
      this.removeListener(id);
      listener(...args);
    };

    const listenerInfo: EventListenerInfo = {
      id,
      emitter,
      event,
      listener: wrappedListener,
      createdAt: new Date(),
      source: source || this.getCallerInfo(),
    };

    this.listeners.set(id, listenerInfo);
    emitter.once(event, wrappedListener);

    logger.debug(`One-time event listener registered: ${event}`, {
      id,
      source: listenerInfo.source,
    });

    return id;
  }

  /**
   * Remove a specific event listener
   */
  removeListener(id: string): boolean {
    const listenerInfo = this.listeners.get(id);
    
    if (!listenerInfo) {
      logger.warn(`Attempted to remove non-existent listener: ${id}`);
      return false;
    }

    try {
      listenerInfo.emitter.removeListener(listenerInfo.event, listenerInfo.listener);
      this.listeners.delete(id);

      logger.debug(`Event listener removed: ${listenerInfo.event}`, {
        id,
        source: listenerInfo.source,
        activeTime: Date.now() - listenerInfo.createdAt.getTime(),
        remainingListeners: this.listeners.size,
      });

      return true;
    } catch (error) {
      logger.error(`Error removing event listener: ${id}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        event: listenerInfo.event,
      });
      return false;
    }
  }

  /**
   * Remove all listeners for a specific emitter
   */
  removeListenersByEmitter(emitter: EventEmitter | NodeJS.Process): number {
    let removedCount = 0;
    
    for (const [id, listenerInfo] of this.listeners) {
      if (listenerInfo.emitter === emitter) {
        if (this.removeListener(id)) {
          removedCount++;
        }
      }
    }

    logger.info(`Removed ${removedCount} listeners for emitter`);
    return removedCount;
  }

  /**
   * Remove all listeners for a specific event
   */
  removeListenersByEvent(event: string): number {
    let removedCount = 0;
    
    for (const [id, listenerInfo] of this.listeners) {
      if (listenerInfo.event === event) {
        if (this.removeListener(id)) {
          removedCount++;
        }
      }
    }

    logger.info(`Removed ${removedCount} listeners for event: ${event}`);
    return removedCount;
  }

  /**
   * Get information about registered listeners
   */
  getListenerStats() {
    const stats = {
      total: this.listeners.size,
      byEvent: new Map<string, number>(),
      bySource: new Map<string, number>(),
      oldest: null as Date | null,
      newest: null as Date | null,
    };

    for (const listenerInfo of this.listeners.values()) {
      // Count by event
      const eventCount = stats.byEvent.get(listenerInfo.event) || 0;
      stats.byEvent.set(listenerInfo.event, eventCount + 1);

      // Count by source
      const source = listenerInfo.source || 'unknown';
      const sourceCount = stats.bySource.get(source) || 0;
      stats.bySource.set(source, sourceCount + 1);

      // Track oldest and newest
      if (!stats.oldest || listenerInfo.createdAt < stats.oldest) {
        stats.oldest = listenerInfo.createdAt;
      }
      if (!stats.newest || listenerInfo.createdAt > stats.newest) {
        stats.newest = listenerInfo.createdAt;
      }
    }

    return stats;
  }

  /**
   * Check for potential memory leaks (too many listeners)
   */
  checkForMemoryLeaks(): { hasLeaks: boolean; warnings: string[] } {
    const warnings: string[] = [];
    const stats = this.getListenerStats();

    // Check total listener count
    if (stats.total > 100) {
      warnings.push(`High total listener count: ${stats.total}`);
    }

    // Check for too many listeners on the same event
    for (const [event, count] of stats.byEvent) {
      if (count > 10) {
        warnings.push(`High listener count for event '${event}': ${count}`);
      }
    }

    // Check for old listeners (potential leaks)
    const now = new Date();
    for (const [id, listenerInfo] of this.listeners) {
      const age = now.getTime() - listenerInfo.createdAt.getTime();
      const ageHours = age / (1000 * 60 * 60);
      
      if (ageHours > 24) {
        warnings.push(
          `Old listener detected: ${listenerInfo.event} (${ageHours.toFixed(1)} hours old)`
        );
      }
    }

    return {
      hasLeaks: warnings.length > 0,
      warnings,
    };
  }

  /**
   * Register a cleanup callback for graceful shutdown
   */
  registerCleanupCallback(callback: () => Promise<void> | void): void {
    this.cleanupCallbacks.add(callback);
  }

  /**
   * Clean up all registered listeners and callbacks
   */
  async cleanupAll(): Promise<void> {
    logger.info(`Starting cleanup of ${this.listeners.size} event listeners...`);
    
    const startTime = Date.now();
    let removedCount = 0;

    // Remove all listeners
    for (const id of Array.from(this.listeners.keys())) {
      if (this.removeListener(id)) {
        removedCount++;
      }
    }

    // Execute cleanup callbacks
    const cleanupPromises = Array.from(this.cleanupCallbacks).map(async (callback) => {
      try {
        await callback();
      } catch (error) {
        logger.error('Error executing cleanup callback', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    await Promise.allSettled(cleanupPromises);
    this.cleanupCallbacks.clear();

    const duration = Date.now() - startTime;
    logger.info(`Event cleanup completed`, {
      removedListeners: removedCount,
      cleanupCallbacks: cleanupPromises.length,
      duration: `${duration}ms`,
    });
  }

  private getCallerInfo(): string {
    try {
      const stack = new Error().stack;
      if (stack) {
        const lines = stack.split('\n');
        // Skip the first few lines (Error, this function, registerListener)
        for (let i = 3; i < Math.min(lines.length, 8); i++) {
          const line = lines[i];
          if (line && !line.includes('event-manager.ts') && !line.includes('node_modules')) {
            const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
            if (match) {
              const [, func, file, line, col] = match;
              const fileName = file.split('/').pop();
              return `${func} (${fileName}:${line})`;
            }
          }
        }
      }
    } catch {
      // Ignore errors in getting caller info
    }
    return 'unknown';
  }
}

// Export singleton instance
export const eventManager = EventManager.getInstance();

// Convenience functions
export const registerEventListener = <T extends EventEmitter | NodeJS.Process>(
  emitter: T,
  event: string,
  listener: (...args: any[]) => void,
  source?: string
): string => eventManager.registerListener(emitter, event, listener, source);

export const registerOnceEventListener = <T extends EventEmitter | NodeJS.Process>(
  emitter: T,
  event: string,
  listener: (...args: any[]) => void,
  source?: string
): string => eventManager.registerOnceListener(emitter, event, listener, source);

export const removeEventListener = (id: string): boolean => eventManager.removeListener(id);

export const getEventListenerStats = () => eventManager.getListenerStats();

export const checkEventMemoryLeaks = () => eventManager.checkForMemoryLeaks();