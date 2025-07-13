import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../config/database';
import { logger } from '../utils/logger';

export interface ReviewFilters {
  productId: string;
  rating?: number;
  verified?: boolean;
}

export interface ReviewOptions {
  page: number;
  limit: number;
  sortBy: string;
}

export class ReviewService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  async getProductReviews(filters: ReviewFilters, options: ReviewOptions) {
    try {
      const { productId, rating, verified } = filters;
      const { page, limit, sortBy } = options;
      const offset = (page - 1) * limit;

      const whereCondition = {
        productId,
        ...(rating && { rating }),
        ...(verified !== undefined && { verified }),
      };

      const orderBy = this.buildReviewSortOrder(sortBy);

      const [reviews, total, averageRating] = await Promise.all([
        this.prisma.productReview.findMany({
          where: whereCondition,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              }
            }
          },
          orderBy,
          skip: offset,
          take: limit,
        }),
        this.prisma.productReview.count({
          where: whereCondition,
        }),
        this.prisma.productReview.aggregate({
          where: { productId },
          _avg: { rating: true },
        }),
      ]);

      return {
        reviews,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        averageRating: averageRating._avg.rating || 0,
      };
    } catch (error) {
      logger.error('Failed to get product reviews', error);
      throw new Error('Failed to retrieve product reviews');
    }
  }

  private buildReviewSortOrder(sortBy: string) {
    switch (sortBy) {
      case 'newest':
        return { createdAt: 'desc' as const };
      case 'oldest':
        return { createdAt: 'asc' as const };
      case 'rating_high':
        return { rating: 'desc' as const };
      case 'rating_low':
        return { rating: 'asc' as const };
      case 'helpful':
        return { helpfulCount: 'desc' as const };
      default:
        return { createdAt: 'desc' as const };
    }
  }
}