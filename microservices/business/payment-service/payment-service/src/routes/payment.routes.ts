import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createPaymentSchema,
  confirmPaymentSchema,
  refundPaymentSchema,
  webhookSchema,
} from '../schemas/payment.schemas';

const router = Router();
const paymentController = new PaymentController();

/**
 * @route POST /api/v1/payments/create
 * @desc Create a new payment
 * @access Private
 */
router.post('/create', authMiddleware, validateRequest(createPaymentSchema), paymentController.createPayment);

/**
 * @route POST /api/v1/payments/confirm
 * @desc Confirm a payment
 * @access Private
 */
router.post('/confirm', authMiddleware, validateRequest(confirmPaymentSchema), paymentController.confirmPayment);

/**
 * @route POST /api/v1/payments/refund
 * @desc Refund a payment
 * @access Private
 */
router.post('/refund', authMiddleware, validateRequest(refundPaymentSchema), paymentController.refundPayment);

/**
 * @route GET /api/v1/payments/:id
 * @desc Get payment details
 * @access Private
 */
router.get('/:id', authMiddleware, paymentController.getPayment);

/**
 * @route GET /api/v1/payments/order/:orderId
 * @desc Get payments for an order
 * @access Private
 */
router.get('/order/:orderId', authMiddleware, paymentController.getPaymentsByOrder);

/**
 * @route GET /api/v1/payments/methods
 * @desc Get available payment methods
 * @access Public
 */
router.get('/methods', paymentController.getPaymentMethods);

/**
 * @route POST /api/v1/payments/webhook/click
 * @desc Click payment webhook
 * @access Public
 */
router.post('/webhook/click', validateRequest(webhookSchema), paymentController.handleClickWebhook);

/**
 * @route POST /api/v1/payments/webhook/payme
 * @desc Payme payment webhook
 * @access Public
 */
router.post('/webhook/payme', validateRequest(webhookSchema), paymentController.handlePaymeWebhook);

/**
 * @route POST /api/v1/payments/webhook/uzcard
 * @desc Uzcard payment webhook
 * @access Public
 */
router.post('/webhook/uzcard', validateRequest(webhookSchema), paymentController.handleUzcardWebhook);

/**
 * @route POST /api/v1/payments/webhook/humo
 * @desc Humo payment webhook
 * @access Public
 */
router.post('/webhook/humo', validateRequest(webhookSchema), paymentController.handleHumoWebhook);

/**
 * @route POST /api/v1/payments/validate
 * @desc Validate payment data
 * @access Private
 */
router.post('/validate', authMiddleware, validateRequest(createPaymentSchema), paymentController.validatePayment);

/**
 * @route GET /api/v1/payments/status/:id
 * @desc Get payment status
 * @access Private
 */
router.get('/status/:id', authMiddleware, paymentController.getPaymentStatus);

export default router;
