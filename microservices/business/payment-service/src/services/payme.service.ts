import { createHash, createHmac } from 'crypto';
import axios from 'axios';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { PaymentStatus, PaymentProvider } from '@prisma/client';
import { RedisService } from '../config/redis';

export interface PaymePaymentRequest {
  amount: number;
  orderId: string;
  userId: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  merchantTransId: string;
}

export interface PaymePaymentResponse {
  success: boolean;
  paymentUrl?: string;
  transactionId?: string;
  error?: string;
}

export interface PaymeWebhookPayload {
  method: string;
  params: {
    id?: string;
    time?: number;
    amount?: number;
    account?: {
      order_id: string;
    };
    reason?: number;
  };
  id: string;
}

export interface PaymeTransaction {
  id: string;
  time: number;
  amount: number;
  account: {
    order_id: string;
  };
  create_time: number;
  perform_time?: number;
  cancel_time?: number;
  state: number;
  reason?: number;
}

export class PaymeService {
  private readonly merchantId: string;
  private readonly secretKey: string;
  private readonly endpoint: string;
  private readonly testMode: boolean;
  private readonly redis: RedisService;

  constructor() {
    this.merchantId = process.env.PAYME_MERCHANT_ID || '';
    this.secretKey = process.env.PAYME_SECRET_KEY || '';
    this.testMode = process.env.PAYME_ENVIRONMENT !== 'production';
    this.endpoint = this.testMode
      ? 'https://checkout.test.paycom.uz'
      : 'https://checkout.paycom.uz';
    
    this.redis = new RedisService();

    if (!this.merchantId || !this.secretKey) {
      logger.error('Payme credentials not configured');
    }
  }

  /**
   * Create payment URL for Payme checkout
   */
  async createPayment(request: PaymePaymentRequest): Promise<PaymePaymentResponse> {
    try {
      logger.info('Creating Payme payment', { orderId: request.orderId, amount: request.amount });

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
          provider: PaymentProvider.PAYME,
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
        `payme:payment:${payment.id}`,
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
      logger.error('Failed to create Payme payment', {
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
   * Generate Payme payment URL
   */
  private generatePaymentUrl(request: PaymePaymentRequest, paymentId: string): string {
    const params = {
      m: this.merchantId,
      ac: {
        order_id: request.orderId,
        payment_id: paymentId,
      },
      a: request.amount * 100, // Convert to tiyin
      c: request.returnUrl,
      ct: request.cancelUrl,
      l: 'uz', // Language
    };

    const encodedParams = Buffer.from(JSON.stringify(params)).toString('base64');
    return `${this.endpoint}/${encodedParams}`;
  }

  /**
   * Handle CheckPerformTransaction method
   */
  async checkPerformTransaction(payload: PaymeWebhookPayload): Promise<{
    allow: boolean;
    detail?: {
      receipt_type: number;
      items: Array<{
        title: string;
        price: number;
        count: number;
        code: string;
        units: number;
        vat_percent: number;
        package_code: string;
      }>;
    };
  }> {
    try {
      const orderId = payload.params.account?.order_id;
      const amount = payload.params.amount;

      if (!orderId || !amount) {
        logger.error('Missing required parameters', { payload });
        return { allow: false };
      }

      // Verify order and amount
      const order = await this.verifyOrder(orderId, amount / 100);
      if (!order) {
        logger.error('Order verification failed', { orderId, amount });
        return { allow: false };
      }

      // Get order details for receipt
      const orderDetails = await this.getOrderDetails(orderId);

      return {
        allow: true,
        detail: {
          receipt_type: 0,
          items: orderDetails.items,
        },
      };
    } catch (error) {
      logger.error('checkPerformTransaction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { allow: false };
    }
  }

  /**
   * Handle CreateTransaction method
   */
  async createTransaction(payload: PaymeWebhookPayload): Promise<{
    create_time: number;
    transaction: string;
    state: number;
  }> {
    try {
      const transactionId = payload.params.id;
      const orderId = payload.params.account?.order_id;
      const amount = payload.params.amount;
      const time = payload.params.time;

      if (!transactionId || !orderId || !amount || !time) {
        throw new Error('Missing required parameters');
      }

      // Check if transaction already exists
      const existingTransaction = await this.getTransaction(transactionId);
      if (existingTransaction) {
        return {
          create_time: existingTransaction.create_time,
          transaction: existingTransaction.id,
          state: existingTransaction.state,
        };
      }

      // Verify order again
      const order = await this.verifyOrder(orderId, amount / 100);
      if (!order) {
        throw new Error('Order verification failed');
      }

      // Create transaction
      const transaction: PaymeTransaction = {
        id: transactionId,
        time,
        amount,
        account: { order_id: orderId },
        create_time: Date.now(),
        state: 1, // Created
      };

      await this.storeTransaction(transaction);

      // Update payment status
      await prisma.payment.updateMany({
        where: {
          orderId,
          provider: PaymentProvider.PAYME,
          status: PaymentStatus.PENDING,
        },
        data: {
          status: PaymentStatus.PROCESSING,
          externalTransactionId: transactionId,
          updatedAt: new Date(),
        },
      });

      logger.info('Transaction created', { transactionId, orderId, amount });

      return {
        create_time: transaction.create_time,
        transaction: transaction.id,
        state: transaction.state,
      };
    } catch (error) {
      logger.error('createTransaction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Handle PerformTransaction method
   */
  async performTransaction(payload: PaymeWebhookPayload): Promise<{
    perform_time: number;
    transaction: string;
    state: number;
  }> {
    try {
      const transactionId = payload.params.id;

      if (!transactionId) {
        throw new Error('Transaction ID is required');
      }

      // Get transaction
      const transaction = await this.getTransaction(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Check if already performed
      if (transaction.state === 2) {
        return {
          perform_time: transaction.perform_time!,
          transaction: transaction.id,
          state: transaction.state,
        };
      }

      // Check if can be performed
      if (transaction.state !== 1) {
        throw new Error('Transaction cannot be performed');
      }

      // Update transaction
      transaction.perform_time = Date.now();
      transaction.state = 2; // Performed

      await this.updateTransaction(transactionId, transaction);

      // Update payment status
      await prisma.payment.updateMany({
        where: {
          externalTransactionId: transactionId,
          provider: PaymentProvider.PAYME,
        },
        data: {
          status: PaymentStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      // Complete the order
      await this.completeOrder(transaction.account.order_id, transaction.amount / 100);

      // Send notifications
      await this.sendPaymentNotifications(transaction.account.order_id, transaction.amount / 100);

      logger.info('Transaction performed', { transactionId });

      return {
        perform_time: transaction.perform_time,
        transaction: transaction.id,
        state: transaction.state,
      };
    } catch (error) {
      logger.error('performTransaction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Handle CancelTransaction method
   */
  async cancelTransaction(payload: PaymeWebhookPayload): Promise<{
    cancel_time: number;
    transaction: string;
    state: number;
  }> {
    try {
      const transactionId = payload.params.id;
      const reason = payload.params.reason;

      if (!transactionId) {
        throw new Error('Transaction ID is required');
      }

      // Get transaction
      const transaction = await this.getTransaction(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Check if already cancelled
      if (transaction.state === -1 || transaction.state === -2) {
        return {
          cancel_time: transaction.cancel_time!,
          transaction: transaction.id,
          state: transaction.state,
        };
      }

      // Update transaction
      transaction.cancel_time = Date.now();
      transaction.reason = reason;
      
      if (transaction.state === 1) {
        transaction.state = -1; // Cancelled before perform
      } else if (transaction.state === 2) {
        transaction.state = -2; // Cancelled after perform
      }

      await this.updateTransaction(transactionId, transaction);

      // Update payment status
      await prisma.payment.updateMany({
        where: {
          externalTransactionId: transactionId,
          provider: PaymentProvider.PAYME,
        },
        data: {
          status: PaymentStatus.CANCELLED,
          cancelledAt: new Date(),
          metadata: {
            cancelReason: reason,
          },
        },
      });

      // Handle refund if necessary
      if (transaction.state === -2) {
        await this.refundOrder(transaction.account.order_id, transaction.amount / 100);
      }

      logger.info('Transaction cancelled', { transactionId, reason });

      return {
        cancel_time: transaction.cancel_time,
        transaction: transaction.id,
        state: transaction.state,
      };
    } catch (error) {
      logger.error('cancelTransaction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Handle CheckTransaction method
   */
  async checkTransaction(payload: PaymeWebhookPayload): Promise<{
    create_time: number;
    perform_time?: number;
    cancel_time?: number;
    transaction: string;
    state: number;
    reason?: number;
  }> {
    try {
      const transactionId = payload.params.id;

      if (!transactionId) {
        throw new Error('Transaction ID is required');
      }

      const transaction = await this.getTransaction(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      return {
        create_time: transaction.create_time,
        perform_time: transaction.perform_time,
        cancel_time: transaction.cancel_time,
        transaction: transaction.id,
        state: transaction.state,
        reason: transaction.reason,
      };
    } catch (error) {
      logger.error('checkTransaction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
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
   * Get order details for receipt
   */
  private async getOrderDetails(orderId: string): Promise<{
    items: Array<{
      title: string;
      price: number;
      count: number;
      code: string;
      units: number;
      vat_percent: number;
      package_code: string;
    }>;
  }> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const items = order.orderItems.map((item) => ({
        title: item.product.name,
        price: item.price * 100, // Convert to tiyin
        count: item.quantity,
        code: item.product.sku || item.product.id,
        units: 796, // Standard unit code
        vat_percent: 12, // VAT percentage
        package_code: '1234567890', // Package code
      }));

      return { items };
    } catch (error) {
      logger.error('Failed to get order details', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
      });

      // Return default item if error
      return {
        items: [
          {
            title: 'Order #' + orderId,
            price: 100000,
            count: 1,
            code: '123456789',
            units: 796,
            vat_percent: 12,
            package_code: '123456',
          },
        ],
      };
    }
  }

  /**
   * Store transaction in database
   */
  private async storeTransaction(transaction: PaymeTransaction): Promise<PaymeTransaction> {
    await prisma.transaction.create({
      data: {
        id: transaction.id,
        provider: PaymentProvider.PAYME,
        orderId: transaction.account.order_id,
        amount: transaction.amount / 100,
        currency: 'UZS',
        status: this.mapTransactionState(transaction.state),
        metadata: transaction,
        createdAt: new Date(transaction.create_time),
      },
    });

    // Store in Redis for quick access
    await this.redis.setex(
      `payme:transaction:${transaction.id}`,
      86400, // 24 hours
      JSON.stringify(transaction)
    );

    return transaction;
  }

  /**
   * Get transaction from storage
   */
  private async getTransaction(transactionId: string): Promise<PaymeTransaction | null> {
    // Try Redis first
    const cached = await this.redis.get(`payme:transaction:${transactionId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fallback to database
    const dbTransaction = await prisma.transaction.findUnique({
      where: { 
        id: transactionId,
        provider: PaymentProvider.PAYME,
      },
    });

    if (dbTransaction && dbTransaction.metadata) {
      const transaction = dbTransaction.metadata as PaymeTransaction;
      
      // Cache for future requests
      await this.redis.setex(
        `payme:transaction:${transactionId}`,
        86400,
        JSON.stringify(transaction)
      );

      return transaction;
    }

    return null;
  }

  /**
   * Update transaction in storage
   */
  private async updateTransaction(
    transactionId: string,
    updates: Partial<PaymeTransaction>
  ): Promise<void> {
    const transaction = await this.getTransaction(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const updatedTransaction = { ...transaction, ...updates };

    // Update in database
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: this.mapTransactionState(updatedTransaction.state),
        metadata: updatedTransaction,
        updatedAt: new Date(),
      },
    });

    // Update in Redis
    await this.redis.setex(
      `payme:transaction:${transactionId}`,
      86400,
      JSON.stringify(updatedTransaction)
    );
  }

  /**
   * Complete order after successful payment
   */
  private async completeOrder(orderId: string, amount: number): Promise<void> {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PAYMENT_CONFIRMED',
        paidAmount: amount,
        paidAt: new Date(),
      },
    });

    // Clear order from cache
    await this.redis.del(`order:${orderId}`);
  }

  /**
   * Handle order refund
   */
  private async refundOrder(orderId: string, amount: number): Promise<void> {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'REFUNDED',
        refundedAmount: amount,
        refundedAt: new Date(),
      },
    });

    // Create refund record
    await prisma.refund.create({
      data: {
        orderId,
        amount,
        currency: 'UZS',
        provider: PaymentProvider.PAYME,
        status: 'COMPLETED',
        reason: 'Transaction cancelled',
      },
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
      // In production, this would integrate with the notification service
      logger.info('Payment notification should be sent', {
        userId: order.userId,
        orderId,
        amount,
        email: order.user.email,
        phone: order.user.phone,
      });

      // TODO: When notification service is ready, uncomment this:
      // await notificationService.sendNotification({
      //   userId: order.userId,
      //   type: 'email',
      //   template: 'payment-success',
      //   data: {
      //     orderId,
      //     amount,
      //     paymentMethod: 'Payme',
      //     customerName: order.user.name,
      //   },
      //   priority: 'high',
      // });
    } catch (error) {
      logger.error('Failed to send payment notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
      });
    }
  }

  /**
   * Map transaction state to internal status
   */
  private mapTransactionState(state: number): string {
    switch (state) {
      case 1:
        return 'CREATED';
      case 2:
        return 'COMPLETED';
      case -1:
        return 'CANCELLED_BEFORE_COMPLETE';
      case -2:
        return 'CANCELLED_AFTER_COMPLETE';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const expectedSignature = createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }
}
