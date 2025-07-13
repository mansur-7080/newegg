import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        permissions?: string[];
      };
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    permissions?: string[];
  };
}

export interface ReviewFilters {
  productId?: string;
  userId?: string;
  rating?: number;
  verified?: boolean;
  moderationStatus?: 'pending' | 'approved' | 'rejected';
  helpful?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ReviewSortOptions {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    [key: number]: number;
  };
  verifiedReviews: number;
  helpfulReviews: number;
}

export interface ReviewVote {
  userId: string;
  reviewId: string;
  helpful: boolean;
  createdAt: Date;
}

export interface ReviewFlag {
  userId: string;
  reviewId: string;
  reason: string;
  description?: string;
  createdAt: Date;
}

export interface ReviewReply {
  id: string;
  reviewId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewSearchFilters {
  query?: string;
  productId?: string;
  userId?: string;
  rating?: number;
  verified?: boolean;
  moderationStatus?: string;
  dateFrom?: Date;
  dateTo?: Date;
  helpful?: boolean;
}

export interface ReviewSearchOptions {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  highlight?: boolean;
}

export interface ReviewSearchResult {
  reviews: any[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  highlights?: {
    [key: string]: string[];
  };
}