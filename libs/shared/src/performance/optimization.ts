/**
 * Performance Optimization Utilities
 * Advanced performance monitoring and optimization tools for UltraMarket
 */

import { performance } from 'perf_hooks';
import { logger } from '../logging/logger';

// =================== PERFORMANCE METRICS TYPES ===================

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  memoryUsage: number;
}

export interface DatabaseMetrics {
  queryCount: number;
  slowQueries: number;
  averageQueryTime: number;
  connectionPoolUsage: number;
  activeConnections: number;
}

export interface ApiMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  throughput: number;
  statusCodes: Record<string, number>;
}

// =================== PERFORMANCE MONITORING ===================

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private cacheMetrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    memoryUsage: 0,
  };
  private databaseMetrics: DatabaseMetrics = {
    queryCount: 0,
    slowQueries: 0,
    averageQueryTime: 0,
    connectionPoolUsage: 0,
    activeConnections: 0,
  };
  private apiMetrics: ApiMetrics = {
    requestCount: 0,
    averageResponseTime: 0,
    errorRate: 0,
    throughput: 0,
    statusCodes: {},
  };

  /**
   * Measure function execution time
   */
  async measure<T>(
    operation: string,
    fn: () => Promise<T> | T,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    try {
      const result = await fn();
      const endTime = performance.now();
      const endMemory = process.memoryUsage();

      const metric: PerformanceMetrics = {
        operation,
        duration: endTime - startTime,
        memoryUsage: {
          rss: endMemory.rss - startMemory.rss,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external,
          arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
        },
        timestamp: new Date(),
        metadata,
      };

      this.metrics.push(metric);

      // Log slow operations
      if (metric.duration > 1000) {
        logger.warn('Slow operation detected', {
          operation,
          duration: `${metric.duration}ms`,
          memoryUsage: metric.memoryUsage,
        });
      }

      return result;
    } catch (error) {
      const endTime = performance.now();
      logger.error('Operation failed', {
        operation,
        duration: endTime - startTime,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Record cache hit
   */
  recordCacheHit(): void {
    this.cacheMetrics.hits++;
    this.updateCacheHitRate();
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(): void {
    this.cacheMetrics.misses++;
    this.updateCacheHitRate();
  }

  /**
   * Update cache hit rate
   */
  private updateCacheHitRate(): void {
    const total = this.cacheMetrics.hits + this.cacheMetrics.misses;
    this.cacheMetrics.hitRate = total > 0 ? this.cacheMetrics.hits / total : 0;
  }

  /**
   * Record database query
   */
  recordDatabaseQuery(duration: number, isSlow: boolean = false): void {
    this.databaseMetrics.queryCount++;
    
    if (isSlow) {
      this.databaseMetrics.slowQueries++;
    }

    // Update average query time
    const totalTime = this.databaseMetrics.averageQueryTime * (this.databaseMetrics.queryCount - 1) + duration;
    this.databaseMetrics.averageQueryTime = totalTime / this.databaseMetrics.queryCount;
  }

  /**
   * Record API request
   */
  recordApiRequest(duration: number, statusCode: number, isError: boolean = false): void {
    this.apiMetrics.requestCount++;
    
    if (isError) {
      this.apiMetrics.errorRate = (this.apiMetrics.errorRate * (this.apiMetrics.requestCount - 1) + 1) / this.apiMetrics.requestCount;
    }

    // Update average response time
    const totalTime = this.apiMetrics.averageResponseTime * (this.apiMetrics.requestCount - 1) + duration;
    this.apiMetrics.averageResponseTime = totalTime / this.apiMetrics.requestCount;

    // Record status code
    const statusCodeStr = statusCode.toString();
    this.apiMetrics.statusCodes[statusCodeStr] = (this.apiMetrics.statusCodes[statusCodeStr] || 0) + 1;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    metrics: PerformanceMetrics[];
    cache: CacheMetrics;
    database: DatabaseMetrics;
    api: ApiMetrics;
  } {
    return {
      metrics: this.metrics,
      cache: this.cacheMetrics,
      database: this.databaseMetrics,
      api: this.apiMetrics,
    };
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.cacheMetrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      memoryUsage: 0,
    };
    this.databaseMetrics = {
      queryCount: 0,
      slowQueries: 0,
      averageQueryTime: 0,
      connectionPoolUsage: 0,
      activeConnections: 0,
    };
    this.apiMetrics = {
      requestCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      throughput: 0,
      statusCodes: {},
    };
  }
}

// =================== PERFORMANCE OPTIMIZATION UTILITIES ===================

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Memoize function results
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Batch operations for better performance
 */
export class BatchProcessor<T> {
  private batch: T[] = [];
  private processing = false;
  private batchSize: number;
  private batchTimeout: number;
  private processor: (items: T[]) => Promise<void>;

  constructor(
    processor: (items: T[]) => Promise<void>,
    batchSize: number = 100,
    batchTimeout: number = 1000
  ) {
    this.processor = processor;
    this.batchSize = batchSize;
    this.batchTimeout = batchTimeout;
  }

  async add(item: T): Promise<void> {
    this.batch.push(item);

    if (this.batch.length >= this.batchSize) {
      await this.process();
    } else if (!this.processing) {
      setTimeout(() => this.process(), this.batchTimeout);
    }
  }

  private async process(): Promise<void> {
    if (this.processing || this.batch.length === 0) {
      return;
    }

    this.processing = true;
    const items = this.batch.splice(0, this.batchSize);

    try {
      await this.processor(items);
    } catch (error) {
      logger.error('Batch processing failed', error);
    } finally {
      this.processing = false;
      
      // Process remaining items
      if (this.batch.length > 0) {
        await this.process();
      }
    }
  }

  async flush(): Promise<void> {
    while (this.batch.length > 0) {
      await this.process();
    }
  }
}

/**
 * Connection pooling for database operations
 */
export class ConnectionPool<T> {
  private pool: T[] = [];
  private inUse: Set<T> = new Set();
  private factory: () => Promise<T>;
  private maxSize: number;
  private timeout: number;

  constructor(
    factory: () => Promise<T>,
    maxSize: number = 10,
    timeout: number = 30000
  ) {
    this.factory = factory;
    this.maxSize = maxSize;
    this.timeout = timeout;
  }

  async acquire(): Promise<T> {
    // Try to get from pool
    if (this.pool.length > 0) {
      const connection = this.pool.pop()!;
      this.inUse.add(connection);
      return connection;
    }

    // Create new connection if under max size
    if (this.inUse.size < this.maxSize) {
      const connection = await this.factory();
      this.inUse.add(connection);
      return connection;
    }

    // Wait for available connection
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Connection pool timeout'));
      }, this.timeout);

      const checkPool = () => {
        if (this.pool.length > 0) {
          clearTimeout(timeoutId);
          const connection = this.pool.pop()!;
          this.inUse.add(connection);
          resolve(connection);
        } else {
          setTimeout(checkPool, 100);
        }
      };

      checkPool();
    });
  }

  release(connection: T): void {
    if (this.inUse.has(connection)) {
      this.inUse.delete(connection);
      this.pool.push(connection);
    }
  }

  async close(): Promise<void> {
    this.pool = [];
    this.inUse.clear();
  }

  getStats(): {
    poolSize: number;
    inUse: number;
    total: number;
  } {
    return {
      poolSize: this.pool.length,
      inUse: this.inUse.size,
      total: this.pool.length + this.inUse.size,
    };
  }
}

/**
 * Memory usage monitoring
 */
export class MemoryMonitor {
  private baseline: NodeJS.MemoryUsage;
  private samples: NodeJS.MemoryUsage[] = [];
  private maxSamples: number;

  constructor(maxSamples: number = 100) {
    this.baseline = process.memoryUsage();
    this.maxSamples = maxSamples;
  }

  sample(): void {
    const usage = process.memoryUsage();
    this.samples.push(usage);

    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    // Check for memory leaks
    const heapUsedGrowth = usage.heapUsed - this.baseline.heapUsed;
    const growthPercentage = (heapUsedGrowth / this.baseline.heapUsed) * 100;

    if (growthPercentage > 50) {
      logger.warn('Potential memory leak detected', {
        growthPercentage: `${growthPercentage.toFixed(2)}%`,
        currentHeapUsed: usage.heapUsed,
        baselineHeapUsed: this.baseline.heapUsed,
      });
    }
  }

  getStats(): {
    current: NodeJS.MemoryUsage;
    baseline: NodeJS.MemoryUsage;
    average: NodeJS.MemoryUsage;
    growth: {
      heapUsed: number;
      heapTotal: number;
      rss: number;
    };
  } {
    const current = process.memoryUsage();
    const average = this.calculateAverage();

    return {
      current,
      baseline: this.baseline,
      average,
      growth: {
        heapUsed: current.heapUsed - this.baseline.heapUsed,
        heapTotal: current.heapTotal - this.baseline.heapTotal,
        rss: current.rss - this.baseline.rss,
      },
    };
  }

  private calculateAverage(): NodeJS.MemoryUsage {
    if (this.samples.length === 0) {
      return process.memoryUsage();
    }

    const sum = this.samples.reduce(
      (acc, sample) => ({
        rss: acc.rss + sample.rss,
        heapTotal: acc.heapTotal + sample.heapTotal,
        heapUsed: acc.heapUsed + sample.heapUsed,
        external: acc.external + sample.external,
        arrayBuffers: acc.arrayBuffers + sample.arrayBuffers,
      }),
      { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 }
    );

    const count = this.samples.length;
    return {
      rss: sum.rss / count,
      heapTotal: sum.heapTotal / count,
      heapUsed: sum.heapUsed / count,
      external: sum.external / count,
      arrayBuffers: sum.arrayBuffers / count,
    };
  }
}

// =================== EXPORTS ===================

export {
  PerformanceMonitor,
  debounce,
  throttle,
  memoize,
  BatchProcessor,
  ConnectionPool,
  MemoryMonitor,
};

export type {
  PerformanceMetrics,
  CacheMetrics,
  DatabaseMetrics,
  ApiMetrics,
};
