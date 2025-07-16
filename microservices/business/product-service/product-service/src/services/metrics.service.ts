import { logger } from '../utils/logger';

interface Metric {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  value: number;
  labels?: Record<string, string>;
}

export class MetricsService {
  private static instance: MetricsService;
  private metrics: Map<string, Metric> = new Map();
  private httpRequestDurations: Map<string, number[]> = new Map();
  private collectionInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeDefaultMetrics();
  }

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  private initializeDefaultMetrics(): void {
    // HTTP metrics
    this.registerMetric({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      type: 'counter',
      value: 0,
    });

    this.registerMetric({
      name: 'http_request_duration_seconds',
      help: 'HTTP request latencies in seconds',
      type: 'histogram',
      value: 0,
    });

    // Business metrics
    this.registerMetric({
      name: 'products_total',
      help: 'Total number of products',
      type: 'gauge',
      value: 0,
    });

    this.registerMetric({
      name: 'categories_total',
      help: 'Total number of categories',
      type: 'gauge',
      value: 0,
    });

    this.registerMetric({
      name: 'active_products_total',
      help: 'Total number of active products',
      type: 'gauge',
      value: 0,
    });

    // Cache metrics
    this.registerMetric({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      type: 'counter',
      value: 0,
    });

    this.registerMetric({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      type: 'counter',
      value: 0,
    });

    // Database metrics
    this.registerMetric({
      name: 'database_connections_active',
      help: 'Number of active database connections',
      type: 'gauge',
      value: 0,
    });

    this.registerMetric({
      name: 'database_queries_total',
      help: 'Total number of database queries',
      type: 'counter',
      value: 0,
    });

    // System metrics
    this.registerMetric({
      name: 'nodejs_heap_size_total_bytes',
      help: 'Process heap size from Node.js in bytes',
      type: 'gauge',
      value: 0,
    });

    this.registerMetric({
      name: 'nodejs_heap_size_used_bytes',
      help: 'Process heap size used from Node.js in bytes',
      type: 'gauge',
      value: 0,
    });

    this.registerMetric({
      name: 'process_cpu_seconds_total',
      help: 'Total user and system CPU time spent in seconds',
      type: 'counter',
      value: 0,
    });
  }

  public startCollection(): void {
    if (this.collectionInterval) {
      return;
    }

    const interval = parseInt(process.env.METRICS_COLLECTION_INTERVAL || '10000');
    
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, interval);

    logger.info('Metrics collection started', { interval });
  }

  public stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
      logger.info('Metrics collection stopped');
    }
  }

  private collectSystemMetrics(): void {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.updateMetric('nodejs_heap_size_total_bytes', memoryUsage.heapTotal);
    this.updateMetric('nodejs_heap_size_used_bytes', memoryUsage.heapUsed);
    this.updateMetric('process_cpu_seconds_total', (cpuUsage.user + cpuUsage.system) / 1000000);
  }

  public registerMetric(metric: Metric): void {
    this.metrics.set(metric.name, metric);
  }

  public incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    if (metric && metric.type === 'counter') {
      metric.value += value;
      if (labels) {
        metric.labels = { ...metric.labels, ...labels };
      }
    }
  }

  public updateGauge(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    if (metric && metric.type === 'gauge') {
      metric.value = value;
      if (labels) {
        metric.labels = { ...metric.labels, ...labels };
      }
    }
  }

  public updateMetric(name: string, value: number): void {
    const metric = this.metrics.get(name);
    if (metric) {
      metric.value = value;
    }
  }

  public recordHttpRequest(method: string, path: string, statusCode: number, duration: number): void {
    // Increment request counter
    this.incrementCounter('http_requests_total', 1, {
      method,
      path: this.normalizePath(path),
      status: statusCode.toString(),
    });

    // Record duration
    const key = `${method}_${this.normalizePath(path)}_${statusCode}`;
    if (!this.httpRequestDurations.has(key)) {
      this.httpRequestDurations.set(key, []);
    }
    this.httpRequestDurations.get(key)!.push(duration);
  }

  public recordCacheHit(): void {
    this.incrementCounter('cache_hits_total');
  }

  public recordCacheMiss(): void {
    this.incrementCounter('cache_misses_total');
  }

  public recordDatabaseQuery(): void {
    this.incrementCounter('database_queries_total');
  }

  public updateProductCount(count: number): void {
    this.updateGauge('products_total', count);
  }

  public updateActiveProductCount(count: number): void {
    this.updateGauge('active_products_total', count);
  }

  public updateCategoryCount(count: number): void {
    this.updateGauge('categories_total', count);
  }

  public updateDatabaseConnections(count: number): void {
    this.updateGauge('database_connections_active', count);
  }

  private normalizePath(path: string): string {
    // Normalize paths to avoid high cardinality
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:id')
      .replace(/\?.*$/, '');
  }

  public async getMetrics(): Promise<string> {
    const lines: string[] = [];

    // Add metrics
    for (const [name, metric] of this.metrics) {
      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} ${metric.type}`);
      
      if (metric.labels && Object.keys(metric.labels).length > 0) {
        const labelStr = Object.entries(metric.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        lines.push(`${name}{${labelStr}} ${metric.value}`);
      } else {
        lines.push(`${name} ${metric.value}`);
      }
    }

    // Add histogram data
    for (const [key, durations] of this.httpRequestDurations) {
      if (durations.length > 0) {
        const [method, path, status] = key.split('_');
        const labels = `method="${method}",path="${path}",status="${status}"`;
        
        // Calculate percentiles
        const sorted = durations.sort((a, b) => a - b);
        const p50 = sorted[Math.floor(sorted.length * 0.5)];
        const p90 = sorted[Math.floor(sorted.length * 0.9)];
        const p99 = sorted[Math.floor(sorted.length * 0.99)];
        const sum = sorted.reduce((a, b) => a + b, 0);
        
        lines.push(`http_request_duration_seconds{${labels},quantile="0.5"} ${p50 / 1000}`);
        lines.push(`http_request_duration_seconds{${labels},quantile="0.9"} ${p90 / 1000}`);
        lines.push(`http_request_duration_seconds{${labels},quantile="0.99"} ${p99 / 1000}`);
        lines.push(`http_request_duration_seconds_sum{${labels}} ${sum / 1000}`);
        lines.push(`http_request_duration_seconds_count{${labels}} ${sorted.length}`);
      }
    }

    return lines.join('\n');
  }

  public reset(): void {
    this.metrics.clear();
    this.httpRequestDurations.clear();
    this.initializeDefaultMetrics();
  }
}