import { createHash, createHmac } from 'crypto';
import axios from 'axios';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { PaymentStatus, PaymentProvider } from '@prisma/client';
import { RedisService } from '../config/redis';

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
  merchant_prepare_id?: string;
  amount: number;
  action: number;
  error: number;
  error_note: string;
  sign_time: string;
  sign_string: string;
}

export interface ClickTransaction {
  id: string;
  clickTransId: string;
  serviceId: string;
  merchantTransId: string;
  merchantPrepareId?: string;
  amount: number;
  status: string;
  createdAt: Date;
  completedAt?: Date;
}

export class ClickService {
  private readonly merchantId: string;
  private readonly serviceId: string;
  private readonly secretKey: string;
  private readonly userId: string;
  private readonly baseUrl: string;
  private readonly redis: RedisService;

  constructor() {
    this.merchantId = process.env.CLICK_MERCHANT_ID || '';
    this.serviceId = process.env.CLICK_SERVICE_ID || '';
    this.secretKey = process.env.CLICK_SECRET_KEY || '';
    this.userId = process.env.CLICK_USER_ID || '';
    this.baseUrl = process.env.CLICK_ENVIRONMENT === 'production'
      ? 'https://api.click.uz'
      : 'https://api.click.uz/sandbox';
    
    this.redis = new RedisService();

    if (!this.merchantId || !this.serviceId || !this.secretKey) {
      logger.error('Click credentials not configured');
    }
  }

  /**
   * Create payment URL for Click
   */
  async createPayment(request: ClickPaymentRequest): Promise<ClickPaymentResponse> {
    try {
      logger.info('Creating Click payment', { orderId: request.orderId, amount: request.amount });

      // Verify order exists and matches amount
      const order = await this.verifyOrder(request.orderId, request.amount);
      if (!order) {
        return {
          success: false,
          error: 'Invalid order or amount mismatch',
        };
      }

      // Create payment record in database
      const payment = await prisma.payment.create({
        data: {
          orderId: request.orderId,
          userId: request.userId,
          amount: request.amount,
          currency: 'UZS',
          provider: PaymentProvider.CLICK,
          status: PaymentStatus.PENDING,
          merchantTransId: request.merchantTransId,
          metadata: {
            description: request.description,
            returnUrl: request.returnUrl,
            cancelUrl: request.cancelUrl,
          },
        },
      });

      // Generate payment URL
      const paymentUrl = this.generatePaymentUrl(request, payment.id);

      // Cache payment data for quick lookup
      await this.redis.setex(
        `click:payment:${payment.id}`,
        3600, // 1 hour
        JSON.stringify({
          paymentId: payment.id,
          orderId: request.orderId,
          amount: request.amount,
          userId: request.userId,
        })
      );

      return {
        success: true,
        paymentUrl,
        transactionId: payment.id,
      };
    } catch (error) {
      logger.error('Failed to create Click payment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId: request.orderId,
      });

      return {
        success: false,
        error: 'Failed to create payment',
      };
    }
  }

  /**
   * Generate Click payment URL
   */
  private generatePaymentUrl(request: ClickPaymentRequest, paymentId: string): string {
    const params = new URLSearchParams({
      service_id: this.serviceId,
      merchant_id: this.merchantId,
      amount: request.amount.toString(),
      transaction_param: request.merchantTransId,
      return_url: request.returnUrl,
      card_type: 'uzcard',
    });

    return `https://my.click.uz/services/pay?${params.toString()}`;
  }

  /**
   * Handle Click prepare webhook
   */
  async handlePrepare(payload: ClickWebhookPayload): Promise<{
    click_trans_id: string;
    merchant_trans_id: string;
    merchant_prepare_id: string;
    error: number;
    error_note: string;
  }> {
    try {
      logger.info('Handling Click prepare', {
        clickTransId: payload.click_trans_id,
        merchantTransId: payload.merchant_trans_id,
        amount: payload.amount,
      });

      // Verify signature
      if (!this.verifySignature(payload)) {
        logger.error('Invalid Click signature', { payload });
        return {
          click_trans_id: payload.click_trans_id,
          merchant_trans_id: payload.merchant_trans_id,
          merchant_prepare_id: '',
          error: -1,
          error_note: 'SIGN_CHECK_FAILED',
        };
      }

      // Verify order exists and amount matches
      const orderValid = await this.verifyOrder(payload.merchant_trans_id, payload.amount);
      if (!orderValid) {
        return {
          click_trans_id: payload.click_trans_id,
          merchant_trans_id: payload.merchant_trans_id,
          merchant_prepare_id: '',
          error: -5,
          error_note: 'ORDER_NOT_FOUND',
        };
      }

      // Check if prepare already exists
      const existingPrepare = await this.getPrepareTransaction(payload.click_trans_id);
      if (existingPrepare) {
        return {
          click_trans_id: payload.click_trans_id,
          merchant_trans_id: payload.merchant_trans_id,
          merchant_prepare_id: existingPrepare.merchantPrepareId || '',
          error: 0,
          error_note: 'SUCCESS',
        };
      }

      // Generate merchant prepare ID
      const merchantPrepareId = this.generateMerchantPrepareId(payload.merchant_trans_id);

      // Store prepare transaction
      await this.storePrepareTransaction(payload, merchantPrepareId);

      // Update payment status
      await prisma.payment.updateMany({
        where: {
          merchantTransId: payload.merchant_trans_id,
          provider: PaymentProvider.CLICK,
          status: PaymentStatus.PENDING,
        },
        data: {
          status: PaymentStatus.PROCESSING,
          externalTransactionId: payload.click_trans_id,
          updatedAt: new Date(),
        },
      });

      return {
        click_trans_id: payload.click_trans_id,
        merchant_trans_id: payload.merchant_trans_id,
        merchant_prepare_id: merchantPrepareId,
        error: 0,
        error_note: 'SUCCESS',
      };
    } catch (error) {
      logger.error('Click prepare failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        click_trans_id: payload.click_trans_id,
        merchant_trans_id: payload.merchant_trans_id,
        merchant_prepare_id: '',
        error: -8,
        error_note: 'ERROR_INTERNAL',
      };
    }
  }

  /**
   * Handle Click complete webhook
   */
  async handleComplete(payload: ClickWebhookPayload): Promise<{
    click_trans_id: string;
    merchant_trans_id: string;
    error: number;
    error_note: string;
  }> {
    try {
      logger.info('Handling Click complete', {
        clickTransId: payload.click_trans_id,
        merchantTransId: payload.merchant_trans_id,
        merchantPrepareId: payload.merchant_prepare_id,
      });

      // Verify signature
      if (!this.verifySignature(payload)) {
        logger.error('Invalid Click signature', { payload });
        return {
          click_trans_id: payload.click_trans_id,
          merchant_trans_id: payload.merchant_trans_id,
          error: -1,
          error_note: 'SIGN_CHECK_FAILED',
        };
      }

      // Check if prepare transaction exists
      const prepareValid = await this.verifyPrepareTransaction(
        payload.click_trans_id,
        payload.merchant_prepare_id || ''
      );

      if (!prepareValid) {
        return {
          click_trans_id: payload.click_trans_id,
          merchant_trans_id: payload.merchant_trans_id,
          error: -6,
          error_note: 'TRANSACTION_NOT_FOUND',
        };
      }

      // Check for error in payload
      if (payload.error < 0) {
        await this.cancelPayment(payload);
        return {
          click_trans_id: payload.click_trans_id,
          merchant_trans_id: payload.merchant_trans_id,
          error: -9,
          error_note: 'TRANSACTION_CANCELLED',
        };
      }

      // Complete payment
      await this.completePayment(payload);

      return {
        click_trans_id: payload.click_trans_id,
        merchant_trans_id: payload.merchant_trans_id,
        error: 0,
        error_note: 'SUCCESS',
      };
    } catch (error) {
      logger.error('Click complete failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        click_trans_id: payload.click_trans_id,
        merchant_trans_id: payload.merchant_trans_id,
        error: -8,
        error_note: 'ERROR_INTERNAL',
      };
    }
  }

  /**
   * Verify webhook signature
   */
  private verifySignature(payload: ClickWebhookPayload): boolean {
    const signString = this.generateSignString(payload);
    const expectedSign = createHash('md5')
      .update(signString)
      .digest('hex');

    return payload.sign_string === expectedSign;
  }

  /**
   * Generate sign string for verification
   */
  private generateSignString(payload: ClickWebhookPayload): string {
    return `${payload.click_trans_id}${payload.service_id}${this.secretKey}${payload.merchant_trans_id}${payload.amount}${payload.action}${payload.sign_time}`;
  }

  /**
   * Verify order exists and amount matches
   */
  private async verifyOrder(orderId: string, amount: number): Promise<boolean> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { payment: true },
      });

      if (!order) {
        logger.error('Order not found', { orderId });
        return false;
      }

      if (order.totalAmount !== amount) {
        logger.error('Amount mismatch', { 
          orderId, 
          orderAmount: order.totalAmount, 
          requestAmount: amount 
        });
        return false;
      }

      if (order.status !== 'PENDING' && order.status !== 'PAYMENT_PENDING') {
        logger.error('Invalid order status', { orderId, status: order.status });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Order verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
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
    const transaction: ClickTransaction = {
      id: payload.click_trans_id,
      clickTransId: payload.click_trans_id,
      serviceId: payload.service_id,
      merchantTransId: payload.merchant_trans_id,
      merchantPrepareId,
      amount: payload.amount,
      status: 'PREPARE',
      createdAt: new Date(),
    };

    // Store in database
    await prisma.transaction.create({
      data: {
        id: transaction.id,
        provider: PaymentProvider.CLICK,
        orderId: payload.merchant_trans_id,
        amount: payload.amount,
        currency: 'UZS',
        status: 'PREPARE',
        externalId: payload.click_trans_id,
        metadata: transaction,
      },
    });

    // Store in Redis for quick lookup
    await this.redis.setex(
      `click:prepare:${payload.click_trans_id}`,
      86400, // 24 hours
      JSON.stringify(transaction)
    );
  }

  /**
   * Get prepare transaction
   */
  private async getPrepareTransaction(clickTransId: string): Promise<ClickTransaction | null> {
    // Try Redis first
    const cached = await this.redis.get(`click:prepare:${clickTransId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fallback to database
    const dbTransaction = await prisma.transaction.findUnique({
      where: { 
        id: clickTransId,
        provider: PaymentProvider.CLICK,
      },
    });

    if (dbTransaction && dbTransaction.metadata) {
      const transaction = dbTransaction.metadata as unknown as ClickTransaction;
      
      // Cache for future requests
      await this.redis.setex(
        `click:prepare:${clickTransId}`,
        86400,
        JSON.stringify(transaction)
      );

      return transaction;
    }

    return null;
  }

  /**
   * Verify prepare transaction exists
   */
  private async verifyPrepareTransaction(
    clickTransId: string,
    merchantPrepareId: string
  ): Promise<boolean> {
    const transaction = await this.getPrepareTransaction(clickTransId);
    
    if (!transaction) {
      logger.error('Prepare transaction not found', { clickTransId });
      return false;
    }

    if (transaction.merchantPrepareId !== merchantPrepareId) {
      logger.error('Merchant prepare ID mismatch', {
        clickTransId,
        expected: transaction.merchantPrepareId,
        received: merchantPrepareId,
      });
      return false;
    }

    return true;
  }

  /**
   * Complete payment
   */
  private async completePayment(payload: ClickWebhookPayload): Promise<void> {
    // Update payment status
    await prisma.payment.updateMany({
      where: {
        externalTransactionId: payload.click_trans_id,
        provider: PaymentProvider.CLICK,
      },
      data: {
        status: PaymentStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: payload.merchant_trans_id },
      data: {
        status: 'PAYMENT_CONFIRMED',
        paidAmount: payload.amount,
        paidAt: new Date(),
      },
    });

    // Update transaction
    await prisma.transaction.update({
      where: { id: payload.click_trans_id },
      data: {
        status: 'COMPLETED',
        updatedAt: new Date(),
      },
    });

    // Clear from cache
    await this.redis.del(`click:prepare:${payload.click_trans_id}`);
    await this.redis.del(`order:${payload.merchant_trans_id}`);

    // Send notifications
    await this.sendPaymentNotifications(payload.merchant_trans_id, payload.amount);

    logger.info('Payment completed successfully', {
      clickTransId: payload.click_trans_id,
      orderId: payload.merchant_trans_id,
      amount: payload.amount,
    });
  }

  /**
   * Cancel payment
   */
  private async cancelPayment(payload: ClickWebhookPayload): Promise<void> {
    // Update payment status
    await prisma.payment.updateMany({
      where: {
        externalTransactionId: payload.click_trans_id,
        provider: PaymentProvider.CLICK,
      },
      data: {
        status: PaymentStatus.CANCELLED,
        cancelledAt: new Date(),
        metadata: {
          cancelReason: payload.error_note,
        },
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: payload.merchant_trans_id },
      data: {
        status: 'PAYMENT_FAILED',
      },
    });

    // Update transaction
    await prisma.transaction.update({
      where: { id: payload.click_trans_id },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
      },
    });

    // Clear from cache
    await this.redis.del(`click:prepare:${payload.click_trans_id}`);

    logger.info('Payment cancelled', {
      clickTransId: payload.click_trans_id,
      orderId: payload.merchant_trans_id,
      error: payload.error_note,
    });
  }

  /**
   * Send payment notifications
   */
  private async sendPaymentNotifications(orderId: string, amount: number): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true },
      });

      if (!order) return;

      // For now, we'll log the notification details
      logger.info('Payment notification should be sent', {
        userId: order.userId,
        orderId,
        amount,
        email: order.user.email,
        phone: order.user.phone,
        paymentMethod: 'Click',
      });

      // TODO: When notification service is ready, integrate here
    } catch (error) {
      logger.error('Failed to send payment notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
      });
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
      const payment = await prisma.payment.findFirst({
        where: {
          OR: [
            { id: transactionId },
            { externalTransactionId: transactionId },
          ],
          provider: PaymentProvider.CLICK,
        },
      });

      if (!payment) {
        return {
          status: 'failed',
          error: 'Payment not found',
        };
      }

      let status: 'pending' | 'completed' | 'failed' | 'cancelled';
      switch (payment.status) {
        case PaymentStatus.COMPLETED:
          status = 'completed';
          break;
        case PaymentStatus.CANCELLED:
          status = 'cancelled';
          break;
        case PaymentStatus.FAILED:
          status = 'failed';
          break;
        default:
          status = 'pending';
      }

      return {
        status,
        amount: payment.amount,
      };
    } catch (error) {
      logger.error('Failed to get payment status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transactionId,
      });

      return {
        status: 'failed',
        error: 'Failed to get payment status',
      };
    }
  }
}
