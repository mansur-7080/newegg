import crypto from 'crypto';
import axios from 'axios';
import { logger } from '@ultramarket/shared';

export interface ClickPaymentRequest {
  amount: number;
  orderId: string;
  userId: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  merchantTransId: string;
}

export interface ClickPaymentResponse {
  success: boolean;
  paymentUrl?: string;
  transactionId?: string;
  error?: string;
}

export interface ClickWebhookPayload {
  click_trans_id: string;
  service_id: string;
  click_paydoc_id: string;
  merchant_trans_id: string;
  merchant_prepare_id: string;
  amount: number;
  action: number;
  error: number;
  error_note: string;
  sign_time: string;
  sign_string: string;
}

import { IOrderService } from '../interfaces/order.interface';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentStatus } from '../models/payment.model';

export class ClickService {
  private readonly merchantId: string;
  private readonly serviceId: string;
  private readonly secretKey: string;
  private readonly userId: string;
  private readonly baseUrl: string;
  private readonly orderService: IOrderService;
  private readonly paymentRepository: PaymentRepository;

  constructor(orderService: IOrderService, paymentRepository: PaymentRepository) {
    this.merchantId = process.env.CLICK_MERCHANT_ID || '';
    this.serviceId = process.env.CLICK_SERVICE_ID || '';
    this.secretKey = process.env.CLICK_SECRET_KEY || '';
    this.userId = process.env.CLICK_USER_ID || '';
    this.baseUrl = process.env.CLICK_ENDPOINT || 'https://api.click.uz/v2';
    this.orderService = orderService;
    this.paymentRepository = paymentRepository;

    if (!this.merchantId || !this.serviceId || !this.secretKey || !this.userId) {
      throw new Error('Click payment gateway configuration is missing');
    }
  }

  /**
   * Create payment URL for Click
   */
  async createPayment(request: ClickPaymentRequest): Promise<ClickPaymentResponse> {
    try {
      logger.info('Creating Click payment', {
        orderId: request.orderId,
        amount: request.amount,
        userId: request.userId,
      });

      // Create payment URL
      const paymentUrl = this.generatePaymentUrl(request);

      return {
        success: true,
        paymentUrl,
        transactionId: request.merchantTransId,
      };
    } catch (error) {
      logger.error('Click payment creation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId: request.orderId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment creation failed',
      };
    }
  }

  /**
   * Generate Click payment URL
   */
  private generatePaymentUrl(request: ClickPaymentRequest): string {
    const params = new URLSearchParams({
      service_id: this.serviceId,
      merchant_id: this.merchantId,
      amount: request.amount.toString(),
      transaction_param: request.merchantTransId,
      return_url: request.returnUrl,
      cancel_url: request.cancelUrl,
    });

    return `${this.baseUrl}/services/pay?${params.toString()}`;
  }

  /**
   * Handle Click webhook (PREPARE action)
   */
  async handlePrepare(payload: ClickWebhookPayload): Promise<{
    click_trans_id: string;
    merchant_trans_id: string;
    merchant_prepare_id: string;
    error: number;
    error_note: string;
  }> {
    try {
      logger.info('Handling Click PREPARE webhook', {
        clickTransId: payload.click_trans_id,
        merchantTransId: payload.merchant_trans_id,
        amount: payload.amount,
      });

      // Verify signature
      if (!this.verifySignature(payload)) {
        logger.error('Click webhook signature verification failed', {
          clickTransId: payload.click_trans_id,
        });
        return {
          click_trans_id: payload.click_trans_id,
          merchant_trans_id: payload.merchant_trans_id,
          merchant_prepare_id: '',
          error: -1,
          error_note: 'Invalid signature',
        };
      }

      // Verify order exists and amount matches
      const orderValid = await this.verifyOrder(payload.merchant_trans_id, payload.amount);
      if (!orderValid) {
        logger.error('Click order verification failed', {
          merchantTransId: payload.merchant_trans_id,
          amount: payload.amount,
        });
        return {
          click_trans_id: payload.click_trans_id,
          merchant_trans_id: payload.merchant_trans_id,
          merchant_prepare_id: '',
          error: -5,
          error_note: 'Order not found or amount mismatch',
        };
      }

      // Generate merchant prepare ID
      const merchantPrepareId = this.generateMerchantPrepareId(payload.merchant_trans_id);

      // Store prepare transaction
      await this.storePrepareTransaction(payload, merchantPrepareId);

      logger.info('Click PREPARE successful', {
        clickTransId: payload.click_trans_id,
        merchantPrepareId,
      });

      return {
        click_trans_id: payload.click_trans_id,
        merchant_trans_id: payload.merchant_trans_id,
        merchant_prepare_id: merchantPrepareId,
        error: 0,
        error_note: 'Success',
      };
    } catch (error) {
      logger.error('Click PREPARE handler error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        clickTransId: payload.click_trans_id,
      });

      return {
        click_trans_id: payload.click_trans_id,
        merchant_trans_id: payload.merchant_trans_id,
        merchant_prepare_id: '',
        error: -1,
        error_note: 'Internal error',
      };
    }
  }

  /**
   * Handle Click webhook (COMPLETE action)
   */
  async handleComplete(payload: ClickWebhookPayload): Promise<{
    click_trans_id: string;
    merchant_trans_id: string;
    error: number;
    error_note: string;
  }> {
    try {
      logger.info('Handling Click COMPLETE webhook', {
        clickTransId: payload.click_trans_id,
        merchantTransId: payload.merchant_trans_id,
        amount: payload.amount,
      });

      // Verify signature
      if (!this.verifySignature(payload)) {
        logger.error('Click webhook signature verification failed', {
          clickTransId: payload.click_trans_id,
        });
        return {
          click_trans_id: payload.click_trans_id,
          merchant_trans_id: payload.merchant_trans_id,
          error: -1,
          error_note: 'Invalid signature',
        };
      }

      // Verify prepare transaction exists
      const prepareExists = await this.verifyPrepareTransaction(
        payload.click_trans_id,
        payload.merchant_prepare_id
      );
      if (!prepareExists) {
        logger.error('Click prepare transaction not found', {
          clickTransId: payload.click_trans_id,
          merchantPrepareId: payload.merchant_prepare_id,
        });
        return {
          click_trans_id: payload.click_trans_id,
          merchant_trans_id: payload.merchant_trans_id,
          error: -6,
          error_note: 'Transaction not found',
        };
      }

      // Complete payment
      await this.completePayment(payload);

      logger.info('Click COMPLETE successful', {
        clickTransId: payload.click_trans_id,
        merchantTransId: payload.merchant_trans_id,
      });

      return {
        click_trans_id: payload.click_trans_id,
        merchant_trans_id: payload.merchant_trans_id,
        error: 0,
        error_note: 'Success',
      };
    } catch (error) {
      logger.error('Click COMPLETE handler error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        clickTransId: payload.click_trans_id,
      });

      return {
        click_trans_id: payload.click_trans_id,
        merchant_trans_id: payload.merchant_trans_id,
        error: -1,
        error_note: 'Internal error',
      };
    }
  }

  /**
   * Verify Click webhook signature
   */
  private verifySignature(payload: ClickWebhookPayload): boolean {
    const signString = this.generateSignString(payload);
    const hash = crypto.createHash('md5').update(signString).digest('hex');
    return hash === payload.sign_string;
  }

  /**
   * Generate signature string for Click
   */
  private generateSignString(payload: ClickWebhookPayload): string {
    return [
      payload.click_trans_id,
      payload.service_id,
      this.secretKey,
      payload.merchant_trans_id,
      payload.merchant_prepare_id || '',
      payload.amount,
      payload.action,
      payload.sign_time,
    ].join('');
  }

  /**
   * Verify order exists and amount matches
   */
  private async verifyOrder(merchantTransId: string, amount: number): Promise<boolean> {
    try {
      logger.info('Verifying order', { merchantTransId, amount });

      // Real order verification implementation
      const order = await this.orderService.getOrderByTransactionId(merchantTransId);
      
      if (!order) {
        logger.warn('Order not found', { merchantTransId });
        return false;
      }

      if (order.amount !== amount) {
        logger.warn('Order amount mismatch', { 
          merchantTransId, 
          expectedAmount: order.amount, 
          receivedAmount: amount 
        });
        return false;
      }

      if (order.status !== 'pending' && order.status !== 'confirmed') {
        logger.warn('Order status invalid for payment', { 
          merchantTransId, 
          status: order.status 
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Order verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        merchantTransId,
      });
      return false;
    }
  }

  /**
   * Generate merchant prepare ID
   */
  private generateMerchantPrepareId(merchantTransId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${merchantTransId}_${timestamp}_${random}`;
  }

  /**
   * Store prepare transaction
   */
  private async storePrepareTransaction(
    payload: ClickWebhookPayload,
    merchantPrepareId: string
  ): Promise<void> {
    try {
      // Real database implementation
      await this.paymentRepository.storePrepareTransaction(
        payload.merchant_trans_id,
        payload.click_trans_id,
        merchantPrepareId
      );
      
      logger.info('Prepare transaction stored successfully', {
        clickTransId: payload.click_trans_id,
        merchantTransId: payload.merchant_trans_id,
        merchantPrepareId,
        amount: payload.amount,
      });
    } catch (error) {
      logger.error('Failed to store prepare transaction', {
        error: error instanceof Error ? error.message : 'Unknown error',
        clickTransId: payload.click_trans_id,
      });
      throw error;
    }
  }

  /**
   * Verify prepare transaction exists
   */
  private async verifyPrepareTransaction(
    clickTransId: string,
    merchantPrepareId: string
  ): Promise<boolean> {
    try {
      // Real database verification
      const isValid = await this.paymentRepository.verifyPrepareTransaction(
        clickTransId,
        merchantPrepareId
      );

      logger.info('Prepare transaction verification result', {
        clickTransId,
        merchantPrepareId,
        isValid
      });

      return isValid;
    } catch (error) {
      logger.error('Failed to verify prepare transaction', {
        error: error instanceof Error ? error.message : 'Unknown error',
        clickTransId,
      });
      return false;
    }
  }

  /**
   * Complete payment
   */
  private async completePayment(payload: ClickWebhookPayload): Promise<void> {
    try {
      // Update payment transaction status
      const transaction = await this.paymentRepository.getTransactionByProviderTransactionId(
        payload.click_trans_id
      );

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Update transaction to completed
      await this.paymentRepository.updateTransactionStatus(
        transaction.id,
        PaymentStatus.COMPLETED,
        {
          clickTransId: payload.click_trans_id,
          clickPaydocId: payload.click_paydoc_id,
          completedAt: new Date()
        }
      );

      // Update order status
      await this.orderService.updateOrderPaymentStatus(
        transaction.orderId,
        'paid',
        transaction.id
      );

      logger.info('Payment completed successfully', {
        clickTransId: payload.click_trans_id,
        merchantTransId: payload.merchant_trans_id,
        amount: payload.amount,
        orderId: transaction.orderId
      });
    } catch (error) {
      logger.error('Failed to complete payment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        clickTransId: payload.click_trans_id,
      });
      throw error;
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(transactionId: string): Promise<{
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    amount?: number;
    error?: string;
  }> {
    try {
      // Professional status check implementation
      logger.info('Getting payment status from database', { transactionId });

      // Get transaction from database
      const transaction = await this.paymentRepository.getTransactionByProviderTransactionId(
        transactionId
      );

      if (!transaction) {
        logger.warn('Transaction not found', { transactionId });
        return {
          status: 'failed',
          error: 'Transaction not found'
        };
      }

      // Map database status to Click status format
      let clickStatus: 'pending' | 'completed' | 'failed' | 'cancelled';
      
      switch (transaction.status) {
        case 'pending':
          clickStatus = 'pending';
          break;
        case 'completed':
          clickStatus = 'completed';
          break;
        case 'cancelled':
          clickStatus = 'cancelled';
          break;
        case 'failed':
        default:
          clickStatus = 'failed';
          break;
      }

      logger.info('Payment status retrieved', {
        transactionId,
        status: clickStatus,
        amount: transaction.amount
      });

      return {
        status: clickStatus,
        amount: transaction.amount,
        error: transaction.status === 'failed' ? 'Payment failed' : undefined
      };
    } catch (error) {
      logger.error('Failed to get payment status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transactionId,
      });

      return {
        status: 'failed',
        error: 'Status check failed',
      };
    }
  }
}
