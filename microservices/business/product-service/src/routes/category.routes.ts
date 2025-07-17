/**
 * Category Routes
 * Professional category management API endpoints
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { CategoryController } from '../controllers/category.controller';
import { validateRequest } from '../shared/middleware/validation';
import { authenticate, authorize } from '../shared/middleware/auth';
import { rateLimit as defaultRateLimit } from '../shared/middleware/rate-limit';
import { cacheMiddleware } from '../shared/middleware/cache';

const router = Router();

// Rate limiting for category endpoints
const categoryRateLimit = defaultRateLimit;

// Validation schemas
const createCategoryValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('parentId')
    .optional()
    .isMongoId()
    .withMessage('Parent ID must be a valid MongoDB ObjectId'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),
  body('metadata.icon')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Icon must be less than 100 characters'),
  body('metadata.color')
    .optional()
    .trim()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex color'),
];

const updateCategoryValidation = [
  param('id').isMongoId().withMessage('Category ID must be a valid MongoDB ObjectId'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('parentId')
    .optional()
    .isMongoId()
    .withMessage('Parent ID must be a valid MongoDB ObjectId'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),
];

// Public routes (no authentication required)

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     summary: Get all categories with optional filtering
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: parent
 *         schema:
 *           type: string
 *         description: Filter by parent category ID
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: level
 *         schema:
 *           type: integer
 *         description: Filter by category level (0 = root categories)
 *       - in: query
 *         name: includeProducts
 *         schema:
 *           type: boolean
 *         description: Include product count for each category
 *     responses:
 *       200:
 *         description: List of categories
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/',
  categoryRateLimit,
  query('parent').optional().isMongoId().withMessage('Parent ID must be valid'),
  query('active').optional().isBoolean().withMessage('Active must be boolean'),
  query('level').optional().isInt({ min: 0 }).withMessage('Level must be non-negative'),
  query('includeProducts').optional().isBoolean().withMessage('Include products must be boolean'),
  validateRequest,
  cacheMiddleware(300), // Cache for 5 minutes
  CategoryController.getCategories
);

/**
 * @swagger
 * /api/v1/categories/tree:
 *   get:
 *     summary: Get categories as a hierarchical tree
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: maxDepth
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *         description: Maximum depth of the tree
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *         description: Include only active categories
 *     responses:
 *       200:
 *         description: Category tree structure
 *       400:
 *         description: Invalid parameters
 */
router.get('/tree',
  categoryRateLimit,
  query('maxDepth').optional().isInt({ min: 1, max: 10 }).withMessage('Max depth must be 1-10'),
  query('activeOnly').optional().isBoolean().withMessage('Active only must be boolean'),
  validateRequest,
  cacheMiddleware(600), // Cache for 10 minutes
  CategoryController.getCategoryTree
);

/**
 * @swagger
 * /api/v1/categories/roots:
 *   get:
 *     summary: Get root categories (categories without parent)
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: includeChildren
 *         schema:
 *           type: boolean
 *         description: Include immediate children
 *     responses:
 *       200:
 *         description: List of root categories
 */
router.get('/roots',
  categoryRateLimit,
  query('includeChildren').optional().isBoolean(),
  validateRequest,
  cacheMiddleware(300), // Cache for 5 minutes
  CategoryController.getRootCategories
);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *       - in: query
 *         name: includeChildren
 *         schema:
 *           type: boolean
 *         description: Include child categories
 *       - in: query
 *         name: includeProducts
 *         schema:
 *           type: boolean
 *         description: Include products in this category
 *     responses:
 *       200:
 *         description: Category details
 *       400:
 *         description: Invalid category ID
 *       404:
 *         description: Category not found
 */
router.get('/:id',
  categoryRateLimit,
  param('id').isMongoId().withMessage('Category ID must be a valid MongoDB ObjectId'),
  query('includeChildren').optional().isBoolean(),
  query('includeProducts').optional().isBoolean(),
  validateRequest,
  cacheMiddleware(300), // Cache for 5 minutes
  CategoryController.getCategoryById
);

/**
 * @swagger
 * /api/v1/categories/slug/{slug}:
 *   get:
 *     summary: Get category by slug
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Category slug
 *     responses:
 *       200:
 *         description: Category details
 *       400:
 *         description: Invalid slug
 *       404:
 *         description: Category not found
 */
router.get('/slug/:slug',
  categoryRateLimit,
  param('slug').trim().isLength({ min: 1 }).withMessage('Slug is required'),
  validateRequest,
  cacheMiddleware(300), // Cache for 5 minutes
  CategoryController.getCategoryBySlug
);

/**
 * @swagger
 * /api/v1/categories/{id}/children:
 *   get:
 *     summary: Get child categories
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Parent category ID
 *       - in: query
 *         name: recursive
 *         schema:
 *           type: boolean
 *         description: Include all descendants
 *     responses:
 *       200:
 *         description: List of child categories
 *       400:
 *         description: Invalid category ID
 *       404:
 *         description: Category not found
 */
router.get('/:id/children',
  categoryRateLimit,
  param('id').isMongoId().withMessage('Category ID must be a valid MongoDB ObjectId'),
  query('recursive').optional().isBoolean(),
  validateRequest,
  cacheMiddleware(300), // Cache for 5 minutes
  CategoryController.getChildCategories
);

/**
 * @swagger
 * /api/v1/categories/{id}/path:
 *   get:
 *     summary: Get category breadcrumb path
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category path from root to current
 *       400:
 *         description: Invalid category ID
 *       404:
 *         description: Category not found
 */
router.get('/:id/path',
  categoryRateLimit,
  param('id').isMongoId().withMessage('Category ID must be a valid MongoDB ObjectId'),
  validateRequest,
  cacheMiddleware(600), // Cache for 10 minutes
  CategoryController.getCategoryPath
);

// Protected routes (authentication required)

/**
 * @swagger
 * /api/v1/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               parentId:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *               metadata:
 *                 type: object
 *                 properties:
 *                   icon:
 *                     type: string
 *                   color:
 *                     type: string
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/',
  authenticate,
  authorize(['admin']),
  createCategoryValidation,
  validateRequest,
  CategoryController.createCategory
);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   put:
 *     summary: Update category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               parentId:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Category not found
 */
router.put('/:id',
  authenticate,
  authorize(['admin']),
  updateCategoryValidation,
  validateRequest,
  CategoryController.updateCategory
);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   delete:
 *     summary: Delete category (soft delete)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Cannot delete category with children or products
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Category not found
 */
router.delete('/:id',
  authenticate,
  authorize(['admin']),
  param('id').isMongoId().withMessage('Category ID must be a valid MongoDB ObjectId'),
  validateRequest,
  CategoryController.deleteCategory
);

/**
 * @swagger
 * /api/v1/categories/{id}/move:
 *   patch:
 *     summary: Move category to a different parent
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newParentId:
 *                 type: string
 *                 description: New parent category ID (null for root)
 *               position:
 *                 type: integer
 *                 description: Position in the new parent's children
 *     responses:
 *       200:
 *         description: Category moved successfully
 *       400:
 *         description: Invalid move operation (circular reference)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Category not found
 */
router.patch('/:id/move',
  authenticate,
  authorize(['admin']),
  param('id').isMongoId().withMessage('Category ID must be a valid MongoDB ObjectId'),
  body('newParentId').optional().isMongoId().withMessage('New parent ID must be valid'),
  body('position').optional().isInt({ min: 0 }).withMessage('Position must be non-negative'),
  validateRequest,
  CategoryController.moveCategory
);

/**
 * @swagger
 * /api/v1/categories/{id}/status:
 *   patch:
 *     summary: Update category status
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *               recursive:
 *                 type: boolean
 *                 description: Apply to all child categories
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Category not found
 */
router.patch('/:id/status',
  authenticate,
  authorize(['admin']),
  param('id').isMongoId().withMessage('Category ID must be a valid MongoDB ObjectId'),
  body('isActive').isBoolean().withMessage('isActive is required and must be boolean'),
  body('recursive').optional().isBoolean().withMessage('recursive must be boolean'),
  validateRequest,
  CategoryController.updateStatus
);

/**
 * @swagger
 * /api/v1/categories/reorder:
 *   patch:
 *     summary: Reorder categories
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - categoryOrders
 *             properties:
 *               categoryOrders:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     sortOrder:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Categories reordered successfully
 *       400:
 *         description: Invalid order data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.patch('/reorder',
  authenticate,
  authorize(['admin']),
  body('categoryOrders').isArray().withMessage('Category orders must be an array'),
  body('categoryOrders.*.id').isMongoId().withMessage('Category ID must be valid'),
  body('categoryOrders.*.sortOrder').isInt({ min: 0 }).withMessage('Sort order must be non-negative'),
  validateRequest,
  CategoryController.reorderCategories
);

/**
 * @swagger
 * /api/v1/categories/bulk/import:
 *   post:
 *     summary: Bulk import categories
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categories:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Categories imported successfully
 *       400:
 *         description: Invalid import data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/bulk/import',
  authenticate,
  authorize(['admin']),
  body('categories').isArray().withMessage('Categories must be an array'),
  validateRequest,
  CategoryController.bulkImport
);

/**
 * @swagger
 * /api/v1/categories/analytics/summary:
 *   get:
 *     summary: Get category analytics summary
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics summary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/analytics/summary',
  authenticate,
  authorize(['admin']),
  cacheMiddleware(600), // Cache for 10 minutes
  CategoryController.getAnalyticsSummary
);

export default router;