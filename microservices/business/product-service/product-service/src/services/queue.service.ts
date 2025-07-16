import Bull from 'bull';
import { logger } from '../utils/logger';

export interface QueueJob<T = any> {
  id?: string;
  data: T;
  opts?: Bull.JobOptions;
}

export class QueueService {
  private static instance: QueueService;
  private queues: Map<string, Bull.Queue> = new Map();
  private processors: Map<string, Bull.ProcessCallbackFunction<any>> = new Map();

  private constructor() {}

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  public async connect(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      // Initialize default queues
      await this.createQueue('product-import', redisUrl);
      await this.createQueue('product-export', redisUrl);
      await this.createQueue('image-processing', redisUrl);
      await this.createQueue('inventory-sync', redisUrl);
      await this.createQueue('price-update', redisUrl);
      await this.createQueue('search-index', redisUrl);
      await this.createQueue('notification', redisUrl);

      // Register processors
      this.registerDefaultProcessors();

      logger.info('✅ Queue service connected');
    } catch (error) {
      logger.error('❌ Failed to connect queue service', { error });
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      for (const [name, queue] of this.queues) {
        await queue.close();
        logger.info(`Queue ${name} closed`);
      }
      this.queues.clear();
      this.processors.clear();
      logger.info('✅ Queue service disconnected');
    } catch (error) {
      logger.error('❌ Error disconnecting queue service', { error });
      throw error;
    }
  }

  private async createQueue(name: string, redisUrl: string): Promise<Bull.Queue> {
    const queue = new Bull(name, redisUrl, {
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    // Set up event handlers
    queue.on('error', (error) => {
      logger.error(`Queue ${name} error`, { error });
    });

    queue.on('active', (job) => {
      logger.info(`Job ${job.id} started in queue ${name}`);
    });

    queue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed in queue ${name}`, { result });
    });

    queue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed in queue ${name}`, { error: err });
    });

    queue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} stalled in queue ${name}`);
    });

    this.queues.set(name, queue);
    return queue;
  }

  private registerDefaultProcessors(): void {
    // Product import processor
    this.registerProcessor('product-import', async (job) => {
      const { file, userId } = job.data;
      logger.info('Processing product import', { file, userId });
      // Import logic would go here
      return { imported: 0, failed: 0 };
    });

    // Product export processor
    this.registerProcessor('product-export', async (job) => {
      const { filters, format, userId } = job.data;
      logger.info('Processing product export', { filters, format, userId });
      // Export logic would go here
      return { exported: 0, fileUrl: '' };
    });

    // Image processing processor
    this.registerProcessor('image-processing', async (job) => {
      const { productId, imageUrl, operations } = job.data;
      logger.info('Processing image', { productId, imageUrl, operations });
      // Image processing logic would go here
      return { processedUrls: [] };
    });

    // Inventory sync processor
    this.registerProcessor('inventory-sync', async (job) => {
      const { productId, quantity, operation } = job.data;
      logger.info('Syncing inventory', { productId, quantity, operation });
      // Inventory sync logic would go here
      return { synced: true };
    });

    // Price update processor
    this.registerProcessor('price-update', async (job) => {
      const { productIds, priceChange } = job.data;
      logger.info('Updating prices', { productIds, priceChange });
      // Price update logic would go here
      return { updated: productIds.length };
    });

    // Search index processor
    this.registerProcessor('search-index', async (job) => {
      const { productId, operation } = job.data;
      logger.info('Updating search index', { productId, operation });
      // Search indexing logic would go here
      return { indexed: true };
    });

    // Notification processor
    this.registerProcessor('notification', async (job) => {
      const { type, recipient, data } = job.data;
      logger.info('Sending notification', { type, recipient });
      // Notification logic would go here
      return { sent: true };
    });
  }

  public registerProcessor<T>(
    queueName: string,
    processor: Bull.ProcessCallbackFunction<T>
  ): void {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    queue.process(processor);
    this.processors.set(queueName, processor);
    logger.info(`Processor registered for queue ${queueName}`);
  }

  public async addJob<T>(
    queueName: string,
    data: T,
    opts?: Bull.JobOptions
  ): Promise<Bull.Job<T>> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.add(data, opts);
    logger.info(`Job ${job.id} added to queue ${queueName}`);
    return job;
  }

  public async addBulkJobs<T>(
    queueName: string,
    jobs: QueueJob<T>[]
  ): Promise<Bull.Job<T>[]> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const bulkJobs = jobs.map(job => ({
      data: job.data,
      opts: job.opts,
    }));

    const addedJobs = await queue.addBulk(bulkJobs);
    logger.info(`${addedJobs.length} jobs added to queue ${queueName}`);
    return addedJobs;
  }

  public async getJob(queueName: string, jobId: string): Promise<Bull.Job | null> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queue.getJob(jobId);
  }

  public async getJobs(
    queueName: string,
    types: Bull.JobStatus[] = ['waiting', 'active', 'completed', 'failed'],
    start = 0,
    end = 100
  ): Promise<Bull.Job[]> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queue.getJobs(types, start, end);
  }

  public async getJobCounts(queueName: string): Promise<Bull.JobCounts> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queue.getJobCounts();
  }

  public async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();
    logger.info(`Queue ${queueName} paused`);
  }

  public async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();
    logger.info(`Queue ${queueName} resumed`);
  }

  public async cleanQueue(
    queueName: string,
    grace: number,
    status?: Bull.JobStatusClean
  ): Promise<Bull.Job[]> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const cleaned = await queue.clean(grace, status);
    logger.info(`Cleaned ${cleaned.length} jobs from queue ${queueName}`);
    return cleaned;
  }

  public async emptyQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.empty();
    logger.info(`Queue ${queueName} emptied`);
  }

  public getQueue(queueName: string): Bull.Queue | undefined {
    return this.queues.get(queueName);
  }

  public getAllQueues(): Map<string, Bull.Queue> {
    return this.queues;
  }
}