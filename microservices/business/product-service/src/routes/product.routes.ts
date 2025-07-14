/**
 * Product Routes
 * Professional API endpoints for UltraMarket Product Service
 */

import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authMiddleware, requireRole, requirePermission } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { rateLimit } from '../middleware/rate-limit.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';
import {
  validateProductInput,
  validateProductUpdateInput,
  validateProductSearchInput,
  validateBulkOperationInput,
} from '../validators/product.validator';

const router = Router();

// Rate limiting configurations
const createProductLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 products per 15 minutes per user
  message: 'Too many products created. Please try again later.',
});

const searchLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 searches per minute
  message: 'Too many search requests. Please try again later.',
});

const generalLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes
  message: 'Too many requests. Please try again later.',
});

// ===================
// PUBLIC ROUTES (no authentication required)
// ===================

/**
 * GET /api/v1/products
 * Get all products with filtering and pagination
 */
router.get(
  '/',
  searchLimit,
  validateRequest(validateProductSearchInput),
  cacheMiddleware(300), // 5 minutes cache
  ProductController.getProducts
);

/**
 * GET /api/v1/products/search
 * Search products with text query
 */
router.get(
  '/search',
  searchLimit,
  validateRequest(validateProductSearchInput),
  cacheMiddleware(300), // 5 minutes cache
  ProductController.searchProducts
);

/**
 * GET /api/v1/products/categories
 * Get product categories with statistics
 */
router.get(
  '/categories',
  generalLimit,
  cacheMiddleware(3600), // 1 hour cache
  ProductController.getProductCategories
);

/**
 * GET /api/v1/products/brands
 * Get product brands with statistics
 */
router.get(
  '/brands',
  generalLimit,
  cacheMiddleware(3600), // 1 hour cache
  ProductController.getProductBrands
);

/**
 * GET /api/v1/products/featured
 * Get featured products
 */
router.get(
  '/featured',
  generalLimit,
  cacheMiddleware(600), // 10 minutes cache
  ProductController.getFeaturedProducts
);

/**
 * GET /api/v1/products/:id
 * Get single product by ID
 */
router.get(
  '/:id',
  generalLimit,
  cacheMiddleware(1800), // 30 minutes cache
  ProductController.getProduct
);

/**
 * GET /api/v1/products/:id/recommendations
 * Get product recommendations
 */
router.get(
  '/:id/recommendations',
  generalLimit,
  cacheMiddleware(1800), // 30 minutes cache
  ProductController.getProductRecommendations
);

/**
 * GET /api/v1/products/:id/reviews
 * Get product reviews
 */
router.get(
  '/:id/reviews',
  generalLimit,
  cacheMiddleware(600), // 10 minutes cache
  ProductController.getProductReviews
);

/**
 * GET /api/v1/products/:id/similar
 * Get similar products
 */
router.get(
  '/:id/similar',
  generalLimit,
  cacheMiddleware(1800), // 30 minutes cache
  ProductController.getSimilarProducts
);

// ===================
// AUTHENTICATED ROUTES
// ===================

/**
 * POST /api/v1/products/:id/view
 * Track product view (for analytics)
 */
router.post(
  '/:id/view',
  generalLimit,
  authMiddleware({ required: false }), // Optional auth
  ProductController.trackProductView
);

/**
 * POST /api/v1/products/:id/wishlist
 * Add product to wishlist
 */
router.post(
  '/:id/wishlist',
  generalLimit,
  authMiddleware({ required: true }),
  ProductController.addToWishlist
);

/**
 * DELETE /api/v1/products/:id/wishlist
 * Remove product from wishlist
 */
router.delete(
  '/:id/wishlist',
  generalLimit,
  authMiddleware({ required: true }),
  ProductController.removeFromWishlist
);

// ===================
// VENDOR ROUTES (vendor authentication required)
// ===================

/**
 * POST /api/v1/products
 * Create new product (vendors only)
 */
router.post(
  '/',
  createProductLimit,
  authMiddleware({ required: true }),
  requireRole(['VENDOR', 'ADMIN']),
  validateRequest(validateProductInput),
  ProductController.createProduct
);

/**
 * PUT /api/v1/products/:id
 * Update product (vendor/admin only)
 */
router.put(
  '/:id',
  generalLimit,
  authMiddleware({ required: true }),
  requirePermission('product:write'),
  validateRequest(validateProductUpdateInput),
  ProductController.updateProduct
);

/**
 * PATCH /api/v1/products/:id/status
 * Update product status (vendor/admin only)
 */
router.patch(
  '/:id/status',
  generalLimit,
  authMiddleware({ required: true }),
  requirePermission('product:write'),
  ProductController.updateProductStatus
);

/**
 * PATCH /api/v1/products/:id/stock
 * Update product stock (vendor/admin only)
 */
router.patch(
  '/:id/stock',
  generalLimit,
  authMiddleware({ required: true }),
  requirePermission('product:write'),
  ProductController.updateProductStock
);

/**
 * PATCH /api/v1/products/:id/price
 * Update product price (vendor/admin only)
 */
router.patch(
  '/:id/price',
  generalLimit,
  authMiddleware({ required: true }),
  requirePermission('product:write'),
  ProductController.updateProductPrice
);

/**
 * POST /api/v1/products/:id/duplicate
 * Duplicate product (vendor/admin only)
 */
router.post(
  '/:id/duplicate',
  generalLimit,
  authMiddleware({ required: true }),
  requirePermission('product:write'),
  ProductController.duplicateProduct
);

/**
 * GET /api/v1/products/vendor/my
 * Get vendor's own products
 */
router.get(
  '/vendor/my',
  generalLimit,
  authMiddleware({ required: true }),
  requireRole(['VENDOR', 'ADMIN']),
  validateRequest(validateProductSearchInput),
  ProductController.getVendorProducts
);

/**
 * GET /api/v1/products/vendor/stats
 * Get vendor's product statistics
 */
router.get(
  '/vendor/stats',
  generalLimit,
  authMiddleware({ required: true }),
  requireRole(['VENDOR', 'ADMIN']),
  cacheMiddleware(600), // 10 minutes cache
  ProductController.getVendorProductStats
);

// ===================
// ADMIN ROUTES (admin authentication required)
// ===================

/**
 * DELETE /api/v1/products/:id
 * Delete product (admin only)
 */
router.delete(
  '/:id',
  generalLimit,
  authMiddleware({ required: true }),
  requirePermission('product:delete'),
  ProductController.deleteProduct
);

/**
 * POST /api/v1/products/bulk
 * Bulk operations on products (admin only)
 */
router.post(
  '/bulk',
  generalLimit,
  authMiddleware({ required: true }),
  requireRole(['ADMIN']),
  validateRequest(validateBulkOperationInput),
  ProductController.bulkOperations
);

/**
 * GET /api/v1/products/admin/stats
 * Get admin product statistics
 */
router.get(
  '/admin/stats',
  generalLimit,
  authMiddleware({ required: true }),
  requireRole(['ADMIN']),
  cacheMiddleware(600), // 10 minutes cache
  ProductController.getAdminProductStats
);

/**
 * GET /api/v1/products/admin/pending
 * Get products pending approval
 */
router.get(
  '/admin/pending',
  generalLimit,
  authMiddleware({ required: true }),
  requireRole(['ADMIN']),
  ProductController.getPendingProducts
);

/**
 * POST /api/v1/products/:id/approve
 * Approve product (admin only)
 */
router.post(
  '/:id/approve',
  generalLimit,
  authMiddleware({ required: true }),
  requireRole(['ADMIN']),
  ProductController.approveProduct
);

/**
 * POST /api/v1/products/:id/reject
 * Reject product (admin only)
 */
router.post(
  '/:id/reject',
  generalLimit,
  authMiddleware({ required: true }),
  requireRole(['ADMIN']),
  ProductController.rejectProduct
);

/**
 * POST /api/v1/products/:id/feature
 * Feature/unfeature product (admin only)
 */
router.post(
  '/:id/feature',
  generalLimit,
  authMiddleware({ required: true }),
  requireRole(['ADMIN']),
  ProductController.toggleFeaturedProduct
);

/**
 * GET /api/v1/products/:id/audit
 * Get product audit trail (admin only)
 */
router.get(
  '/:id/audit',
  generalLimit,
  authMiddleware({ required: true }),
  requireRole(['ADMIN']),
  ProductController.getProductAuditTrail
);

/**
 * POST /api/v1/products/import
 * Import products from CSV/Excel (admin only)
 */
router.post(
  '/import',
  generalLimit,
  authMiddleware({ required: true }),
  requireRole(['ADMIN']),
  ProductController.importProducts
);

/**
 * GET /api/v1/products/export
 * Export products to CSV (admin/vendor)
 */
router.get(
  '/export',
  generalLimit,
  authMiddleware({ required: true }),
  requireRole(['VENDOR', 'ADMIN']),
  ProductController.exportProducts
);

// ===================
// ANALYTICS ROUTES
// ===================

/**
 * GET /api/v1/products/:id/analytics
 * Get product analytics (vendor/admin only)
 */
router.get(
  '/:id/analytics',
  generalLimit,
  authMiddleware({ required: true }),
  requirePermission('product:analytics'),
  cacheMiddleware(300), // 5 minutes cache
  ProductController.getProductAnalytics
);

/**
 * GET /api/v1/products/analytics/trending
 * Get trending products
 */
router.get(
  '/analytics/trending',
  generalLimit,
  cacheMiddleware(600), // 10 minutes cache
  ProductController.getTrendingProducts
);

/**
 * GET /api/v1/products/analytics/top-selling
 * Get top selling products
 */
router.get(
  '/analytics/top-selling',
  generalLimit,
  cacheMiddleware(600), // 10 minutes cache
  ProductController.getTopSellingProducts
);

// ===================
// HEALTH CHECK
// ===================

/**
 * GET /api/v1/products/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'product-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.SERVICE_VERSION || '1.0.0',
  });
});

export default router;