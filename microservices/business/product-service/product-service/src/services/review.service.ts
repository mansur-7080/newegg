import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError, NotFoundError, AuthorizationError } from '../utils/errors';
import { Review, Prisma } from '@prisma/client';

export interface CreateReviewData {
  productId: string;
  userId: string;
  rating: number;
  title?: string;
  comment?: string;
}

export interface UpdateReviewData {
  rating?: number;
  title?: string;
  comment?: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  verifiedPurchases: number;
}

export class ReviewService {
  /**
   * Get product reviews with pagination and sorting
   */
  async getProductReviews(
    productId: string,
    page: number,
    limit: number,
    sortBy: string,
    userId?: string
  ) {
    try {
      const skip = (page - 1) * limit;

      // Build sort criteria
      let orderBy: any = {};
      switch (sortBy) {
        case 'rating':
          orderBy = { rating: 'desc' };
          break;
        case 'helpful':
          orderBy = { isHelpful: 'desc' };
          break;
        case 'recent':
        default:
          orderBy = { createdAt: 'desc' };
      }

      // Get reviews
      const [reviews, total, stats] = await Promise.all([
        prisma.review.findMany({
          where: { productId },
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy,
        }),
        prisma.review.count({
          where: { productId },
        }),
        this.getReviewStats(productId),
      ]);

      // Check if user marked reviews as helpful
      let reviewsWithUserData = reviews;
      if (userId) {
        // In a real implementation, you'd check from a ReviewHelpful table
        reviewsWithUserData = reviews.map(review => ({
          ...review,
          userMarkedHelpful: false, // Placeholder
        }));
      }

      return {
        items: reviewsWithUserData,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        stats,
      };
    } catch (error) {
      logger.error('Error getting product reviews', { error, productId });
      throw error;
    }
  }

  /**
   * Get review by ID
   */
  async getReviewById(reviewId: string): Promise<Review> {
    try {
      const review = await prisma.review.findUnique({
        where: { id: reviewId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      if (!review) {
        throw new NotFoundError('Review');
      }

      return review;
    } catch (error) {
      logger.error('Error getting review by ID', { error, reviewId });
      throw error;
    }
  }

  /**
   * Get user's review for a product
   */
  async getUserProductReview(userId: string, productId: string): Promise<Review | null> {
    try {
      return await prisma.review.findFirst({
        where: {
          userId,
          productId,
        },
      });
    } catch (error) {
      logger.error('Error getting user product review', { error, userId, productId });
      throw error;
    }
  }

  /**
   * Create a new review
   */
  async createReview(data: CreateReviewData): Promise<Review> {
    try {
      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: data.productId },
      });

      if (!product) {
        throw new NotFoundError('Product');
      }

      // Create review
      const review = await prisma.review.create({
        data: {
          productId: data.productId,
          userId: data.userId,
          rating: data.rating,
          title: data.title,
          comment: data.comment,
        },
      });

      // Update product average rating
      await this.updateProductRating(data.productId);

      logger.info('Review created', {
        reviewId: review.id,
        productId: data.productId,
        userId: data.userId,
      });

      return review;
    } catch (error) {
      logger.error('Error creating review', { error, data });
      throw error;
    }
  }

  /**
   * Update a review
   */
  async updateReview(
    reviewId: string,
    userId: string,
    data: UpdateReviewData
  ): Promise<Review> {
    try {
      // Get existing review
      const existingReview = await prisma.review.findUnique({
        where: { id: reviewId },
      });

      if (!existingReview) {
        throw new NotFoundError('Review');
      }

      // Check ownership
      if (existingReview.userId !== userId) {
        throw new AuthorizationError('You can only update your own reviews');
      }

      // Update review
      const updatedReview = await prisma.review.update({
        where: { id: reviewId },
        data: {
          rating: data.rating,
          title: data.title,
          comment: data.comment,
          updatedAt: new Date(),
        },
      });

      // Update product average rating if rating changed
      if (data.rating && data.rating !== existingReview.rating) {
        await this.updateProductRating(existingReview.productId);
      }

      logger.info('Review updated', { reviewId, userId });

      return updatedReview;
    } catch (error) {
      logger.error('Error updating review', { error, reviewId });
      throw error;
    }
  }

  /**
   * Delete a review
   */
  async deleteReview(reviewId: string, userId: string, isAdmin: boolean): Promise<Review> {
    try {
      const review = await prisma.review.findUnique({
        where: { id: reviewId },
      });

      if (!review) {
        throw new NotFoundError('Review');
      }

      // Check permission
      if (!isAdmin && review.userId !== userId) {
        throw new AuthorizationError('You can only delete your own reviews');
      }

      // Delete review
      const deletedReview = await prisma.review.delete({
        where: { id: reviewId },
      });

      // Update product average rating
      await this.updateProductRating(review.productId);

      logger.info('Review deleted', { reviewId, deletedBy: userId, isAdmin });

      return deletedReview;
    } catch (error) {
      logger.error('Error deleting review', { error, reviewId });
      throw error;
    }
  }

  /**
   * Mark review as helpful
   */
  async markHelpful(reviewId: string, userId: string, helpful: boolean): Promise<void> {
    try {
      const review = await prisma.review.findUnique({
        where: { id: reviewId },
      });

      if (!review) {
        throw new NotFoundError('Review');
      }

      // In a real implementation, you would:
      // 1. Check if user already marked this review
      // 2. Create/update ReviewHelpful record
      // 3. Update review helpful counts

      await prisma.review.update({
        where: { id: reviewId },
        data: {
          isHelpful: helpful ? review.isHelpful + 1 : Math.max(0, review.isHelpful - 1),
          isNotHelpful: !helpful ? review.isNotHelpful + 1 : Math.max(0, review.isNotHelpful - 1),
        },
      });

      logger.info('Review helpfulness marked', { reviewId, userId, helpful });
    } catch (error) {
      logger.error('Error marking review helpful', { error, reviewId });
      throw error;
    }
  }

  /**
   * Report a review
   */
  async reportReview(
    reviewId: string,
    userId: string,
    reason: string,
    details?: string
  ): Promise<void> {
    try {
      const review = await prisma.review.findUnique({
        where: { id: reviewId },
      });

      if (!review) {
        throw new NotFoundError('Review');
      }

      // In a real implementation, you would create a ReviewReport record
      logger.info('Review reported', {
        reviewId,
        reportedBy: userId,
        reason,
        details,
      });
    } catch (error) {
      logger.error('Error reporting review', { error, reviewId });
      throw error;
    }
  }

  /**
   * Verify a review (admin only)
   */
  async verifyReview(reviewId: string): Promise<Review> {
    try {
      const review = await prisma.review.update({
        where: { id: reviewId },
        data: {
          isVerified: true,
        },
      });

      logger.info('Review verified', { reviewId });

      return review;
    } catch (error) {
      logger.error('Error verifying review', { error, reviewId });
      throw error;
    }
  }

  /**
   * Get user reviews
   */
  async getUserReviews(userId: string, page: number, limit: number) {
    try {
      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          where: { userId },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: {
                  where: { isMain: true },
                  select: { url: true },
                  take: 1,
                },
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.review.count({
          where: { userId },
        }),
      ]);

      return {
        items: reviews,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting user reviews', { error, userId });
      throw error;
    }
  }

  /**
   * Get review statistics for a product
   */
  async getReviewStats(productId: string): Promise<ReviewStats> {
    try {
      const reviews = await prisma.review.findMany({
        where: { productId },
        select: {
          rating: true,
          isVerified: true,
        },
      });

      const totalReviews = reviews.length;
      
      if (totalReviews === 0) {
        return {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          verifiedPurchases: 0,
        };
      }

      // Calculate average rating
      const sumRatings = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = parseFloat((sumRatings / totalReviews).toFixed(1));

      // Calculate rating distribution
      const ratingDistribution = reviews.reduce(
        (dist, review) => {
          dist[review.rating as 1 | 2 | 3 | 4 | 5]++;
          return dist;
        },
        { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      );

      // Count verified purchases
      const verifiedPurchases = reviews.filter(r => r.isVerified).length;

      return {
        averageRating,
        totalReviews,
        ratingDistribution,
        verifiedPurchases,
      };
    } catch (error) {
      logger.error('Error getting review stats', { error, productId });
      throw error;
    }
  }

  /**
   * Update product average rating
   */
  private async updateProductRating(productId: string): Promise<void> {
    try {
      const stats = await this.getReviewStats(productId);

      // In a real implementation, you would update a denormalized field
      // on the Product model for performance
      logger.info('Product rating updated', {
        productId,
        averageRating: stats.averageRating,
        totalReviews: stats.totalReviews,
      });
    } catch (error) {
      logger.error('Error updating product rating', { error, productId });
      // Don't throw - this is a non-critical operation
    }
  }
}