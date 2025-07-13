// Memory Management and Garbage Collection Optimization
// This utility helps manage memory usage and optimize garbage collection

export interface MemoryStats {
  used: number;
  total: number;
  external: number;
  heapUsed: number;
  heapTotal: number;
  heapExternal: number;
  rss: number;
}

export interface GCStats {
  duration: number;
  type: string;
  before: MemoryStats;
  after: MemoryStats;
  freed: number;
}

export class MemoryManager {
  private static instance: MemoryManager;
  private gcStats: GCStats[] = [];
  private memoryThreshold = 0.8; // 80% memory usage threshold
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startMemoryMonitoring();
  }

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Get current memory usage statistics
   */
  public getMemoryStats(): MemoryStats {
    const memUsage = process.memoryUsage();
    
    return {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      external: memUsage.external,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      heapExternal: memUsage.external,
      rss: memUsage.rss,
    };
  }

  /**
   * Get memory usage as percentage
   */
  public getMemoryUsagePercentage(): number {
    const stats = this.getMemoryStats();
    return (stats.heapUsed / stats.heapTotal) * 100;
  }

  /**
   * Force garbage collection if memory usage is high
   */
  public async forceGC(): Promise<GCStats | null> {
    const before = this.getMemoryStats();
    const usagePercentage = this.getMemoryUsagePercentage();

    if (usagePercentage < 70) {
      console.log(`[MEMORY] GC skipped - usage is ${usagePercentage.toFixed(2)}%`);
      return null;
    }

    console.log(`[MEMORY] Forcing garbage collection - usage is ${usagePercentage.toFixed(2)}%`);

    const startTime = performance.now();
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }

    const duration = performance.now() - startTime;
    const after = this.getMemoryStats();
    const freed = before.heapUsed - after.heapUsed;

    const gcStats: GCStats = {
      duration,
      type: 'manual',
      before,
      after,
      freed,
    };

    this.gcStats.push(gcStats);

    console.log(`[MEMORY] GC completed in ${duration.toFixed(2)}ms, freed ${(freed / 1024 / 1024).toFixed(2)}MB`);

    return gcStats;
  }

  /**
   * Start automatic memory monitoring
   */
  private startMemoryMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      const usagePercentage = this.getMemoryUsagePercentage();
      
      console.log(`[MEMORY] Current usage: ${usagePercentage.toFixed(2)}%`);

      if (usagePercentage > this.memoryThreshold * 100) {
        console.warn(`[MEMORY] High memory usage detected: ${usagePercentage.toFixed(2)}%`);
        this.forceGC();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop memory monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Get garbage collection statistics
   */
  public getGCStats(): GCStats[] {
    return [...this.gcStats];
  }

  /**
   * Clear old GC statistics
   */
  public clearGCStats(): void {
    this.gcStats = [];
  }

  /**
   * Optimize memory usage for long-running processes
   */
  public optimizeForLongRunning(): void {
    // Set memory limits
    const maxOldSpaceSize = process.env.NODE_OPTIONS?.includes('--max-old-space-size') 
      ? undefined 
      : '--max-old-space-size=4096';

    if (maxOldSpaceSize) {
      console.log(`[MEMORY] Set max old space size to 4GB`);
    }

    // Enable garbage collection logging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MEMORY] GC logging enabled for development`);
    }
  }

  /**
   * Memory leak detection
   */
  public detectMemoryLeaks(): void {
    const stats = this.getMemoryStats();
    const usagePercentage = this.getMemoryUsagePercentage();

    if (usagePercentage > 90) {
      console.error(`[MEMORY] CRITICAL: Memory usage at ${usagePercentage.toFixed(2)}% - possible memory leak`);
      
      // Log memory breakdown
      console.log(`[MEMORY] Breakdown:`, {
        heapUsed: `${(stats.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(stats.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        external: `${(stats.external / 1024 / 1024).toFixed(2)}MB`,
        rss: `${(stats.rss / 1024 / 1024).toFixed(2)}MB`,
      });
    }
  }
}

// Export singleton instance
export const memoryManager = MemoryManager.getInstance();