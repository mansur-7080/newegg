/**
 * Product Routes - Prisma Based
 * Professional RESTful API routes with middleware and validation
 */

import { Router } from 'express';
import {
  createProduct,
  getProductById,
  getProductBySlug,
  getProducts,
  updateProduct,
  deleteProduct,
  searchProducts,
  getFeaturedProducts,
  getProductsByCategory,
  getProductStatistics,
  bulkUpdateProducts,
} from '../controllers/product.controller';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware';
import { validationMiddleware } from '../middleware/validation.middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';

const router = Router();

/**
 * Public routes (no authentication required)
 */

// Get products with filtering and pagination
router.get(
  '/',
  rateLimitMiddleware(100, 15), // 100 requests per 15 minutes
  optionalAuthMiddleware, // Optional auth for personalized results
  getProducts
);

// Search products
router.get(
  '/search',
  rateLimitMiddleware(50, 15), // 50 searches per 15 minutes
  optionalAuthMiddleware,
  searchProducts
);

// Get featured products
router.get(
  '/featured',
  rateLimitMiddleware(60, 15), // 60 requests per 15 minutes
  getFeaturedProducts
);

// Get product statistics (for dashboards)
router.get(
  '/statistics',
  rateLimitMiddleware(10, 15), // 10 requests per 15 minutes
  getProductStatistics
);

// Get products by category
router.get(
  '/category/:categoryId',
  rateLimitMiddleware(100, 15), // 100 requests per 15 minutes
  optionalAuthMiddleware,
  validationMiddleware('params', {
    categoryId: {
      isUUID: {
        errorMessage: 'Category ID must be a valid UUID',
      },
    },
  }),
  getProductsByCategory
);

// Get product by slug (for SEO-friendly URLs)
router.get(
  '/slug/:slug',
  rateLimitMiddleware(200, 15), // 200 requests per 15 minutes
  optionalAuthMiddleware,
  validationMiddleware('params', {
    slug: {
      isLength: {
        options: { min: 1, max: 200 },
        errorMessage: 'Slug must be between 1 and 200 characters',
      },
      matches: {
        options: /^[a-z0-9-]+$/,
        errorMessage: 'Slug can only contain lowercase letters, numbers, and hyphens',
      },
    },
  }),
  getProductBySlug
);

// Get product by ID
router.get(
  '/:id',
  rateLimitMiddleware(200, 15), // 200 requests per 15 minutes
  optionalAuthMiddleware,
  validationMiddleware('params', {
    id: {
      isUUID: {
        errorMessage: 'Product ID must be a valid UUID',
      },
    },
  }),
  getProductById
);

/**
 * Protected routes (authentication required)
 */

// Create new product (vendors and admins only)
router.post(
  '/',
  authMiddleware(['VENDOR', 'ADMIN']),
  rateLimitMiddleware(20, 15), // 20 creations per 15 minutes
  validationMiddleware('body', {
    name: {
      notEmpty: {
        errorMessage: 'Product name is required',
      },
      isLength: {
        options: { min: 2, max: 200 },
        errorMessage: 'Product name must be between 2 and 200 characters',
      },
    },
    sku: {
      notEmpty: {
        errorMessage: 'SKU is required',
      },
      isLength: {
        options: { min: 3, max: 50 },
        errorMessage: 'SKU must be between 3 and 50 characters',
      },
      matches: {
        options: /^[A-Z0-9-_]+$/,
        errorMessage: 'SKU can only contain uppercase letters, numbers, hyphens, and underscores',
      },
    },
    price: {
      isFloat: {
        options: { min: 0.01, max: 999999.99 },
        errorMessage: 'Price must be between 0.01 and 999999.99',
      },
    },
    description: {
      optional: true,
      isLength: {
        options: { max: 5000 },
        errorMessage: 'Description must not exceed 5000 characters',
      },
    },
    shortDescription: {
      optional: true,
      isLength: {
        options: { max: 500 },
        errorMessage: 'Short description must not exceed 500 characters',
      },
    },
    categoryId: {
      optional: true,
      isUUID: {
        errorMessage: 'Category ID must be a valid UUID',
      },
    },
    tags: {
      optional: true,
      isArray: {
        options: { max: 20 },
        errorMessage: 'Maximum 20 tags allowed',
      },
    },
    weight: {
      optional: true,
      isFloat: {
        options: { min: 0 },
        errorMessage: 'Weight must be a positive number',
      },
    },
    comparePrice: {
      optional: true,
      isFloat: {
        options: { min: 0.01 },
        errorMessage: 'Compare price must be a positive number',
      },
    },
    costPrice: {
      optional: true,
      isFloat: {
        options: { min: 0 },
        errorMessage: 'Cost price must be a non-negative number',
      },
    },
  }),
  createProduct
);

// Update product (owners and admins only)
router.put(
  '/:id',
  authMiddleware(['VENDOR', 'ADMIN']),
  rateLimitMiddleware(30, 15), // 30 updates per 15 minutes
  validationMiddleware('params', {
    id: {
      isUUID: {
        errorMessage: 'Product ID must be a valid UUID',
      },
    },
  }),
  validationMiddleware('body', {
    name: {
      optional: true,
      isLength: {
        options: { min: 2, max: 200 },
        errorMessage: 'Product name must be between 2 and 200 characters',
      },
    },
    sku: {
      optional: true,
      isLength: {
        options: { min: 3, max: 50 },
        errorMessage: 'SKU must be between 3 and 50 characters',
      },
      matches: {
        options: /^[A-Z0-9-_]+$/,
        errorMessage: 'SKU can only contain uppercase letters, numbers, hyphens, and underscores',
      },
    },
    price: {
      optional: true,
      isFloat: {
        options: { min: 0.01, max: 999999.99 },
        errorMessage: 'Price must be between 0.01 and 999999.99',
      },
    },
    description: {
      optional: true,
      isLength: {
        options: { max: 5000 },
        errorMessage: 'Description must not exceed 5000 characters',
      },
    },
    shortDescription: {
      optional: true,
      isLength: {
        options: { max: 500 },
        errorMessage: 'Short description must not exceed 500 characters',
      },
    },
    categoryId: {
      optional: true,
      isUUID: {
        errorMessage: 'Category ID must be a valid UUID',
      },
    },
    tags: {
      optional: true,
      isArray: {
        options: { max: 20 },
        errorMessage: 'Maximum 20 tags allowed',
      },
    },
    weight: {
      optional: true,
      isFloat: {
        options: { min: 0 },
        errorMessage: 'Weight must be a positive number',
      },
    },
    comparePrice: {
      optional: true,
      isFloat: {
        options: { min: 0.01 },
        errorMessage: 'Compare price must be a positive number',
      },
    },
    costPrice: {
      optional: true,
      isFloat: {
        options: { min: 0 },
        errorMessage: 'Cost price must be a non-negative number',
      },
    },
  }),
  updateProduct
);

// Delete product (owners and admins only)
router.delete(
  '/:id',
  authMiddleware(['VENDOR', 'ADMIN']),
  rateLimitMiddleware(10, 15), // 10 deletions per 15 minutes
  validationMiddleware('params', {
    id: {
      isUUID: {
        errorMessage: 'Product ID must be a valid UUID',
      },
    },
  }),
  deleteProduct
);

// Bulk update products (admins only)
router.patch(
  '/bulk',
  authMiddleware(['ADMIN']),
  rateLimitMiddleware(5, 15), // 5 bulk operations per 15 minutes
  validationMiddleware('body', {
    ids: {
      isArray: {
        options: { min: 1, max: 100 },
        errorMessage: 'IDs array must contain between 1 and 100 items',
      },
    },
    'ids.*': {
      isUUID: {
        errorMessage: 'Each ID must be a valid UUID',
      },
    },
    data: {
      isObject: {
        errorMessage: 'Update data must be an object',
      },
    },
  }),
  bulkUpdateProducts
);

export default router;
