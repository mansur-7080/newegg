import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';
import { logger, logPaymentEvent, logPaymentError } from '../utils/logger';
import { 
  validateCreatePayment, 
  validateRefundPayment, 
  validateGetPaymentStatus,
  validateGetPaymentHistory 
} from '../middleware/validation.middleware';

/**
 * Payment Controller
 * Handles all payment-related operations including creation, status checks, refunds, and history
 */
export class PaymentController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  /**
   * Create a new payment
   * @route POST /api/v1/payments
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async createPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paymentData = req.body;
      
      logPaymentEvent('creation_started', {
        userId: paymentData.userId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        paymentMethod: paymentData.paymentMethod
      });

      const result = await this.paymentService.createPayment(paymentData);

      logPaymentEvent('creation_successful', {
        transactionId: result.transactionId,
        userId: paymentData.userId,
        amount: paymentData.amount
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Payment created successfully'
      });
    } catch (error) {
      logPaymentError('creation_failed', error as Error, req.body);
      next(error);
    }
  }

  /**
   * Get payment status by transaction ID
   * @route GET /api/v1/payments/:transactionId/status
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async getPaymentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { transactionId } = req.params;

      logPaymentEvent('status_check', { transactionId });

      const status = await this.paymentService.getPaymentStatus(transactionId);

      res.status(200).json({
        success: true,
        data: status,
        message: 'Payment status retrieved successfully'
      });
    } catch (error) {
      logPaymentError('status_check_failed', error as Error, { transactionId: req.params.transactionId });
      next(error);
    }
  }

  /**
   * Process payment refund
   * @route POST /api/v1/payments/refund
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async processRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refundData = req.body;

      logPaymentEvent('refund_started', {
        transactionId: refundData.transactionId,
        amount: refundData.amount,
        userId: refundData.userId
      });

      const result = await this.paymentService.processRefund(refundData);

      logPaymentEvent('refund_successful', {
        refundId: result.refundId,
        transactionId: refundData.transactionId,
        amount: refundData.amount
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Refund processed successfully'
      });
    } catch (error) {
      logPaymentError('refund_failed', error as Error, req.body);
      next(error);
    }
  }

  /**
   * Get payment history for a user
   * @route GET /api/v1/payments/history
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async getPaymentHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.query.userId as string;
      const options = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        status: req.query.status as string || 'all',
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      logPaymentEvent('history_requested', {
        userId,
        page: options.page,
        limit: options.limit,
        status: options.status
      });

      const history = await this.paymentService.getPaymentHistory(userId, options);

      res.status(200).json({
        success: true,
        data: history,
        message: 'Payment history retrieved successfully'
      });
    } catch (error) {
      logPaymentError('history_retrieval_failed', error as Error, { userId: req.query.userId });
      next(error);
    }
  }

  /**
   * Health check endpoint
   * @route GET /api/v1/payments/health
   * @param req - Express request object
   * @param res - Express response object
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: 'Payment service is healthy',
      timestamp: new Date().toISOString(),
      service: 'payment-service',
      version: '1.0.0'
    });
  }
}

// Export controller instance
export const paymentController = new PaymentController();

// Export middleware for validation
export const paymentValidationMiddleware = {
  createPayment: validateCreatePayment,
  processRefund: validateRefundPayment,
  getPaymentStatus: validateGetPaymentStatus,
  getPaymentHistory: validateGetPaymentHistory
};
