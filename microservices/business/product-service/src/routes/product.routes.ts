/**
 * Product Routes
 * Simplified and functional product management routes
 */

import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';

const router = Router();

// ===================
// PUBLIC ROUTES
// ===================

/**
 * GET /api/v1/products
 * Get all products with filtering and pagination
 */
router.get('/', ProductController.getProducts);

/**
 * GET /api/v1/products/search
 * Search products
 */
router.get('/search', ProductController.searchProducts);

/**
 * GET /api/v1/products/featured
 * Get featured products
 */
router.get('/featured', ProductController.getFeaturedProducts);

/**
 * GET /api/v1/products/categories
 * Get all product categories
 */
router.get('/categories', ProductController.getProductCategories);

/**
 * GET /api/v1/products/brands
 * Get all product brands
 */
router.get('/brands', ProductController.getProductBrands);

/**
 * GET /api/v1/products/stats
 * Get product statistics
 */
router.get('/stats', ProductController.getProductStats);

/**
 * GET /api/v1/products/:id
 * Get product by ID
 */
router.get('/:id', ProductController.getProduct);

/**
 * GET /api/v1/products/:id/recommendations
 * Get product recommendations
 */
router.get('/:id/recommendations', ProductController.getProductRecommendations);

// ===================
// AUTHENTICATED ROUTES (require authentication)
// ===================

/**
 * POST /api/v1/products
 * Create a new product
 */
router.post('/', ProductController.createProduct);

/**
 * PUT /api/v1/products/:id
 * Update product
 */
router.put('/:id', ProductController.updateProduct);

/**
 * DELETE /api/v1/products/:id
 * Delete product
 */
router.delete('/:id', ProductController.deleteProduct);

export default router;