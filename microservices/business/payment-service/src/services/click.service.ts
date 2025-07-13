import crypto from 'crypto';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();
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

export class ClickService {
  private readonly merchantId: string;
  private readonly serviceId: string;
  private readonly secretKey: string;
  private readonly userId: string;
  private readonly baseUrl: string;

  constructor() {
    this.merchantId = process.env.CLICK_MERCHANT_ID || '';
    this.serviceId = process.env.CLICK_SERVICE_ID || '';
    this.secretKey = process.env.CLICK_SECRET_KEY || '';
    this.userId = process.env.CLICK_USER_ID || '';
    this.baseUrl = process.env.CLICK_ENDPOINT || 'https://api.click.uz/v2';

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
      // Call Order Service to verify order
      const order = await prisma.order.findFirst({
        where: { 
          id: merchantTransId,
          status: 'PENDING'
        },
        select: { id: true, total: true, status: true },
      });

      if (!order) {
        return false;
      }

      // Check if amount matches
      const orderAmount = Number(order.total);
      return orderAmount === amount;
    } catch (error) {
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
      // Store in database
      await prisma.clickTransaction.create({
        data: {
          clickTransId: payload.click_trans_id,
          merchantTransId: payload.merchant_trans_id,
          merchantPrepareId,
          amount: payload.amount,
          status: 'PREPARED',
          createTime: new Date(),
        },
      });
    } catch (error) {
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
      // Check in database
      const transaction = await prisma.clickTransaction.findFirst({
        where: {
          clickTransId,
          merchantPrepareId,
          status: 'PREPARED',
        },
      });

      return !!transaction;
    } catch (error) {
      return false;
    }
  }

  /**
   * Complete payment
   */
  private async completePayment(payload: ClickWebhookPayload): Promise<void> {
    try {
      // Update transaction status
      await prisma.clickTransaction.updateMany({
        where: {
          clickTransId: payload.click_trans_id,
        },
        data: {
          status: 'COMPLETED',
          completeTime: new Date(),
        },
      });

      // Update order status
      await prisma.order.update({
        where: { id: payload.merchant_trans_id },
        data: { status: 'CONFIRMED' },
      });

      // Send notification to user
      await this.sendPaymentNotification(payload.merchant_trans_id, 'payment_success', {
        amount: payload.amount,
        currency: 'USD', // Assuming USD for now, adjust as needed
        transactionId: payload.merchant_trans_id
      });
    } catch (error) {
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
      // Check transaction status in database
      const transaction = await prisma.clickTransaction.findFirst({
        where: { clickTransId: transactionId },
        select: { status: true, amount: true },
      });

      if (!transaction) {
        return {
          status: 'failed',
          error: 'Transaction not found',
        };
      }

      return {
        status: transaction.status.toLowerCase() as 'pending' | 'completed' | 'failed' | 'cancelled',
        amount: transaction.amount,
      };
    } catch (error) {
      return {
        status: 'failed',
        error: 'Status check failed',
      };
    }
  }

  private async sendPaymentNotification(
    userId: string, 
    type: string, 
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      // Send notification to notification service
      const notificationData = {
        userId,
        type,
        data,
        timestamp: new Date().toISOString(),
        priority: type.includes('success') ? 'high' : 'normal'
      };

      // Call notification service API
      await axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007'}/api/v1/notifications`,
        notificationData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}`
          },
          timeout: 5000
        }
      );
    } catch (error) {
      // Log error but don't throw as notification failure shouldn't break payment flow
      // In production, this would be sent to error monitoring service
    }
  }
}
