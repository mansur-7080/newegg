import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Validation schemas
const reviewValidation = {
  content: {
    min: 10,
    max: 1000,
    required: true,
  },
  rating: {
    min: 1,
    max: 5,
    required: true,
  },
  productId: {
    required: true,
    pattern: /^[a-fA-F0-9]{24}$/, // MongoDB ObjectId pattern
  },
};

const replyValidation = {
  content: {
    min: 1,
    max: 500,
    required: true,
  },
  userType: {
    enum: ['customer', 'vendor', 'admin'],
    required: true,
  },
};

const voteValidation = {
  vote: {
    enum: [true, false],
    required: true,
  },
};

const flagValidation = {
  reason: {
    enum: ['inappropriate', 'spam', 'fake', 'offensive', 'other'],
    required: true,
  },
  description: {
    max: 500,
    required: false,
  },
};

// Helper function to validate string length
function validateStringLength(value: string, min: number, max: number): boolean {
  if (!value || typeof value !== 'string') return false;
  return value.length >= min && value.length <= max;
}

// Helper function to validate MongoDB ObjectId
function validateObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

// Helper function to validate enum values
function validateEnum(value: any, allowedValues: any[]): boolean {
  return allowedValues.includes(value);
}

// Helper function to validate number range
function validateNumberRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && value >= min && value <= max;
}

// Helper function to sanitize input
function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// Helper function to validate pagination parameters
function validatePagination(page: any, limit: any): { page: number; limit: number } {
  const defaultPage = 1;
  const defaultLimit = 20;
  const maxLimit = 100;

  const pageNum = parseInt(page as string) || defaultPage;
  const limitNum = parseInt(limit as string) || defaultLimit;

  return {
    page: Math.max(1, pageNum),
    limit: Math.min(maxLimit, Math.max(1, limitNum)),
  };
}

// Validation middleware for creating reviews
export const validateCreateReview = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { content, rating, productId } = req.body;

    const errors: string[] = [];

    // Validate content
    if (!content || !validateStringLength(content, reviewValidation.content.min, reviewValidation.content.max)) {
      errors.push(`Content must be between ${reviewValidation.content.min} and ${reviewValidation.content.max} characters`);
    }

    // Validate rating
    if (!rating || !validateNumberRange(rating, reviewValidation.rating.min, reviewValidation.rating.max)) {
      errors.push(`Rating must be between ${reviewValidation.rating.min} and ${reviewValidation.rating.max}`);
    }

    // Validate productId
    if (!productId || !validateObjectId(productId)) {
      errors.push('Valid product ID is required');
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }

    // Sanitize content
    req.body.content = sanitizeString(content);

    next();
  } catch (error) {
    logger.error('Validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Validation error occurred',
    });
  }
};

// Validation middleware for updating reviews
export const validateUpdateReview = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { id } = req.params;
    const { content, rating } = req.body;

    const errors: string[] = [];

    // Validate review ID
    if (!id || !validateObjectId(id)) {
      errors.push('Valid review ID is required');
    }

    // Validate content if provided
    if (content !== undefined) {
      if (!validateStringLength(content, reviewValidation.content.min, reviewValidation.content.max)) {
        errors.push(`Content must be between ${reviewValidation.content.min} and ${reviewValidation.content.max} characters`);
      } else {
        req.body.content = sanitizeString(content);
      }
    }

    // Validate rating if provided
    if (rating !== undefined) {
      if (!validateNumberRange(rating, reviewValidation.rating.min, reviewValidation.rating.max)) {
        errors.push(`Rating must be between ${reviewValidation.rating.min} and ${reviewValidation.rating.max}`);
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Validation error occurred',
    });
  }
};

// Validation middleware for review ID
export const validateReviewId = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { id } = req.params;

    if (!id || !validateObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Valid review ID is required',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Validation error occurred',
    });
  }
};

// Validation middleware for adding replies
export const validateAddReply = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { content, userType } = req.body;

    const errors: string[] = [];

    // Validate content
    if (!content || !validateStringLength(content, replyValidation.content.min, replyValidation.content.max)) {
      errors.push(`Reply content must be between ${replyValidation.content.min} and ${replyValidation.content.max} characters`);
    }

    // Validate userType
    if (!userType || !validateEnum(userType, replyValidation.userType.enum)) {
      errors.push(`User type must be one of: ${replyValidation.userType.enum.join(', ')}`);
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }

    // Sanitize content
    req.body.content = sanitizeString(content);

    next();
  } catch (error) {
    logger.error('Validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Validation error occurred',
    });
  }
};

// Validation middleware for voting
export const validateVote = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { vote } = req.body;

    if (vote === undefined || !validateEnum(vote, voteValidation.vote.enum)) {
      res.status(400).json({
        success: false,
        message: 'Valid vote (true/false) is required',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Validation error occurred',
    });
  }
};

// Validation middleware for flagging reviews
export const validateFlagReview = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { reason, description } = req.body;

    const errors: string[] = [];

    // Validate reason
    if (!reason || !validateEnum(reason, flagValidation.reason.enum)) {
      errors.push(`Reason must be one of: ${flagValidation.reason.enum.join(', ')}`);
    }

    // Validate description if provided
    if (description && !validateStringLength(description, 1, flagValidation.description.max!)) {
      errors.push(`Description must be no more than ${flagValidation.description.max} characters`);
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }

    // Sanitize description
    if (description) {
      req.body.description = sanitizeString(description);
    }

    next();
  } catch (error) {
    logger.error('Validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Validation error occurred',
    });
  }
};

// Validation middleware for query parameters
export const validateQueryParams = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { page, limit, rating, verified, sortBy, sortOrder } = req.query;

    // Validate pagination
    const pagination = validatePagination(page, limit);
    req.query.page = pagination.page.toString();
    req.query.limit = pagination.limit.toString();

    // Validate rating if provided
    if (rating !== undefined) {
      const ratingNum = parseInt(rating as string);
      if (isNaN(ratingNum) || !validateNumberRange(ratingNum, 1, 5)) {
        res.status(400).json({
          success: false,
          message: 'Rating must be a number between 1 and 5',
        });
        return;
      }
    }

    // Validate verified if provided
    if (verified !== undefined && verified !== 'true' && verified !== 'false') {
      res.status(400).json({
        success: false,
        message: 'Verified must be true or false',
      });
      return;
    }

    // Validate sortBy if provided
    const allowedSortFields = ['createdAt', 'rating', 'helpful', 'verified'];
    if (sortBy && !validateEnum(sortBy, allowedSortFields)) {
      res.status(400).json({
        success: false,
        message: `Sort field must be one of: ${allowedSortFields.join(', ')}`,
      });
      return;
    }

    // Validate sortOrder if provided
    if (sortOrder && !validateEnum(sortOrder, ['asc', 'desc'])) {
      res.status(400).json({
        success: false,
        message: 'Sort order must be asc or desc',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Validation error occurred',
    });
  }
};

// Validation middleware for search queries
export const validateSearchQuery = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { q, productId, rating, page, limit } = req.query;

    // Validate search query
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long',
      });
      return;
    }

    // Validate productId if provided
    if (productId && !validateObjectId(productId as string)) {
      res.status(400).json({
        success: false,
        message: 'Valid product ID is required',
      });
      return;
    }

    // Validate rating if provided
    if (rating !== undefined) {
      const ratingNum = parseInt(rating as string);
      if (isNaN(ratingNum) || !validateNumberRange(ratingNum, 1, 5)) {
        res.status(400).json({
          success: false,
          message: 'Rating must be a number between 1 and 5',
        });
        return;
      }
    }

    // Validate pagination
    const pagination = validatePagination(page, limit);
    req.query.page = pagination.page.toString();
    req.query.limit = pagination.limit.toString();

    // Sanitize search query
    req.query.q = sanitizeString(q as string);

    next();
  } catch (error) {
    logger.error('Validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Validation error occurred',
    });
  }
};

// Sanitization middleware for all requests
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Sanitize body
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = sanitizeString(req.body[key]);
        }
      });
    }

    // Sanitize query parameters
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          req.query[key] = sanitizeString(req.query[key] as string);
        }
      });
    }

    next();
  } catch (error) {
    logger.error('Sanitization error:', error);
    next();
  }
};
