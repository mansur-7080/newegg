import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../config/database';
import { logger } from '../utils/logger';

export interface BenchmarkData {
  productId: string;
  benchmarks: {
    synthetic: Record<string, number>;
    gaming: Record<string, number>;
    productivity: Record<string, number>;
  };
}

export class BenchmarkService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  async getProductBenchmarks(productId: string, benchmarkType?: string): Promise<BenchmarkData | null> {
    try {
      // For now, return mock benchmark data since we don't have a benchmark table
      // In a real implementation, this would query a benchmarks table
      return {
        productId,
        benchmarks: {
          synthetic: {
            cinebenchR23Single: 1850,
            cinebenchR23Multi: 24500,
            geekbench5Single: 1920,
            geekbench5Multi: 14200,
          },
          gaming: {
            avgFps1080p: 165,
            avgFps1440p: 142,
            avgFps4k: 85,
          },
          productivity: {
            videoEncoding: 95,
            rendering: 88,
            compilation: 92,
          }
        }
      };
    } catch (error) {
      logger.error('Failed to get product benchmarks', error);
      throw new Error('Failed to retrieve product benchmarks');
    }
  }

  async compareBenchmarks(productId: string, compareIds: string[]): Promise<any> {
    try {
      const benchmarks = await Promise.all([
        this.getProductBenchmarks(productId),
        ...compareIds.map(id => this.getProductBenchmarks(id))
      ]);

      return {
        comparison: benchmarks,
        winner: productId, // Mock winner
      };
    } catch (error) {
      logger.error('Failed to compare benchmarks', error);
      throw new Error('Failed to compare product benchmarks');
    }
  }
}