import { Router } from 'express';
import { paymentController, paymentValidationMiddleware } from '../controllers/payment.controller';
import { logSecurityEvent } from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /api/v1/payments:
 *   post:
 *     summary: Create a new payment
 *     description: Creates a new payment with the specified amount, currency, and payment method
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - currency
 *               - orderId
 *               - userId
 *               - paymentMethod
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *                 example: 100000
 *               currency:
 *                 type: string
 *                 enum: [UZS, USD, EUR]
 *                 description: Payment currency
 *                 example: "UZS"
 *               orderId:
 *                 type: string
 *                 description: Order ID
 *                 example: "order_123"
 *               userId:
 *                 type: string
 *                 description: User ID
 *                 example: "user_456"
 *               paymentMethod:
 *                 type: string
 *                 enum: [click, payme, uzcard]
 *                 description: Payment method
 *                 example: "click"
 *               description:
 *                 type: string
 *                 description: Payment description
 *                 example: "Order payment"
 *               returnUrl:
 *                 type: string
 *                 format: uri
 *                 description: Return URL after payment
 *               cancelUrl:
 *                 type: string
 *                 format: uri
 *                 description: Cancel URL
 *     responses:
 *       201:
 *         description: Payment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     transactionId:
 *                       type: string
 *                     paymentUrl:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, success, failed]
 *                     message:
 *                       type: string
 *                 message:
 *                   type: string
 *                   example: "Payment created successfully"
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', 
  paymentValidationMiddleware.createPayment,
  (req, res, next) => {
    logSecurityEvent('payment_creation_attempt', req.body.userId, req.ip);
    paymentController.createPayment(req, res, next);
  }
);

/**
 * @swagger
 * /api/v1/payments/{transactionId}/status:
 *   get:
 *     summary: Get payment status
 *     description: Retrieves the status of a payment by transaction ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *         example: "click_1234567890_abc123"
 *     responses:
 *       200:
 *         description: Payment status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, success, failed]
 *                     amount:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     paymentMethod:
 *                       type: string
 *                 message:
 *                   type: string
 *                   example: "Payment status retrieved successfully"
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
router.get('/:transactionId/status',
  paymentValidationMiddleware.getPaymentStatus,
  (req, res, next) => {
    logSecurityEvent('payment_status_check', undefined, req.ip, { transactionId: req.params.transactionId });
    paymentController.getPaymentStatus(req, res, next);
  }
);

/**
 * @swagger
 * /api/v1/payments/refund:
 *   post:
 *     summary: Process payment refund
 *     description: Processes a refund for an existing payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *               - amount
 *               - reason
 *               - userId
 *             properties:
 *               transactionId:
 *                 type: string
 *                 description: Original payment transaction ID
 *                 example: "click_1234567890_abc123"
 *               amount:
 *                 type: number
 *                 description: Refund amount
 *                 example: 50000
 *               reason:
 *                 type: string
 *                 description: Refund reason
 *                 example: "Customer request"
 *               userId:
 *                 type: string
 *                 description: User ID
 *                 example: "user_456"
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     refundId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, completed, failed]
 *                     message:
 *                       type: string
 *                 message:
 *                   type: string
 *                   example: "Refund processed successfully"
 *       400:
 *         description: Bad request - validation error
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
router.post('/refund',
  paymentValidationMiddleware.processRefund,
  (req, res, next) => {
    logSecurityEvent('payment_refund_attempt', req.body.userId, req.ip, { transactionId: req.body.transactionId });
    paymentController.processRefund(req, res, next);
  }
);

/**
 * @swagger
 * /api/v1/payments/history:
 *   get:
 *     summary: Get payment history
 *     description: Retrieves payment history for a user with pagination and filtering
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "user_456"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *         example: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, success, failed, pending]
 *           default: "all"
 *         description: Filter by payment status
 *         example: "success"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *         example: "2024-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *         example: "2024-12-31"
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     payments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           transactionId:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [pending, success, failed]
 *                           amount:
 *                             type: number
 *                           currency:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           paymentMethod:
 *                             type: string
 *                     total:
 *                       type: integer
 *                       description: Total number of payments
 *                     page:
 *                       type: integer
 *                       description: Current page number
 *                     limit:
 *                       type: integer
 *                       description: Number of items per page
 *                     totalPages:
 *                       type: integer
 *                       description: Total number of pages
 *                 message:
 *                   type: string
 *                   example: "Payment history retrieved successfully"
 *       400:
 *         description: Bad request - validation error
 *       500:
 *         description: Internal server error
 */
router.get('/history',
  paymentValidationMiddleware.getPaymentHistory,
  (req, res, next) => {
    logSecurityEvent('payment_history_request', req.query.userId as string, req.ip);
    paymentController.getPaymentHistory(req, res, next);
  }
);

/**
 * @swagger
 * /api/v1/payments/health:
 *   get:
 *     summary: Health check
 *     description: Returns the health status of the payment service
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Payment service is healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 service:
 *                   type: string
 *                   example: "payment-service"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 */
router.get('/health', (req, res) => {
  paymentController.healthCheck(req, res);
});

export default router;
