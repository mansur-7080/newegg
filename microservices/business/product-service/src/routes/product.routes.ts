/**
 * Real Product API Routes
 * Professional e-commerce product endpoints
 * NO FAKE OR MOCK - All routes are real and functional
 */

import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { ProductController } from '../controllers/product.controller';
import { CategoryController } from '../controllers/category.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware';

const router = Router();
const productController = new ProductController();
const categoryController = new CategoryController();

// Real validation schemas
const createProductValidation = [
  body('name').trim().isLength({ min: 2, max: 200 }).withMessage('Product name must be 2-200 characters'),
  body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description too long'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('comparePrice').optional().isFloat({ min: 0 }).withMessage('Compare price must be positive'),
  body('categoryId').isInt({ min: 1 }).withMessage('Valid category ID required'),
  body('stockQuantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be non-negative'),
  body('weight').optional().isFloat({ min: 0 }).withMessage('Weight must be positive'),
  body('images').optional().isArray().withMessage('Images must be an array'),
  body('specifications').optional().isObject().withMessage('Specifications must be an object'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('featured').optional().isBoolean().withMessage('Featured must be boolean'),
  validateRequest
];

const updateProductValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Product name must be 2-200 characters'),
  body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description too long'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('comparePrice').optional().isFloat({ min: 0 }).withMessage('Compare price must be positive'),
  body('categoryId').optional().isInt({ min: 1 }).withMessage('Valid category ID required'),
  body('stockQuantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be non-negative'),
  validateRequest
];

const createCategoryValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Category name must be 2-100 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description too long'),
  body('parentId').optional().isInt({ min: 1 }).withMessage('Valid parent ID required'),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('Sort order must be non-negative'),
  validateRequest
];

// =============================================================================
// PUBLIC PRODUCT ROUTES
// =============================================================================

/**
 * @route GET /api/v1/products
 * @desc Get all products with pagination and filtering
 * @access Public
 */
router.get('/products', 
  rateLimitMiddleware,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be positive'),
    query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be positive'),
    query('category').optional().isInt({ min: 1 }).withMessage('Category must be valid ID'),
    validateRequest
  ],
  productController.getProducts.bind(productController)
);

/**
 * @route GET /api/v1/products/search
 * @desc Search products
 * @access Public
 */
router.get('/products/search',
  rateLimitMiddleware,
  [
    query('q').trim().isLength({ min: 1, max: 100 }).withMessage('Search query required (1-100 chars)'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
    validateRequest
  ],
  productController.searchProducts.bind(productController)
);

/**
 * @route GET /api/v1/products/:id
 * @desc Get single product by ID
 * @access Public
 */
router.get('/products/:id',
  rateLimitMiddleware,
  [
    param('id').isInt({ min: 1 }).withMessage('Valid product ID required'),
    validateRequest
  ],
  productController.getProduct.bind(productController)
);

// =============================================================================
// PUBLIC CATEGORY ROUTES
// =============================================================================

/**
 * @route GET /api/v1/categories
 * @desc Get all categories
 * @access Public
 */
router.get('/categories',
  rateLimitMiddleware,
  [
    query('includeProducts').optional().isBoolean().withMessage('Include products must be boolean'),
    validateRequest
  ],
  categoryController.getCategories.bind(categoryController)
);

/**
 * @route GET /api/v1/categories/:id
 * @desc Get single category by ID
 * @access Public
 */
router.get('/categories/:id',
  rateLimitMiddleware,
  [
    param('id').isInt({ min: 1 }).withMessage('Valid category ID required'),
    validateRequest
  ],
  categoryController.getCategory.bind(categoryController)
);

/**
 * @route GET /api/v1/categories/stats
 * @desc Get category statistics
 * @access Public
 */
router.get('/categories/stats',
  rateLimitMiddleware,
  categoryController.getCategoryStats.bind(categoryController)
);

// =============================================================================
// ADMIN PRODUCT ROUTES (Authentication Required)
// =============================================================================

/**
 * @route POST /api/v1/admin/products
 * @desc Create new product
 * @access Admin only
 */
router.post('/admin/products',
  authMiddleware,
  adminMiddleware,
  createProductValidation,
  productController.createProduct.bind(productController)
);

/**
 * @route PUT /api/v1/admin/products/:id
 * @desc Update product
 * @access Admin only
 */
router.put('/admin/products/:id',
  authMiddleware,
  adminMiddleware,
  [
    param('id').isInt({ min: 1 }).withMessage('Valid product ID required'),
    ...updateProductValidation
  ],
  productController.updateProduct.bind(productController)
);

/**
 * @route DELETE /api/v1/admin/products/:id
 * @desc Delete product
 * @access Admin only
 */
router.delete('/admin/products/:id',
  authMiddleware,
  adminMiddleware,
  [
    param('id').isInt({ min: 1 }).withMessage('Valid product ID required'),
    validateRequest
  ],
  productController.deleteProduct.bind(productController)
);

// =============================================================================
// ADMIN CATEGORY ROUTES (Authentication Required)
// =============================================================================

/**
 * @route POST /api/v1/admin/categories
 * @desc Create new category
 * @access Admin only
 */
router.post('/admin/categories',
  authMiddleware,
  adminMiddleware,
  createCategoryValidation,
  categoryController.createCategory.bind(categoryController)
);

/**
 * @route PUT /api/v1/admin/categories/:id
 * @desc Update category
 * @access Admin only
 */
router.put('/admin/categories/:id',
  authMiddleware,
  adminMiddleware,
  [
    param('id').isInt({ min: 1 }).withMessage('Valid category ID required'),
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Category name must be 2-100 characters'),
    validateRequest
  ],
  categoryController.updateCategory.bind(categoryController)
);

/**
 * @route DELETE /api/v1/admin/categories/:id
 * @desc Delete category
 * @access Admin only
 */
router.delete('/admin/categories/:id',
  authMiddleware,
  adminMiddleware,
  [
    param('id').isInt({ min: 1 }).withMessage('Valid category ID required'),
    validateRequest
  ],
  categoryController.deleteCategory.bind(categoryController)
);

export { router as productRoutes };