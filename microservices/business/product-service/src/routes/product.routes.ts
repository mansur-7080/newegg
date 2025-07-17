/**
 * Product Routes
 * Professional product management API endpoints
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { ProductController } from '../controllers/product.controller';
import { validateRequest } from '@ultramarket/shared/middleware/validation';
import { authenticate, authorize } from '@ultramarket/shared/middleware/auth';
import { rateLimit } from '@ultramarket/shared/middleware/rate-limit';
import { cacheMiddleware } from '@ultramarket/shared/middleware/cache';

const router = Router();

// Rate limiting for product endpoints
const productRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many product requests from this IP',
});

// Validation schemas
const createProductValidation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Product name must be between 3 and 255 characters'),
  body('description')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('category')
    .isMongoId()
    .withMessage('Category must be a valid MongoDB ObjectId'),
  body('sku')
    .trim()
    .isAlphanumeric()
    .isLength({ min: 3, max: 50 })
    .withMessage('SKU must be alphanumeric, 3-50 characters'),
  body('inventory.quantity')
    .isInt({ min: 0 })
    .withMessage('Inventory quantity must be a non-negative integer'),
  body('inventory.tracked')
    .isBoolean()
    .withMessage('Inventory tracked must be a boolean'),
  body('status')
    .optional()
    .isIn(['draft', 'active', 'archived'])
    .withMessage('Status must be draft, active, or archived'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('brand')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Brand must be less than 100 characters'),
  body('weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),
  body('dimensions.length')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Dimensions length must be positive'),
  body('dimensions.width')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Dimensions width must be positive'),
  body('dimensions.height')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Dimensions height must be positive'),
];

const updateProductValidation = [
  param('id').isMongoId().withMessage('Product ID must be a valid MongoDB ObjectId'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Product name must be between 3 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('category')
    .optional()
    .isMongoId()
    .withMessage('Category must be a valid MongoDB ObjectId'),
  body('inventory.quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Inventory quantity must be a non-negative integer'),
  body('status')
    .optional()
    .isIn(['draft', 'active', 'archived'])
    .withMessage('Status must be draft, active, or archived'),
];

const searchValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn(['name', 'price', 'createdAt', 'updatedAt', 'rating'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be non-negative'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be non-negative'),
  query('category')
    .optional()
    .isMongoId()
    .withMessage('Category must be a valid MongoDB ObjectId'),
  query('brand')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Brand filter must be less than 100 characters'),
  query('status')
    .optional()
    .isIn(['draft', 'active', 'archived'])
    .withMessage('Status must be draft, active, or archived'),
];

// Public routes (no authentication required)

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: Get all products with filtering and pagination
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for product name or description
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, price, createdAt, updatedAt, rating]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of products
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/', 
  productRateLimit,
  searchValidation,
  validateRequest,
  cacheMiddleware(60), // Cache for 1 minute
  ProductController.getProducts
);

/**
 * @swagger
 * /api/v1/products/featured:
 *   get:
 *     summary: Get featured products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Number of featured products to return
 *     responses:
 *       200:
 *         description: List of featured products
 */
router.get('/featured',
  productRateLimit,
  cacheMiddleware(300), // Cache for 5 minutes
  ProductController.getFeaturedProducts
);

/**
 * @swagger
 * /api/v1/products/categories/{categoryId}:
 *   get:
 *     summary: Get products by category
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Products in category
 *       400:
 *         description: Invalid category ID
 *       404:
 *         description: Category not found
 */
router.get('/categories/:categoryId',
  productRateLimit,
  param('categoryId').isMongoId(),
  validateRequest,
  cacheMiddleware(120), // Cache for 2 minutes
  ProductController.getProductsByCategory
);

/**
 * @swagger
 * /api/v1/products/search:
 *   get:
 *     summary: Search products with advanced filtering
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Invalid search parameters
 */
router.get('/search',
  productRateLimit,
  query('q').trim().isLength({ min: 1 }).withMessage('Search query is required'),
  searchValidation,
  validateRequest,
  ProductController.searchProducts
);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *       400:
 *         description: Invalid product ID
 *       404:
 *         description: Product not found
 */
router.get('/:id',
  productRateLimit,
  param('id').isMongoId().withMessage('Product ID must be a valid MongoDB ObjectId'),
  validateRequest,
  cacheMiddleware(300), // Cache for 5 minutes
  ProductController.getProductById
);

/**
 * @swagger
 * /api/v1/products/slug/{slug}:
 *   get:
 *     summary: Get product by slug
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Product slug
 *     responses:
 *       200:
 *         description: Product details
 *       400:
 *         description: Invalid slug
 *       404:
 *         description: Product not found
 */
router.get('/slug/:slug',
  productRateLimit,
  param('slug').trim().isLength({ min: 1 }).withMessage('Slug is required'),
  validateRequest,
  cacheMiddleware(300), // Cache for 5 minutes
  ProductController.getProductBySlug
);

// Protected routes (authentication required)

/**
 * @swagger
 * /api/v1/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - price
 *               - category
 *               - sku
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *               sku:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/',
  authenticate,
  authorize(['vendor', 'admin']),
  createProductValidation,
  validateRequest,
  ProductController.createProduct
);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   put:
 *     summary: Update product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Product not found
 */
router.put('/:id',
  authenticate,
  authorize(['vendor', 'admin']),
  updateProductValidation,
  validateRequest,
  ProductController.updateProduct
);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   delete:
 *     summary: Delete product (soft delete)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Product not found
 */
router.delete('/:id',
  authenticate,
  authorize(['vendor', 'admin']),
  param('id').isMongoId().withMessage('Product ID must be a valid MongoDB ObjectId'),
  validateRequest,
  ProductController.deleteProduct
);

/**
 * @swagger
 * /api/v1/products/{id}/inventory:
 *   patch:
 *     summary: Update product inventory
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *               tracked:
 *                 type: boolean
 *               allowBackorder:
 *                 type: boolean
 *               lowStockThreshold:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Inventory updated successfully
 */
router.patch('/:id/inventory',
  authenticate,
  authorize(['vendor', 'admin']),
  param('id').isMongoId().withMessage('Product ID must be a valid MongoDB ObjectId'),
  body('quantity').optional().isInt({ min: 0 }),
  body('tracked').optional().isBoolean(),
  body('allowBackorder').optional().isBoolean(),
  body('lowStockThreshold').optional().isInt({ min: 0 }),
  validateRequest,
  ProductController.updateInventory
);

/**
 * @swagger
 * /api/v1/products/{id}/status:
 *   patch:
 *     summary: Update product status
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, active, archived]
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch('/:id/status',
  authenticate,
  authorize(['vendor', 'admin']),
  param('id').isMongoId().withMessage('Product ID must be a valid MongoDB ObjectId'),
  body('status').isIn(['draft', 'active', 'archived']).withMessage('Invalid status'),
  validateRequest,
  ProductController.updateStatus
);

// Admin only routes

/**
 * @swagger
 * /api/v1/products/{id}/featured:
 *   patch:
 *     summary: Toggle product featured status (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Featured status updated
 */
router.patch('/:id/featured',
  authenticate,
  authorize(['admin']),
  param('id').isMongoId().withMessage('Product ID must be a valid MongoDB ObjectId'),
  validateRequest,
  ProductController.toggleFeatured
);

/**
 * @swagger
 * /api/v1/products/bulk/import:
 *   post:
 *     summary: Bulk import products (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Products imported successfully
 */
router.post('/bulk/import',
  authenticate,
  authorize(['admin']),
  body('products').isArray().withMessage('Products must be an array'),
  validateRequest,
  ProductController.bulkImport
);

/**
 * @swagger
 * /api/v1/products/analytics/summary:
 *   get:
 *     summary: Get product analytics summary (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics summary
 */
router.get('/analytics/summary',
  authenticate,
  authorize(['admin']),
  cacheMiddleware(600), // Cache for 10 minutes
  ProductController.getAnalyticsSummary
);

export default router;