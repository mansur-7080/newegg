import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface ReviewFilters {
  productId?: string;
  userId?: string;
  rating?: number;
  verified?: boolean;
  moderationStatus?: string;
  helpful?: boolean;
  flagged?: boolean;
}

export interface ReviewOptions {
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

export interface PaginatedReviews {
  reviews: any[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}