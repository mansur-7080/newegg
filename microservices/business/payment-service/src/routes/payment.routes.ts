import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body, param } from 'express-validator';

const router = Router();
const paymentController = new PaymentController();

/**
 * @route   POST /api/v1/payments/create
 * @desc    Create a new payment
 * @access  Private
 */
router.post(
  '/create',
  authenticate,
  [
    body('orderId').isString().notEmpty().withMessage('Order ID is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('provider').isIn(['CLICK', 'PAYME', 'UZCARD', 'HUMO', 'APELSIN', 'BANK_TRANSFER', 'CASH_ON_DELIVERY']).withMessage('Invalid payment provider'),
    body('description').optional().isString(),
    body('returnUrl').isURL().withMessage('Valid return URL is required'),
    body('cancelUrl').optional().isURL().withMessage('Cancel URL must be valid'),
  ],
  validateRequest,
  paymentController.createPayment
);

/**
 * @route   GET /api/v1/payments/:paymentId
 * @desc    Get payment details
 * @access  Private
 */
router.get(
  '/:paymentId',
  authenticate,
  [
    param('paymentId').isString().notEmpty().withMessage('Payment ID is required'),
  ],
  validateRequest,
  paymentController.getPayment
);

/**
 * @route   GET /api/v1/payments/order/:orderId
 * @desc    Get payment by order ID
 * @access  Private
 */
router.get(
  '/order/:orderId',
  authenticate,
  [
    param('orderId').isString().notEmpty().withMessage('Order ID is required'),
  ],
  validateRequest,
  paymentController.getPaymentByOrderId
);

/**
 * @route   POST /api/v1/payments/:paymentId/cancel
 * @desc    Cancel a payment
 * @access  Private
 */
router.post(
  '/:paymentId/cancel',
  authenticate,
  [
    param('paymentId').isString().notEmpty().withMessage('Payment ID is required'),
    body('reason').optional().isString(),
  ],
  validateRequest,
  paymentController.cancelPayment
);

/**
 * @route   POST /api/v1/payments/:paymentId/refund
 * @desc    Refund a payment
 * @access  Private
 */
router.post(
  '/:paymentId/refund',
  authenticate,
  [
    param('paymentId').isString().notEmpty().withMessage('Payment ID is required'),
    body('amount').optional().isFloat({ min: 0 }).withMessage('Refund amount must be positive'),
    body('reason').optional().isString(),
  ],
  validateRequest,
  paymentController.refundPayment
);

/**
 * @route   GET /api/v1/payments/user/history
 * @desc    Get user payment history
 * @access  Private
 */
router.get(
  '/user/history',
  authenticate,
  paymentController.getUserPaymentHistory
);

/**
 * @route   GET /api/v1/payments/methods/available
 * @desc    Get available payment methods
 * @access  Public
 */
router.get(
  '/methods/available',
  paymentController.getAvailablePaymentMethods
);

// ============================================
// CLICK PAYMENT ROUTES
// ============================================

/**
 * @route   POST /api/v1/payments/click/create
 * @desc    Create Click payment
 * @access  Private
 */
router.post(
  '/click/create',
  authenticate,
  [
    body('orderId').isString().notEmpty().withMessage('Order ID is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
    body('description').optional().isString(),
    body('returnUrl').isURL().withMessage('Valid return URL is required'),
  ],
  validateRequest,
  paymentController.createClickPayment
);

/**
 * @route   POST /api/v1/payments/webhooks/click
 * @desc    Handle Click webhook
 * @access  Public (webhook)
 */
router.post(
  '/webhooks/click',
  paymentController.handleClickWebhook
);

/**
 * @route   GET /api/v1/payments/click/:transactionId/status
 * @desc    Get Click payment status
 * @access  Private
 */
router.get(
  '/click/:transactionId/status',
  authenticate,
  [
    param('transactionId').isString().notEmpty().withMessage('Transaction ID is required'),
  ],
  validateRequest,
  paymentController.getClickPaymentStatus
);

// ============================================
// PAYME PAYMENT ROUTES
// ============================================

/**
 * @route   POST /api/v1/payments/payme/create
 * @desc    Create Payme payment
 * @access  Private
 */
router.post(
  '/payme/create',
  authenticate,
  [
    body('orderId').isString().notEmpty().withMessage('Order ID is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
    body('description').optional().isString(),
    body('returnUrl').isURL().withMessage('Valid return URL is required'),
  ],
  validateRequest,
  paymentController.createPaymePayment
);

/**
 * @route   POST /api/v1/payments/webhooks/payme
 * @desc    Handle Payme webhook
 * @access  Public (webhook)
 */
router.post(
  '/webhooks/payme',
  paymentController.handlePaymeWebhook
);

// ============================================
// UZCARD/HUMO PAYMENT ROUTES
// ============================================

/**
 * @route   POST /api/v1/payments/card/create
 * @desc    Create card payment (Uzcard/Humo)
 * @access  Private
 */
router.post(
  '/card/create',
  authenticate,
  [
    body('orderId').isString().notEmpty().withMessage('Order ID is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
    body('cardType').isIn(['UZCARD', 'HUMO']).withMessage('Invalid card type'),
    body('cardNumber').matches(/^\d{16}$/).withMessage('Invalid card number'),
    body('expiryMonth').isInt({ min: 1, max: 12 }).withMessage('Invalid expiry month'),
    body('expiryYear').isInt({ min: new Date().getFullYear() }).withMessage('Invalid expiry year'),
    body('cvv').matches(/^\d{3,4}$/).withMessage('Invalid CVV'),
    body('cardholderName').isString().notEmpty().withMessage('Cardholder name is required'),
  ],
  validateRequest,
  paymentController.createCardPayment
);

/**
 * @route   POST /api/v1/payments/card/:paymentId/verify
 * @desc    Verify card payment with OTP
 * @access  Private
 */
router.post(
  '/card/:paymentId/verify',
  authenticate,
  [
    param('paymentId').isString().notEmpty().withMessage('Payment ID is required'),
    body('otp').matches(/^\d{4,6}$/).withMessage('Invalid OTP'),
  ],
  validateRequest,
  paymentController.verifyCardPayment
);

// ============================================
// BANK TRANSFER ROUTES
// ============================================

/**
 * @route   POST /api/v1/payments/bank-transfer/create
 * @desc    Create bank transfer payment
 * @access  Private
 */
router.post(
  '/bank-transfer/create',
  authenticate,
  [
    body('orderId').isString().notEmpty().withMessage('Order ID is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
    body('bankCode').isIn(['NBU', 'ASAKA', 'XALQ', 'QISHLOQ', 'IPOTEKA']).withMessage('Invalid bank code'),
  ],
  validateRequest,
  paymentController.createBankTransfer
);

// ============================================
// APELSIN PAYMENT ROUTES
// ============================================

/**
 * @route   POST /api/v1/payments/apelsin/create
 * @desc    Create Apelsin payment
 * @access  Private
 */
router.post(
  '/apelsin/create',
  authenticate,
  [
    body('orderId').isString().notEmpty().withMessage('Order ID is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
    body('phoneNumber').matches(/^\+998\d{9}$/).withMessage('Invalid phone number'),
  ],
  validateRequest,
  paymentController.createApelsinPayment
);

// ============================================
// CASH ON DELIVERY ROUTES
// ============================================

/**
 * @route   POST /api/v1/payments/cod/create
 * @desc    Create cash on delivery order
 * @access  Private
 */
router.post(
  '/cod/create',
  authenticate,
  [
    body('orderId').isString().notEmpty().withMessage('Order ID is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
    body('deliveryAddress').isObject().withMessage('Delivery address is required'),
    body('deliveryAddress.street').isString().notEmpty().withMessage('Street is required'),
    body('deliveryAddress.city').isString().notEmpty().withMessage('City is required'),
    body('deliveryAddress.region').isString().notEmpty().withMessage('Region is required'),
    body('deliveryAddress.postalCode').optional().isString(),
    body('contactPhone').matches(/^\+998\d{9}$/).withMessage('Invalid phone number'),
  ],
  validateRequest,
  paymentController.createCashOnDelivery
);

// ============================================
// PAYMENT METHODS MANAGEMENT
// ============================================

/**
 * @route   GET /api/v1/payments/methods/saved
 * @desc    Get user's saved payment methods
 * @access  Private
 */
router.get(
  '/methods/saved',
  authenticate,
  paymentController.getSavedPaymentMethods
);

/**
 * @route   POST /api/v1/payments/methods/save
 * @desc    Save a payment method
 * @access  Private
 */
router.post(
  '/methods/save',
  authenticate,
  [
    body('provider').isIn(['UZCARD', 'HUMO', 'APELSIN']).withMessage('Invalid provider'),
    body('token').isString().notEmpty().withMessage('Token is required'),
    body('lastFour').matches(/^\d{4}$/).withMessage('Invalid last four digits'),
    body('cardType').optional().isString(),
    body('expiryMonth').optional().isInt({ min: 1, max: 12 }),
    body('expiryYear').optional().isInt({ min: new Date().getFullYear() }),
  ],
  validateRequest,
  paymentController.savePaymentMethod
);

/**
 * @route   DELETE /api/v1/payments/methods/:methodId
 * @desc    Delete a saved payment method
 * @access  Private
 */
router.delete(
  '/methods/:methodId',
  authenticate,
  [
    param('methodId').isString().notEmpty().withMessage('Method ID is required'),
  ],
  validateRequest,
  paymentController.deletePaymentMethod
);

/**
 * @route   PUT /api/v1/payments/methods/:methodId/default
 * @desc    Set a payment method as default
 * @access  Private
 */
router.put(
  '/methods/:methodId/default',
  authenticate,
  [
    param('methodId').isString().notEmpty().withMessage('Method ID is required'),
  ],
  validateRequest,
  paymentController.setDefaultPaymentMethod
);

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * @route   GET /api/v1/payments/admin/list
 * @desc    Get all payments (admin)
 * @access  Private (Admin only)
 */
router.get(
  '/admin/list',
  authenticate,
  // TODO: Add admin role check middleware
  paymentController.getAllPayments
);

/**
 * @route   GET /api/v1/payments/admin/stats
 * @desc    Get payment statistics
 * @access  Private (Admin only)
 */
router.get(
  '/admin/stats',
  authenticate,
  // TODO: Add admin role check middleware
  paymentController.getPaymentStats
);

/**
 * @route   POST /api/v1/payments/admin/:paymentId/manual-verify
 * @desc    Manually verify a payment
 * @access  Private (Admin only)
 */
router.post(
  '/admin/:paymentId/manual-verify',
  authenticate,
  // TODO: Add admin role check middleware
  [
    param('paymentId').isString().notEmpty().withMessage('Payment ID is required'),
    body('notes').optional().isString(),
  ],
  validateRequest,
  paymentController.manuallyVerifyPayment
);

export default router;