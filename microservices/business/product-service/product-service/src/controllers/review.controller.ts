import { Request, Response, NextFunction } from 'express';
import { ReviewService } from '../services/review.service';
import { logger } from '../utils/logger';
import { AppError, BusinessError, NotFoundError } from '../utils/errors';
import { CacheService } from '../services/cache.service';
import { QueueService } from '../services/queue.service';
import { MetricsService } from '../services/metrics.service';

export class ReviewController {
  private reviewService: ReviewService;
  private cacheService: CacheService;
  private queueService: QueueService;
  private metricsService: MetricsService;

  constructor() {
    this.reviewService = new ReviewService();
    this.cacheService = CacheService.getInstance();
    this.queueService = QueueService.getInstance();
    this.metricsService = MetricsService.getInstance();
  }

  /**
   * Get product reviews
   */
  getProductReviews = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;
      const { page = 1, limit = 20, sortBy = 'recent' } = req.query;
      const userId = req.user?.id;

      logger.info('Getting product reviews', { productId, page, limit, sortBy });

      // Try cache first
      const cacheKey = `reviews:product:${productId}:${page}:${limit}:${sortBy}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.metricsService.recordCacheHit();
        return res.json({
          success: true,
          data: cached,
        });
      }

      this.metricsService.recordCacheMiss();

      const result = await this.reviewService.getProductReviews(
        productId,
        Number(page),
        Number(limit),
        sortBy as string,
        userId
      );

      // Cache the result
      await this.cacheService.set(cacheKey, result, {
        ttl: 300, // 5 minutes
        tags: [`product:${productId}`, 'reviews'],
      });

      res.json({
        success: true,
        data: result.items,
        pagination: result.pagination,
        stats: result.stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get review by ID
   */
  getReviewById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewId } = req.params;

      logger.info('Getting review by ID', { reviewId });

      const review = await this.reviewService.getReviewById(reviewId);

      res.json({
        success: true,
        data: review,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create review
   */
  createReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId, rating, title, comment } = req.body;
      const userId = req.user!.id;

      logger.info('Creating review', { productId, userId, rating });

      // Check if user already reviewed this product
      const existingReview = await this.reviewService.getUserProductReview(userId, productId);
      if (existingReview) {
        throw new BusinessError(
          'You have already reviewed this product',
          'DUPLICATE_REVIEW'
        );
      }

      const review = await this.reviewService.createReview({
        productId,
        userId,
        rating,
        title,
        comment,
      });

      // Invalidate cache
      await this.cacheService.invalidateByTags([`product:${productId}`, 'reviews']);

      // Queue for notifications
      await this.queueService.addJob('notification', {
        type: 'new-review',
        recipient: 'product-owner',
        data: {
          productId,
          reviewId: review.id,
          rating,
        },
      });

      res.status(201).json({
        success: true,
        data: review,
        message: 'Review created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update review
   */
  updateReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewId } = req.params;
      const { rating, title, comment } = req.body;
      const userId = req.user!.id;

      logger.info('Updating review', { reviewId, userId });

      const review = await this.reviewService.updateReview(
        reviewId,
        userId,
        { rating, title, comment }
      );

      // Invalidate cache
      await this.cacheService.invalidateByTags([
        `product:${review.productId}`,
        'reviews',
      ]);

      res.json({
        success: true,
        data: review,
        message: 'Review updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete review
   */
  deleteReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewId } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin' || req.user!.role === 'super_admin';

      logger.info('Deleting review', { reviewId, userId, isAdmin });

      const review = await this.reviewService.deleteReview(reviewId, userId, isAdmin);

      // Invalidate cache
      await this.cacheService.invalidateByTags([
        `product:${review.productId}`,
        'reviews',
      ]);

      res.json({
        success: true,
        message: 'Review deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Mark review as helpful
   */
  markHelpful = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewId } = req.params;
      const { helpful } = req.body;
      const userId = req.user!.id;

      logger.info('Marking review helpfulness', { reviewId, helpful, userId });

      await this.reviewService.markHelpful(reviewId, userId, helpful);

      res.json({
        success: true,
        message: 'Helpfulness recorded',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Report review
   */
  reportReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewId } = req.params;
      const { reason, details } = req.body;
      const userId = req.user!.id;

      logger.info('Reporting review', { reviewId, reason, userId });

      await this.reviewService.reportReview(reviewId, userId, reason, details);

      // Queue for admin notification
      await this.queueService.addJob('notification', {
        type: 'review-reported',
        recipient: 'admin',
        data: {
          reviewId,
          reason,
          reportedBy: userId,
        },
      });

      res.json({
        success: true,
        message: 'Report submitted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verify review (admin only)
   */
  verifyReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewId } = req.params;

      logger.info('Verifying review', { reviewId });

      const review = await this.reviewService.verifyReview(reviewId);

      // Invalidate cache
      await this.cacheService.invalidateByTags([
        `product:${review.productId}`,
        'reviews',
      ]);

      res.json({
        success: true,
        data: review,
        message: 'Review verified successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user reviews
   */
  getUserReviews = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const requesterId = req.user!.id;
      const isAdmin = req.user!.role === 'admin' || req.user!.role === 'super_admin';

      // Check permission
      if (userId !== requesterId && !isAdmin) {
        throw new AppError('Access denied', 403);
      }

      logger.info('Getting user reviews', { userId, page, limit });

      const result = await this.reviewService.getUserReviews(
        userId,
        Number(page),
        Number(limit)
      );

      res.json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get review statistics
   */
  getReviewStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;

      logger.info('Getting review statistics', { productId });

      // Try cache first
      const cacheKey = `review-stats:${productId}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.metricsService.recordCacheHit();
        return res.json({
          success: true,
          data: cached,
        });
      }

      this.metricsService.recordCacheMiss();

      const stats = await this.reviewService.getReviewStats(productId);

      // Cache the result
      await this.cacheService.set(cacheKey, stats, {
        ttl: 3600, // 1 hour
        tags: [`product:${productId}`, 'review-stats'],
      });

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}