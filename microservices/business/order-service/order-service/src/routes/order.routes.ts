import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createOrderSchema,
  updateOrderSchema,
  cancelOrderSchema,
  addOrderItemSchema,
  updateOrderItemSchema,
} from '../schemas/order.schemas';

const router = Router();
const orderController = new OrderController();

/**
 * @route GET /api/v1/orders
 * @desc Get user orders with pagination and filtering
 * @access Private
 */
router.get('/', authMiddleware, orderController.getOrders);

/**
 * @route POST /api/v1/orders
 * @desc Create a new order
 * @access Private
 */
router.post('/', authMiddleware, validateRequest(createOrderSchema), orderController.createOrder);

/**
 * @route GET /api/v1/orders/:id
 * @desc Get order by ID
 * @access Private
 */
router.get('/:id', authMiddleware, orderController.getOrder);

/**
 * @route PUT /api/v1/orders/:id
 * @desc Update order
 * @access Private
 */
router.put('/:id', authMiddleware, validateRequest(updateOrderSchema), orderController.updateOrder);

/**
 * @route DELETE /api/v1/orders/:id
 * @desc Cancel order
 * @access Private
 */
router.delete('/:id', authMiddleware, validateRequest(cancelOrderSchema), orderController.cancelOrder);

/**
 * @route POST /api/v1/orders/:id/items
 * @desc Add item to order
 * @access Private
 */
router.post('/:id/items', authMiddleware, validateRequest(addOrderItemSchema), orderController.addOrderItem);

/**
 * @route PUT /api/v1/orders/:id/items/:itemId
 * @desc Update order item
 * @access Private
 */
router.put('/:id/items/:itemId', authMiddleware, validateRequest(updateOrderItemSchema), orderController.updateOrderItem);

/**
 * @route DELETE /api/v1/orders/:id/items/:itemId
 * @desc Remove item from order
 * @access Private
 */
router.delete('/:id/items/:itemId', authMiddleware, orderController.removeOrderItem);

/**
 * @route POST /api/v1/orders/:id/confirm
 * @desc Confirm order
 * @access Private
 */
router.post('/:id/confirm', authMiddleware, orderController.confirmOrder);

/**
 * @route POST /api/v1/orders/:id/ship
 * @desc Ship order
 * @access Private
 */
router.post('/:id/ship', authMiddleware, orderController.shipOrder);

/**
 * @route POST /api/v1/orders/:id/deliver
 * @desc Mark order as delivered
 * @access Private
 */
router.post('/:id/deliver', authMiddleware, orderController.deliverOrder);

/**
 * @route GET /api/v1/orders/:id/tracking
 * @desc Get order tracking information
 * @access Private
 */
router.get('/:id/tracking', authMiddleware, orderController.getOrderTracking);

/**
 * @route POST /api/v1/orders/:id/return
 * @desc Initiate order return
 * @access Private
 */
router.post('/:id/return', authMiddleware, orderController.initiateReturn);

/**
 * @route GET /api/v1/orders/statistics
 * @desc Get order statistics
 * @access Private
 */
router.get('/statistics', authMiddleware, orderController.getOrderStatistics);

/**
 * @route GET /api/v1/orders/recent
 * @desc Get recent orders
 * @access Private
 */
router.get('/recent', authMiddleware, orderController.getRecentOrders);

export default router;
