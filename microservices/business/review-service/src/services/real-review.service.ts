import { PrismaClient } from '@prisma/client';
import { logger } from '../../../../libs/shared/src/logging/logger';

interface Review {
  id: string;
  userId: string;
  productId: string;
  orderId?: string;
  rating: number;
  title: string;
  comment: string;
  pros: string[];
  cons: string[];
  verified: boolean;
  helpful: number;
  notHelpful: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';
  moderatorNote?: string;
  images: string[];
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  sentimentScore: number;
  flaggedReasons: string[];
  createdAt: Date;
  updatedAt: Date;
  user?: {
    firstName: string;
    lastName: string;
    avatar?: string;
    reviewCount: number;
    averageRating: number;
  };
  product?: {
    name: string;
    image: string;
  };
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    [key: number]: number;
  };
  verifiedReviewsCount: number;
  verifiedPercentage: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

interface CreateReviewRequest {
  userId: string;
  productId: string;
  orderId?: string;
  rating: number;
  title: string;
  comment: string;
  pros?: string[];
  cons?: string[];
  images?: string[];
}

interface ReviewFilters {
  productId?: string;
  userId?: string;
  rating?: number;
  verified?: boolean;
  status?: string;
  sentiment?: string;
  sortBy?: 'newest' | 'oldest' | 'rating-high' | 'rating-low' | 'helpful';
  search?: string;
}

export class RealReviewService {
  private db: PrismaClient;

  constructor() {
    this.db = new PrismaClient();
  }

  /**
   * Create a new review
   */
  async createReview(request: CreateReviewRequest): Promise<Review> {
    try {
      // Validate rating
      if (request.rating < 1 || request.rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Check if user has already reviewed this product
      const existingReview = await this.db.review.findFirst({
        where: {
          userId: request.userId,
          productId: request.productId,
        },
      });

      if (existingReview) {
        throw new Error('You have already reviewed this product');
      }

      // Verify if user actually purchased this product
      const verified = await this.verifyPurchase(request.userId, request.productId, request.orderId);

      // Analyze sentiment
      const { sentiment, sentimentScore } = this.analyzeSentiment(request.comment);

      // Check for inappropriate content
      const flaggedReasons = this.checkInappropriateContent(request.title, request.comment);

      // Determine initial status
      const status = flaggedReasons.length > 0 ? 'FLAGGED' : 'APPROVED';

      const review = await this.db.review.create({
        data: {
          userId: request.userId,
          productId: request.productId,
          orderId: request.orderId,
          rating: request.rating,
          title: request.title,
          comment: request.comment,
          pros: request.pros || [],
          cons: request.cons || [],
          verified,
          images: request.images || [],
          sentiment,
          sentimentScore,
          flaggedReasons,
          status,
          helpful: 0,
          notHelpful: 0,
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          product: {
            select: {
              name: true,
              images: true,
            },
          },
        },
      });

      // Update product rating
      await this.updateProductRating(request.productId);

      // Update user review stats
      await this.updateUserReviewStats(request.userId);

      logger.info('Review created successfully', {
        reviewId: review.id,
        userId: request.userId,
        productId: request.productId,
        rating: request.rating,
        verified,
        status,
      });

      return this.mapPrismaReviewToInterface(review);
    } catch (error) {
      logger.error('Failed to create review', {
        error: error instanceof Error ? error.message : 'Unknown error',
        request,
      });
      throw error;
    }
  }

  /**
   * Get reviews with filtering and pagination
   */
  async getReviews(
    filters: ReviewFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{
    reviews: Review[];
    total: number;
    totalPages: number;
    stats?: ReviewStats;
  }> {
    try {
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        status: 'APPROVED', // Only show approved reviews by default
      };

      if (filters.productId) {
        where.productId = filters.productId;
      }

      if (filters.userId) {
        where.userId = filters.userId;
      }

      if (filters.rating) {
        where.rating = filters.rating;
      }

      if (filters.verified !== undefined) {
        where.verified = filters.verified;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.sentiment) {
        where.sentiment = filters.sentiment;
      }

      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { comment: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Build order by clause
      let orderBy: any = { createdAt: 'desc' }; // Default sort

      switch (filters.sortBy) {
        case 'newest':
          orderBy = { createdAt: 'desc' };
          break;
        case 'oldest':
          orderBy = { createdAt: 'asc' };
          break;
        case 'rating-high':
          orderBy = { rating: 'desc' };
          break;
        case 'rating-low':
          orderBy = { rating: 'asc' };
          break;
        case 'helpful':
          orderBy = { helpful: 'desc' };
          break;
      }

      const [reviews, total] = await Promise.all([
        this.db.review.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            product: {
              select: {
                name: true,
                images: true,
              },
            },
          },
        }),
        this.db.review.count({ where }),
      ]);

      // Get review stats if filtering by product
      let stats: ReviewStats | undefined;
      if (filters.productId) {
        stats = await this.getReviewStats(filters.productId);
      }

      return {
        reviews: reviews.map(this.mapPrismaReviewToInterface),
        total,
        totalPages: Math.ceil(total / limit),
        stats,
      };
    } catch (error) {
      logger.error('Failed to get reviews', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filters,
        page,
        limit,
      });
      throw error;
    }
  }

  /**
   * Get review statistics for a product
   */
  async getReviewStats(productId: string): Promise<ReviewStats> {
    try {
      const reviews = await this.db.review.findMany({
        where: {
          productId,
          status: 'APPROVED',
        },
        select: {
          rating: true,
          verified: true,
          sentiment: true,
        },
      });

      const totalReviews = reviews.length;
      const averageRating = totalReviews > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
        : 0;

      // Rating distribution
      const ratingDistribution: { [key: number]: number } = {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
      };
      
      reviews.forEach(review => {
        ratingDistribution[review.rating]++;
      });

      // Verified reviews
      const verifiedReviewsCount = reviews.filter(review => review.verified).length;
      const verifiedPercentage = totalReviews > 0 
        ? (verifiedReviewsCount / totalReviews) * 100 
        : 0;

      // Sentiment distribution
      const sentimentCounts = reviews.reduce(
        (acc, review) => {
          acc[review.sentiment.toLowerCase()]++;
          return acc;
        },
        { positive: 0, negative: 0, neutral: 0 }
      );

      return {
        totalReviews,
        averageRating: parseFloat(averageRating.toFixed(1)),
        ratingDistribution,
        verifiedReviewsCount,
        verifiedPercentage: parseFloat(verifiedPercentage.toFixed(1)),
        sentimentDistribution: sentimentCounts,
      };
    } catch (error) {
      logger.error('Failed to get review stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId,
      });
      throw error;
    }
  }

  /**
   * Mark review as helpful or not helpful
   */
  async markReviewHelpful(
    reviewId: string,
    userId: string,
    helpful: boolean
  ): Promise<void> {
    try {
      // Check if user already voted on this review
      const existingVote = await this.db.reviewHelpfulness.findFirst({
        where: {
          reviewId,
          userId,
        },
      });

      if (existingVote) {
        // Update existing vote
        await this.db.reviewHelpfulness.update({
          where: { id: existingVote.id },
          data: { helpful },
        });
      } else {
        // Create new vote
        await this.db.reviewHelpfulness.create({
          data: {
            reviewId,
            userId,
            helpful,
          },
        });
      }

      // Update review helpful counts
      const [helpfulCount, notHelpfulCount] = await Promise.all([
        this.db.reviewHelpfulness.count({
          where: { reviewId, helpful: true },
        }),
        this.db.reviewHelpfulness.count({
          where: { reviewId, helpful: false },
        }),
      ]);

      await this.db.review.update({
        where: { id: reviewId },
        data: {
          helpful: helpfulCount,
          notHelpful: notHelpfulCount,
        },
      });

      logger.info('Review helpfulness updated', {
        reviewId,
        userId,
        helpful,
        helpfulCount,
        notHelpfulCount,
      });
    } catch (error) {
      logger.error('Failed to mark review helpful', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reviewId,
        userId,
        helpful,
      });
      throw error;
    }
  }

  /**
   * Update review (only by owner)
   */
  async updateReview(
    reviewId: string,
    userId: string,
    updates: {
      rating?: number;
      title?: string;
      comment?: string;
      pros?: string[];
      cons?: string[];
      images?: string[];
    }
  ): Promise<Review> {
    try {
      // Verify ownership
      const existingReview = await this.db.review.findFirst({
        where: { id: reviewId, userId },
      });

      if (!existingReview) {
        throw new Error('Review not found or not owned by user');
      }

      // Validate rating if provided
      if (updates.rating && (updates.rating < 1 || updates.rating > 5)) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Re-analyze sentiment if comment is updated
      let sentiment = existingReview.sentiment;
      let sentimentScore = existingReview.sentimentScore;
      
      if (updates.comment && updates.comment !== existingReview.comment) {
        const analysis = this.analyzeSentiment(updates.comment);
        sentiment = analysis.sentiment;
        sentimentScore = analysis.sentimentScore;
      }

      // Check for inappropriate content
      const flaggedReasons = this.checkInappropriateContent(
        updates.title || existingReview.title,
        updates.comment || existingReview.comment
      );

      // Determine status
      const status = flaggedReasons.length > 0 ? 'FLAGGED' : 'APPROVED';

      const updatedReview = await this.db.review.update({
        where: { id: reviewId },
        data: {
          ...updates,
          sentiment,
          sentimentScore,
          flaggedReasons,
          status,
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          product: {
            select: {
              name: true,
              images: true,
            },
          },
        },
      });

      // Update product rating if rating changed
      if (updates.rating) {
        await this.updateProductRating(existingReview.productId);
      }

      logger.info('Review updated successfully', {
        reviewId,
        userId,
        updatedFields: Object.keys(updates),
        newStatus: status,
      });

      return this.mapPrismaReviewToInterface(updatedReview);
    } catch (error) {
      logger.error('Failed to update review', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reviewId,
        userId,
        updates,
      });
      throw error;
    }
  }

  /**
   * Delete review (only by owner)
   */
  async deleteReview(reviewId: string, userId: string): Promise<void> {
    try {
      // Verify ownership
      const existingReview = await this.db.review.findFirst({
        where: { id: reviewId, userId },
      });

      if (!existingReview) {
        throw new Error('Review not found or not owned by user');
      }

      // Delete associated data
      await this.db.$transaction(async (prisma) => {
        // Delete helpfulness votes
        await prisma.reviewHelpfulness.deleteMany({
          where: { reviewId },
        });

        // Delete the review
        await prisma.review.delete({
          where: { id: reviewId },
        });
      });

      // Update product rating
      await this.updateProductRating(existingReview.productId);

      // Update user review stats
      await this.updateUserReviewStats(userId);

      logger.info('Review deleted successfully', {
        reviewId,
        userId,
        productId: existingReview.productId,
      });
    } catch (error) {
      logger.error('Failed to delete review', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reviewId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Moderate review (admin only)
   */
  async moderateReview(
    reviewId: string,
    moderatorId: string,
    action: 'APPROVE' | 'REJECT' | 'FLAG',
    note?: string
  ): Promise<void> {
    try {
      const status = action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : 'FLAGGED';

      await this.db.review.update({
        where: { id: reviewId },
        data: {
          status,
          moderatorNote: note,
          updatedAt: new Date(),
        },
      });

      // Log moderation action
      await this.db.reviewModerationLog.create({
        data: {
          reviewId,
          moderatorId,
          action,
          note,
          createdAt: new Date(),
        },
      });

      logger.info('Review moderated', {
        reviewId,
        moderatorId,
        action,
        note,
      });
    } catch (error) {
      logger.error('Failed to moderate review', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reviewId,
        moderatorId,
        action,
      });
      throw error;
    }
  }

  /**
   * Get user's reviews
   */
  async getUserReviews(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    reviews: Review[];
    total: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        this.db.review.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            product: {
              select: {
                name: true,
                images: true,
              },
            },
          },
        }),
        this.db.review.count({ where: { userId } }),
      ]);

      return {
        reviews: reviews.map(this.mapPrismaReviewToInterface),
        total,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Failed to get user reviews', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * Flag review for inappropriate content
   */
  async flagReview(
    reviewId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    try {
      // Check if user already flagged this review
      const existingFlag = await this.db.reviewFlag.findFirst({
        where: { reviewId, userId },
      });

      if (existingFlag) {
        throw new Error('You have already flagged this review');
      }

      // Create flag
      await this.db.reviewFlag.create({
        data: {
          reviewId,
          userId,
          reason,
        },
      });

      // Count total flags for this review
      const flagCount = await this.db.reviewFlag.count({
        where: { reviewId },
      });

      // Auto-flag review if it has multiple flags
      if (flagCount >= 3) {
        await this.db.review.update({
          where: { id: reviewId },
          data: {
            status: 'FLAGGED',
            flaggedReasons: { push: 'Multiple user reports' },
          },
        });
      }

      logger.info('Review flagged', {
        reviewId,
        userId,
        reason,
        totalFlags: flagCount,
      });
    } catch (error) {
      logger.error('Failed to flag review', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reviewId,
        userId,
        reason,
      });
      throw error;
    }
  }

  // Private helper methods

  private async verifyPurchase(
    userId: string,
    productId: string,
    orderId?: string
  ): Promise<boolean> {
    try {
      const whereClause: any = {
        userId,
        status: 'DELIVERED',
        items: {
          some: {
            productId,
          },
        },
      };

      if (orderId) {
        whereClause.id = orderId;
      }

      const order = await this.db.order.findFirst({
        where: whereClause,
      });

      return !!order;
    } catch (error) {
      logger.error('Failed to verify purchase', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        productId,
        orderId,
      });
      return false;
    }
  }

  private analyzeSentiment(text: string): {
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    sentimentScore: number;
  } {
    // Simple sentiment analysis (in production, use ML service)
    const positiveWords = [
      'yaxshi', 'ajoyib', 'zo\'r', 'mukammal', 'good', 'great', 'excellent', 'amazing',
      'love', 'fantastic', 'wonderful', 'awesome', 'perfect', 'outstanding',
    ];
    
    const negativeWords = [
      'yomon', 'juda yomon', 'bad', 'terrible', 'awful', 'horrible', 'hate',
      'worst', 'disappointing', 'useless', 'broken', 'defective',
    ];

    const lowerText = text.toLowerCase();
    let score = 0;

    positiveWords.forEach(word => {
      if (lowerText.includes(word)) score += 1;
    });

    negativeWords.forEach(word => {
      if (lowerText.includes(word)) score -= 1;
    });

    // Normalize score between -1 and 1
    const normalizedScore = Math.max(-1, Math.min(1, score / 5));

    let sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    if (normalizedScore > 0.2) {
      sentiment = 'POSITIVE';
    } else if (normalizedScore < -0.2) {
      sentiment = 'NEGATIVE';
    } else {
      sentiment = 'NEUTRAL';
    }

    return {
      sentiment,
      sentimentScore: parseFloat(normalizedScore.toFixed(2)),
    };
  }

  private checkInappropriateContent(title: string, comment: string): string[] {
    const inappropriateWords = [
      'spam', 'scam', 'fake', 'yolg\'on', 'aldash', 'bepul',
      // Add more inappropriate words as needed
    ];

    const flaggedReasons: string[] = [];
    const fullText = `${title} ${comment}`.toLowerCase();

    inappropriateWords.forEach(word => {
      if (fullText.includes(word)) {
        flaggedReasons.push(`Contains inappropriate word: ${word}`);
      }
    });

    // Check for excessive caps
    if (title.length > 10 && title === title.toUpperCase()) {
      flaggedReasons.push('Excessive use of capital letters');
    }

    // Check for very short reviews
    if (comment.length < 10) {
      flaggedReasons.push('Review too short');
    }

    return flaggedReasons;
  }

  private async updateProductRating(productId: string): Promise<void> {
    try {
      const reviews = await this.db.review.findMany({
        where: {
          productId,
          status: 'APPROVED',
        },
        select: { rating: true },
      });

      const averageRating = reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0;

      await this.db.product.update({
        where: { id: productId },
        data: {
          rating: parseFloat(averageRating.toFixed(1)),
          reviewCount: reviews.length,
        },
      });
    } catch (error) {
      logger.error('Failed to update product rating', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId,
      });
    }
  }

  private async updateUserReviewStats(userId: string): Promise<void> {
    try {
      const reviews = await this.db.review.findMany({
        where: {
          userId,
          status: 'APPROVED',
        },
        select: { rating: true },
      });

      const averageRating = reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0;

      await this.db.user.update({
        where: { id: userId },
        data: {
          reviewCount: reviews.length,
          averageRating: parseFloat(averageRating.toFixed(1)),
        },
      });
    } catch (error) {
      logger.error('Failed to update user review stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
    }
  }

  private mapPrismaReviewToInterface = (prismaReview: any): Review => {
    return {
      id: prismaReview.id,
      userId: prismaReview.userId,
      productId: prismaReview.productId,
      orderId: prismaReview.orderId,
      rating: prismaReview.rating,
      title: prismaReview.title,
      comment: prismaReview.comment,
      pros: prismaReview.pros || [],
      cons: prismaReview.cons || [],
      verified: prismaReview.verified,
      helpful: prismaReview.helpful,
      notHelpful: prismaReview.notHelpful,
      status: prismaReview.status,
      moderatorNote: prismaReview.moderatorNote,
      images: prismaReview.images || [],
      sentiment: prismaReview.sentiment,
      sentimentScore: prismaReview.sentimentScore,
      flaggedReasons: prismaReview.flaggedReasons || [],
      createdAt: prismaReview.createdAt,
      updatedAt: prismaReview.updatedAt,
      user: prismaReview.user ? {
        firstName: prismaReview.user.firstName,
        lastName: prismaReview.user.lastName,
        avatar: prismaReview.user.avatar,
        reviewCount: prismaReview.user.reviewCount || 0,
        averageRating: prismaReview.user.averageRating || 0,
      } : undefined,
      product: prismaReview.product ? {
        name: prismaReview.product.name,
        image: prismaReview.product.images?.[0] || '',
      } : undefined,
    };
  };
}