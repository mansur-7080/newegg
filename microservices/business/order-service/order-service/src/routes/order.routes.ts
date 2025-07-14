import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { OrderController } from '../controllers/order.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authenticateUser, requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware';

const router = Router();
const orderController = new OrderController();

// Apply rate limiting to all order routes
router.use(rateLimitMiddleware);

/**
 * @route POST /api/orders
 * @desc Create new order from cart
 * @access Private
 */
router.post(
  '/',
  requireAuth,
  [
    body('cartId')
      .notEmpty()
      .withMessage('Cart ID is required')
      .isString()
      .withMessage('Cart ID must be a string'),
    
    body('shippingAddress')
      .isObject()
      .withMessage('Shipping address is required'),
    
    body('shippingAddress.firstName')
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    
    body('shippingAddress.lastName')
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    
    body('shippingAddress.phone')
      .notEmpty()
      .withMessage('Phone number is required')
      .matches(/^\+998[0-9]{9}$/)
      .withMessage('Phone number must be in Uzbekistan format (+998XXXXXXXXX)'),
    
    body('shippingAddress.address')
      .notEmpty()
      .withMessage('Address is required')
      .isLength({ min: 10, max: 200 })
      .withMessage('Address must be between 10 and 200 characters'),
    
    body('shippingAddress.city')
      .notEmpty()
      .withMessage('City is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('City must be between 2 and 50 characters'),
    
    body('shippingAddress.region')
      .notEmpty()
      .withMessage('Region is required')
      .isIn([
        'Toshkent', 'Samarqand', 'Buxoro', 'Andijon', 'Namangan', 'Farg\'ona',
        'Qashqadaryo', 'Surxondaryo', 'Navoiy', 'Jizzax', 'Sirdaryo', 
        'Xorazm', 'Qoraqalpog\'iston', 'Toshkent viloyati'
      ])
      .withMessage('Invalid region'),
    
    body('shippingAddress.postalCode')
      .optional()
      .isPostalCode('UZ')
      .withMessage('Invalid postal code'),
    
    body('shippingAddress.country')
      .notEmpty()
      .withMessage('Country is required')
      .equals('Uzbekistan')
      .withMessage('Only Uzbekistan is supported'),
    
    body('billingAddress')
      .optional()
      .isObject()
      .withMessage('Billing address must be an object'),
    
    body('paymentMethod')
      .notEmpty()
      .withMessage('Payment method is required')
      .isIn(['CLICK', 'PAYME', 'UZCARD', 'CASH_ON_DELIVERY', 'BANK_TRANSFER'])
      .withMessage('Invalid payment method'),
    
    body('notes')
      .optional()
      .isString()
      .withMessage('Notes must be a string')
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
    
    body('couponCode')
      .optional()
      .isString()
      .withMessage('Coupon code must be a string')
      .matches(/^[A-Z0-9]{3,20}$/)
      .withMessage('Coupon code must be 3-20 uppercase alphanumeric characters')
  ],
  validateRequest,
  orderController.createOrder
);

/**
 * @route GET /api/orders/:orderId
 * @desc Get order by ID
 * @access Private
 */
router.get(
  '/:orderId',
  authenticateUser,
  [
    param('orderId')
      .notEmpty()
      .withMessage('Order ID is required')
      .isString()
      .withMessage('Order ID must be a string')
  ],
  validateRequest,
  orderController.getOrder
);

/**
 * @route GET /api/orders
 * @desc Get user orders with pagination
 * @access Private
 */
router.get(
  '/',
  requireAuth,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    
    query('status')
      .optional()
      .isIn(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'])
      .withMessage('Invalid order status')
  ],
  validateRequest,
  orderController.getUserOrders
);

/**
 * @route PUT /api/orders/:orderId/status
 * @desc Update order status (admin only)
 * @access Private/Admin
 */
router.put(
  '/:orderId/status',
  requireAdmin,
  [
    param('orderId')
      .notEmpty()
      .withMessage('Order ID is required')
      .isString()
      .withMessage('Order ID must be a string'),
    
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'])
      .withMessage('Invalid order status'),
    
    body('notes')
      .optional()
      .isString()
      .withMessage('Notes must be a string')
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
    
    body('trackingNumber')
      .optional()
      .isString()
      .withMessage('Tracking number must be a string')
      .matches(/^[A-Z0-9-]{6,20}$/)
      .withMessage('Invalid tracking number format')
  ],
  validateRequest,
  orderController.updateOrderStatus
);

/**
 * @route POST /api/orders/:orderId/cancel
 * @desc Cancel order
 * @access Private
 */
router.post(
  '/:orderId/cancel',
  requireAuth,
  [
    param('orderId')
      .notEmpty()
      .withMessage('Order ID is required')
      .isString()
      .withMessage('Order ID must be a string'),
    
    body('reason')
      .notEmpty()
      .withMessage('Cancellation reason is required')
      .isString()
      .withMessage('Reason must be a string')
      .isLength({ min: 5, max: 200 })
      .withMessage('Reason must be between 5 and 200 characters')
  ],
  validateRequest,
  orderController.cancelOrder
);

/**
 * @route POST /api/orders/:orderId/payment
 * @desc Process payment for order
 * @access Private
 */
router.post(
  '/:orderId/payment',
  requireAuth,
  [
    param('orderId')
      .notEmpty()
      .withMessage('Order ID is required')
      .isString()
      .withMessage('Order ID must be a string'),
    
    body('transactionId')
      .optional()
      .isString()
      .withMessage('Transaction ID must be a string'),
    
    body('paymentProvider')
      .optional()
      .isIn(['CLICK', 'PAYME', 'UZCARD'])
      .withMessage('Invalid payment provider'),
    
    body('amount')
      .optional()
      .isFloat({ gt: 0 })
      .withMessage('Amount must be a positive number'),
    
    body('cardNumber')
      .optional()
      .isString()
      .withMessage('Card number must be a string')
      .matches(/^[0-9*]{12,19}$/)
      .withMessage('Invalid card number format'),
    
    body('expiryMonth')
      .optional()
      .isInt({ min: 1, max: 12 })
      .withMessage('Expiry month must be between 1 and 12'),
    
    body('expiryYear')
      .optional()
      .isInt({ min: 2024, max: 2040 })
      .withMessage('Invalid expiry year'),
    
    body('cvv')
      .optional()
      .matches(/^[0-9]{3,4}$/)
      .withMessage('CVV must be 3 or 4 digits')
  ],
  validateRequest,
  orderController.processPayment
);

/**
 * @route GET /api/orders/:orderId/tracking
 * @desc Get order tracking information
 * @access Public (with order ID)
 */
router.get(
  '/:orderId/tracking',
  [
    param('orderId')
      .notEmpty()
      .withMessage('Order ID is required')
      .isString()
      .withMessage('Order ID must be a string')
  ],
  validateRequest,
  orderController.getOrderTracking
);

/**
 * @route GET /api/orders/admin/statistics
 * @desc Get order statistics (admin only)
 * @access Private/Admin
 */
router.get(
  '/admin/statistics',
  requireAdmin,
  [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be in ISO 8601 format'),
    
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be in ISO 8601 format'),
    
    query('userId')
      .optional()
      .isString()
      .withMessage('User ID must be a string')
  ],
  validateRequest,
  orderController.getOrderStatistics
);

export default router;
