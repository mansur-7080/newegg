import { Request, Response } from 'express';
import { ClickService } from '../services/click.service';
import { PaymeService } from '../services/payme.service';
import { logger } from '@ultramarket/shared';

export class PaymentController {
  private clickService: ClickService;
  private paymeService: PaymeService;

  constructor() {
    this.clickService = new ClickService();
    this.paymeService = new PaymeService();
  }

  /**
   * Create payment - supports multiple gateways
   */
  async createPayment(req: Request, res: Response): Promise<void> {
    try {
      const { amount, orderId, userId, description, paymentMethod, returnUrl, cancelUrl } =
        req.body;

      // Validate required fields
      if (!amount || !orderId || !userId || !paymentMethod) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: amount, orderId, userId, paymentMethod',
        });
        return;
      }

      const merchantTransId = `${orderId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      let paymentResponse;

      switch (paymentMethod.toLowerCase()) {
        case 'click':
          paymentResponse = await this.clickService.createPayment({
            amount,
            orderId,
            userId,
            description: description || `Payment for order ${orderId}`,
            returnUrl: returnUrl || `${process.env.APP_URL}/payment/success`,
            cancelUrl: cancelUrl || `${process.env.APP_URL}/payment/cancel`,
            merchantTransId,
          });
          break;

        case 'payme':
          paymentResponse = await this.paymeService.createPayment({
            amount,
            orderId,
            userId,
            description: description || `Payment for order ${orderId}`,
            returnUrl: returnUrl || `${process.env.APP_URL}/payment/success`,
            cancelUrl: cancelUrl || `${process.env.APP_URL}/payment/cancel`,
            merchantTransId,
          });
          break;

        default:
          res.status(400).json({
            success: false,
            error: 'Unsupported payment method. Supported: click, payme',
          });
          return;
      }

      if (paymentResponse.success) {
        res.status(200).json({
          success: true,
          data: {
            paymentUrl: paymentResponse.paymentUrl,
            transactionId: paymentResponse.transactionId,
            paymentMethod,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          error: paymentResponse.error,
        });
      }
    } catch (error) {
      logger.error('Payment creation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Click webhook handler
   */
  async handleClickWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body;

      logger.info('Received Click webhook', {
        clickTransId: payload.click_trans_id,
        action: payload.action,
        merchantTransId: payload.merchant_trans_id,
      });

      let response;

      switch (payload.action) {
        case 0: // PREPARE
          response = await this.clickService.handlePrepare(payload);
          break;

        case 1: // COMPLETE
          response = await this.clickService.handleComplete(payload);
          break;

        default:
          logger.error('Unknown Click action', { action: payload.action });
          res.status(400).json({
            click_trans_id: payload.click_trans_id,
            merchant_trans_id: payload.merchant_trans_id,
            error: -1,
            error_note: 'Unknown action',
          });
          return;
      }

      res.status(200).json(response);
    } catch (error) {
      logger.error('Click webhook handler error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body,
      });

      res.status(500).json({
        click_trans_id: req.body.click_trans_id || '',
        merchant_trans_id: req.body.merchant_trans_id || '',
        error: -1,
        error_note: 'Internal server error',
      });
    }
  }

  /**
   * Payme webhook handler
   */
  async handlePaymeWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body;

      logger.info('Received Payme webhook', {
        method: payload.method,
        id: payload.id,
        params: payload.params,
      });

      // Verify webhook signature
      const signature = req.headers['x-auth'] as string;
      if (!this.paymeService.verifyWebhookSignature(JSON.stringify(payload), signature)) {
        logger.error('Payme webhook signature verification failed');
        res.status(401).json({
          jsonrpc: '2.0',
          error: {
            code: -32504,
            message: 'Insufficient privilege to perform this method',
          },
          id: payload.id,
        });
        return;
      }

      let response;

      try {
        switch (payload.method) {
          case 'CheckPerformTransaction':
            response = await this.paymeService.checkPerformTransaction(payload);
            break;

          case 'CreateTransaction':
            response = await this.paymeService.createTransaction(payload);
            break;

          case 'PerformTransaction':
            response = await this.paymeService.performTransaction(payload);
            break;

          case 'CancelTransaction':
            response = await this.paymeService.cancelTransaction(payload);
            break;

          case 'CheckTransaction':
            response = await this.paymeService.checkTransaction(payload);
            break;

          default:
            logger.error('Unknown Payme method', { method: payload.method });
            res.status(200).json({
              jsonrpc: '2.0',
              error: {
                code: -32601,
                message: 'Method not found',
              },
              id: payload.id,
            });
            return;
        }

        res.status(200).json({
          jsonrpc: '2.0',
          result: response,
          id: payload.id,
        });
      } catch (methodError) {
        logger.error('Payme method execution error', {
          error: methodError instanceof Error ? methodError.message : 'Unknown error',
          method: payload.method,
        });

        // Map error to Payme error code
        let errorCode = -31001; // Default error
        let errorMessage = 'Internal error';

        if (methodError instanceof Error) {
          if (methodError.message.includes('not found')) {
            errorCode = -31003;
            errorMessage = 'Transaction not found';
          } else if (methodError.message.includes('amount mismatch')) {
            errorCode = -31001;
            errorMessage = 'Wrong amount';
          }
        }

        res.status(200).json({
          jsonrpc: '2.0',
          error: {
            code: errorCode,
            message: errorMessage,
          },
          id: payload.id,
        });
      }
    } catch (error) {
      logger.error('Payme webhook handler error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body,
      });

      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
        },
        id: req.body.id || null,
      });
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;
      const { paymentMethod } = req.query;

      if (!transactionId) {
        res.status(400).json({
          success: false,
          error: 'Transaction ID is required',
        });
        return;
      }

      let status;

      switch (paymentMethod) {
        case 'click':
          status = await this.clickService.getPaymentStatus(transactionId);
          break;

        case 'payme':
          // Payme status check would be implemented here
          status = { status: 'pending' };
          break;

        default:
          res.status(400).json({
            success: false,
            error: 'Payment method is required',
          });
          return;
      }

      res.status(200).json({
        success: true,
        data: {
          transactionId,
          paymentMethod,
          ...status,
        },
      });
    } catch (error) {
      logger.error('Get payment status failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transactionId: req.params.transactionId,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get supported payment methods
   */
  async getPaymentMethods(req: Request, res: Response): Promise<void> {
    try {
      const paymentMethods = [
        {
          id: 'click',
          name: 'Click',
          description: "Click to'lov tizimi",
          logo: '/images/payment/click.png',
          enabled: true,
          currencies: ['UZS'],
        },
        {
          id: 'payme',
          name: 'Payme',
          description: "Payme to'lov tizimi",
          logo: '/images/payment/payme.png',
          enabled: true,
          currencies: ['UZS'],
        },
        {
          id: 'uzcard',
          name: 'UzCard',
          description: "UzCard to'lov tizimi",
          logo: '/images/payment/uzcard.png',
          enabled: false, // Not implemented yet
          currencies: ['UZS'],
        },
      ];

      res.status(200).json({
        success: true,
        data: paymentMethods,
      });
    } catch (error) {
      logger.error('Get payment methods failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        service: 'payment-service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        status: 'healthy',
        gateways: {
          click: {
            configured: !!process.env.CLICK_MERCHANT_ID,
            status: 'operational',
          },
          payme: {
            configured: !!process.env.PAYME_MERCHANT_ID,
            status: 'operational',
          },
        },
      });
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'Health check failed',
      });
    }
  }
}
