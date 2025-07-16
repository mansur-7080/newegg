import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { InventoryController } from '../controllers/inventory.controller';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();
const inventoryController = new InventoryController();

/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: Product inventory management
 */

/**
 * @swagger
 * /api/v1/inventory/{productId}:
 *   get:
 *     summary: Get inventory for a product
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product inventory information
 *       404:
 *         description: Product not found
 */
router.get(
  '/:productId',
  authMiddleware,
  param('productId').isUUID().withMessage('Invalid product ID'),
  validateRequest,
  inventoryController.getProductInventory
);

/**
 * @swagger
 * /api/v1/inventory/{productId}/variants:
 *   get:
 *     summary: Get inventory for product variants
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product variants inventory information
 */
router.get(
  '/:productId/variants',
  authMiddleware,
  param('productId').isUUID().withMessage('Invalid product ID'),
  validateRequest,
  inventoryController.getVariantsInventory
);

/**
 * @swagger
 * /api/v1/inventory/low-stock:
 *   get:
 *     summary: Get products with low stock
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of products with low stock
 */
router.get(
  '/low-stock',
  authMiddleware,
  requireAdmin,
  query('threshold').optional().isInt({ min: 0 }).toInt(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  validateRequest,
  inventoryController.getLowStockProducts
);

/**
 * @swagger
 * /api/v1/inventory/{productId}:
 *   put:
 *     summary: Update product inventory
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *               operation:
 *                 type: string
 *                 enum: [set, add, subtract]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Inventory updated successfully
 */
router.put(
  '/:productId',
  authMiddleware,
  requireAdmin,
  param('productId').isUUID().withMessage('Invalid product ID'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a positive integer'),
  body('operation').isIn(['set', 'add', 'subtract']).withMessage('Invalid operation'),
  body('reason').optional().isString().trim(),
  validateRequest,
  inventoryController.updateInventory
);

/**
 * @swagger
 * /api/v1/inventory/{productId}/variant/{variantId}:
 *   put:
 *     summary: Update variant inventory
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *               operation:
 *                 type: string
 *                 enum: [set, add, subtract]
 *     responses:
 *       200:
 *         description: Variant inventory updated successfully
 */
router.put(
  '/:productId/variant/:variantId',
  authMiddleware,
  requireAdmin,
  param('productId').isUUID().withMessage('Invalid product ID'),
  param('variantId').isUUID().withMessage('Invalid variant ID'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a positive integer'),
  body('operation').isIn(['set', 'add', 'subtract']).withMessage('Invalid operation'),
  validateRequest,
  inventoryController.updateVariantInventory
);

/**
 * @swagger
 * /api/v1/inventory/{productId}/reserve:
 *   post:
 *     summary: Reserve product inventory
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *               orderId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Inventory reserved successfully
 */
router.post(
  '/:productId/reserve',
  authMiddleware,
  param('productId').isUUID().withMessage('Invalid product ID'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('orderId').isString().notEmpty().withMessage('Order ID is required'),
  validateRequest,
  inventoryController.reserveInventory
);

/**
 * @swagger
 * /api/v1/inventory/{productId}/release:
 *   post:
 *     summary: Release reserved inventory
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *               orderId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Inventory released successfully
 */
router.post(
  '/:productId/release',
  authMiddleware,
  param('productId').isUUID().withMessage('Invalid product ID'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('orderId').isString().notEmpty().withMessage('Order ID is required'),
  validateRequest,
  inventoryController.releaseInventory
);

/**
 * @swagger
 * /api/v1/inventory/batch-update:
 *   post:
 *     summary: Batch update inventory
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                     operation:
 *                       type: string
 *     responses:
 *       200:
 *         description: Batch update completed
 */
router.post(
  '/batch-update',
  authMiddleware,
  requireAdmin,
  body('updates').isArray().withMessage('Updates must be an array'),
  body('updates.*.productId').isUUID().withMessage('Invalid product ID'),
  body('updates.*.quantity').isInt({ min: 0 }).withMessage('Invalid quantity'),
  body('updates.*.operation').isIn(['set', 'add', 'subtract']).withMessage('Invalid operation'),
  validateRequest,
  inventoryController.batchUpdateInventory
);

/**
 * @swagger
 * /api/v1/inventory/history/{productId}:
 *   get:
 *     summary: Get inventory history
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: Inventory history
 */
router.get(
  '/history/:productId',
  authMiddleware,
  requireAdmin,
  param('productId').isUUID().withMessage('Invalid product ID'),
  query('startDate').optional().isISO8601().toDate(),
  query('endDate').optional().isISO8601().toDate(),
  validateRequest,
  inventoryController.getInventoryHistory
);

export default router;
