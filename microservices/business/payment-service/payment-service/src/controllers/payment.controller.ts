import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';
import { logger } from '../utils/logger';

export class PaymentController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  /**
   * Create a new payment
   */
  createPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { orderId, amount, currency, paymentMethod, description } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      const payment = await this.paymentService.createPayment({
        userId,
        orderId,
        amount,
        currency,
        paymentMethod,
        description,
      });

      res.status(201).json({
        success: true,
        data: { payment },
        message: 'Payment created successfully',
      });
    } catch (error) {
      logger.error('Error creating payment', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  };

  /**
   * Confirm a payment
   */
  confirmPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { paymentId, transactionId, signature } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      const payment = await this.paymentService.confirmPayment(paymentId, {
        transactionId,
        signature,
        userId,
      });

      res.json({
        success: true,
        data: { payment },
        message: 'Payment confirmed successfully',
      });
    } catch (error) {
      logger.error('Error confirming payment', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  };

  /**
   * Refund a payment
   */
  refundPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { paymentId, amount, reason } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      const refund = await this.paymentService.refundPayment(paymentId, {
        amount,
        reason,
        userId,
      });

      res.json({
        success: true,
        data: { refund },
        message: 'Payment refunded successfully',
      });
    } catch (error) {
      logger.error('Error refunding payment', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  };

  /**
   * Get payment details
   */
  getPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      const payment = await this.paymentService.getPayment(id, userId);

      res.json({
        success: true,
        data: { payment },
        message: 'Payment retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting payment', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  };

  /**
   * Get payments by order
   */
  getPaymentsByOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { orderId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      const payments = await this.paymentService.getPaymentsByOrder(orderId, userId);

      res.json({
        success: true,
        data: { payments },
        message: 'Payments retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting payments by order', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  };

  /**
   * Get available payment methods
   */
  getPaymentMethods = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const methods = await this.paymentService.getPaymentMethods();

      res.json({
        success: true,
        data: { methods },
        message: 'Payment methods retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting payment methods', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  };

  /**
   * Handle Click payment webhook
   */
  handleClickWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.paymentService.handleClickWebhook(req.body);

      res.json({
        success: true,
        data: result,
        message: 'Click webhook processed successfully',
      });
    } catch (error) {
      logger.error('Error handling Click webhook', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  };

  /**
   * Handle Payme payment webhook
   */
  handlePaymeWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.paymentService.handlePaymeWebhook(req.body);

      res.json({
        success: true,
        data: result,
        message: 'Payme webhook processed successfully',
      });
    } catch (error) {
      logger.error('Error handling Payme webhook', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  };

  /**
   * Handle Uzcard payment webhook
   */
  handleUzcardWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.paymentService.handleUzcardWebhook(req.body);

      res.json({
        success: true,
        data: result,
        message: 'Uzcard webhook processed successfully',
      });
    } catch (error) {
      logger.error('Error handling Uzcard webhook', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  };

  /**
   * Handle Humo payment webhook
   */
  handleHumoWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.paymentService.handleHumoWebhook(req.body);

      res.json({
        success: true,
        data: result,
        message: 'Humo webhook processed successfully',
      });
    } catch (error) {
      logger.error('Error handling Humo webhook', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  };

  /**
   * Validate payment data
   */
  validatePayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const paymentData = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      const validation = await this.paymentService.validatePayment(paymentData);

      res.json({
        success: true,
        data: { validation },
        message: 'Payment validation completed',
      });
    } catch (error) {
      logger.error('Error validating payment', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  };

  /**
   * Get payment status
   */
  getPaymentStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      const status = await this.paymentService.getPaymentStatus(id, userId);

      res.json({
        success: true,
        data: { status },
        message: 'Payment status retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting payment status', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  };
}
