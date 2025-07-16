import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import { validateRequest, validateFileUpload } from '../middleware/validation.middleware';
import multer from 'multer';

const router = Router();
const adminController = new AdminController();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(requireAdmin);

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin operations for product management
 */

/**
 * @swagger
 * /api/v1/admin/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
router.get('/dashboard/stats', adminController.getDashboardStats);

/**
 * @swagger
 * /api/v1/admin/products/bulk-import:
 *   post:
 *     summary: Bulk import products
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               overwrite:
 *                 type: boolean
 *     responses:
 *       202:
 *         description: Import job queued
 */
router.post(
  '/products/bulk-import',
  upload.single('file'),
  validateFileUpload(['text/csv', 'application/json', 'application/vnd.ms-excel'], 5 * 1024 * 1024),
  body('overwrite').optional().isBoolean(),
  validateRequest,
  adminController.bulkImportProducts
);

/**
 * @swagger
 * /api/v1/admin/products/bulk-export:
 *   post:
 *     summary: Bulk export products
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [csv, json, excel]
 *               filters:
 *                 type: object
 *     responses:
 *       202:
 *         description: Export job queued
 */
router.post(
  '/products/bulk-export',
  body('format').isIn(['csv', 'json', 'excel']).withMessage('Invalid format'),
  body('filters').optional().isObject(),
  validateRequest,
  adminController.bulkExportProducts
);

/**
 * @swagger
 * /api/v1/admin/products/bulk-update:
 *   put:
 *     summary: Bulk update products
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               updates:
 *                 type: object
 *     responses:
 *       200:
 *         description: Products updated
 */
router.put(
  '/products/bulk-update',
  body('productIds').isArray().withMessage('Product IDs must be an array'),
  body('productIds.*').isUUID().withMessage('Invalid product ID'),
  body('updates').isObject().withMessage('Updates must be an object'),
  validateRequest,
  adminController.bulkUpdateProducts
);

/**
 * @swagger
 * /api/v1/admin/products/bulk-delete:
 *   delete:
 *     summary: Bulk delete products
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Products deleted
 */
router.delete(
  '/products/bulk-delete',
  body('productIds').isArray().withMessage('Product IDs must be an array'),
  body('productIds.*').isUUID().withMessage('Invalid product ID'),
  validateRequest,
  adminController.bulkDeleteProducts
);

/**
 * @swagger
 * /api/v1/admin/categories/reorder:
 *   put:
 *     summary: Reorder categories
 *     tags: [Admin]
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
 *                   properties:
 *                     id:
 *                       type: string
 *                     sortOrder:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Categories reordered
 */
router.put(
  '/categories/reorder',
  body('categories').isArray().withMessage('Categories must be an array'),
  body('categories.*.id').isUUID().withMessage('Invalid category ID'),
  body('categories.*.sortOrder').isInt({ min: 0 }).withMessage('Invalid sort order'),
  validateRequest,
  adminController.reorderCategories
);

/**
 * @swagger
 * /api/v1/admin/reviews/moderate:
 *   post:
 *     summary: Moderate reviews
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reviewIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               action:
 *                 type: string
 *                 enum: [approve, reject, delete]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reviews moderated
 */
router.post(
  '/reviews/moderate',
  body('reviewIds').isArray().withMessage('Review IDs must be an array'),
  body('reviewIds.*').isUUID().withMessage('Invalid review ID'),
  body('action').isIn(['approve', 'reject', 'delete']).withMessage('Invalid action'),
  body('reason').optional().isString().trim(),
  validateRequest,
  adminController.moderateReviews
);

/**
 * @swagger
 * /api/v1/admin/inventory/low-stock-alerts:
 *   get:
 *     summary: Get low stock alerts
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Low stock products
 */
router.get(
  '/inventory/low-stock-alerts',
  query('threshold').optional().isInt({ min: 0 }).toInt(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  validateRequest,
  adminController.getLowStockAlerts
);

/**
 * @swagger
 * /api/v1/admin/cache/clear:
 *   post:
 *     summary: Clear cache
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pattern:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Cache cleared
 */
router.post(
  '/cache/clear',
  body('pattern').optional().isString(),
  body('tags').optional().isArray(),
  validateRequest,
  adminController.clearCache
);

/**
 * @swagger
 * /api/v1/admin/jobs/{queueName}:
 *   get:
 *     summary: Get queue jobs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queueName
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [waiting, active, completed, failed]
 *     responses:
 *       200:
 *         description: Queue jobs
 */
router.get(
  '/jobs/:queueName',
  param('queueName').isString().notEmpty(),
  query('status').optional().isIn(['waiting', 'active', 'completed', 'failed']),
  validateRequest,
  adminController.getQueueJobs
);

/**
 * @swagger
 * /api/v1/admin/reports/sales:
 *   get:
 *     summary: Get sales report
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *     responses:
 *       200:
 *         description: Sales report
 */
router.get(
  '/reports/sales',
  query('startDate').optional().isISO8601().toDate(),
  query('endDate').optional().isISO8601().toDate(),
  query('groupBy').optional().isIn(['day', 'week', 'month']),
  validateRequest,
  adminController.getSalesReport
);

/**
 * @swagger
 * /api/v1/admin/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Audit logs
 */
router.get(
  '/audit-logs',
  query('userId').optional().isUUID(),
  query('action').optional().isString(),
  query('resource').optional().isString(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  validateRequest,
  adminController.getAuditLogs
);

export default router;
