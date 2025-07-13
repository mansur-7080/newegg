import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import axios from 'axios';

const prisma = new PrismaClient();

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

  constructor() {
    this.merchantId = process.env.PAYME_MERCHANT_ID || '';
    this.secretKey = process.env.PAYME_SECRET_KEY || '';
    this.endpoint = process.env.PAYME_ENDPOINT || 'https://checkout.paycom.uz/api';
    this.testMode = process.env.NODE_ENV !== 'production';

    if (!this.merchantId || !this.secretKey) {
      logger.error('Payme credentials not configured');
      throw new Error('Payme credentials not configured');
    }

    logger.info('Payme service initialized', {
      merchantId: this.merchantId,
      testMode: this.testMode,
    });
  }

  /**
   * Create payment URL for Payme
   */
  async createPayment(request: PaymePaymentRequest): Promise<PaymePaymentResponse> {
    try {
      logger.info('Creating Payme payment', {
        orderId: request.orderId,
        amount: request.amount,
        userId: request.userId,
      });

      // Verify order exists and amount matches
      const isValid = await this.verifyOrder(request.orderId, request.amount);
      if (!isValid) {
        return {
          success: false,
          error: 'Order verification failed',
        };
      }

      // Generate payment URL
      const paymentUrl = this.generatePaymentUrl(request);

      // Store payment request in database
      await this.storePaymentRequest(request);

      return {
        success: true,
        paymentUrl,
        transactionId: request.merchantTransId,
      };
    } catch (error) {
      logger.error('Failed to create Payme payment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId: request.orderId,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate payment URL
   */
  private generatePaymentUrl(request: PaymePaymentRequest): string {
    const params = new URLSearchParams({
      m: this.merchantId,
      ac: JSON.stringify({
        order_id: request.orderId,
      }),
      a: request.amount.toString(),
      c: `${process.env.FRONTEND_URL}/payment/success`,
      cr: `${process.env.FRONTEND_URL}/payment/cancel`,
    });

    return `https://checkout.paycom.uz/?${params.toString()}`;
  }

  /**
   * Store payment request in database
   */
  private async storePaymentRequest(request: PaymePaymentRequest): Promise<void> {
    try {
      await prisma.paymentRequest.create({
        data: {
          orderId: request.orderId,
          userId: request.userId,
          amount: request.amount,
          description: request.description,
          merchantTransId: request.merchantTransId,
          provider: 'payme',
          status: 'pending',
          returnUrl: request.returnUrl,
          cancelUrl: request.cancelUrl,
          createdAt: new Date(),
        },
      });

      logger.info('Payment request stored', {
        orderId: request.orderId,
        merchantTransId: request.merchantTransId,
      });
    } catch (error) {
      logger.error('Failed to store payment request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId: request.orderId,
      });
      throw error;
    }
  }

  /**
   * Check if transaction can be performed
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
      const amount = payload.params.amount || 0;

      if (!orderId) {
        return { allow: false };
      }

      // Verify order exists and amount matches
      const isValid = await this.verifyOrder(orderId, amount);
      if (!isValid) {
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
      logger.error('Failed to check perform transaction', {
        error: error instanceof Error ? error.message : 'Unknown error',
        payload,
      });
      return { allow: false };
    }
  }

  /**
   * Create transaction
   */
  async createTransaction(payload: PaymeWebhookPayload): Promise<{
    create_time: number;
    transaction: string;
    state: number;
  }> {
    try {
      const orderId = payload.params.account?.order_id;
      const amount = payload.params.amount || 0;
      const transactionId = payload.params.id || '';

      if (!orderId || !transactionId) {
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

      // Verify order
      const isValid = await this.verifyOrder(orderId, amount);
      if (!isValid) {
        throw new Error('Order verification failed');
      }

      // Create new transaction
      const createTime = Date.now();
      const transaction: PaymeTransaction = {
        id: transactionId,
        time: payload.params.time || createTime,
        amount,
        account: {
          order_id: orderId,
        },
        create_time: createTime,
        state: 1, // Created
      };

      await this.storeTransaction(transaction);

      logger.info('Transaction created', {
        transactionId,
        orderId,
        amount,
      });

      return {
        create_time: createTime,
        transaction: transactionId,
        state: 1,
      };
    } catch (error) {
      logger.error('Failed to create transaction', {
        error: error instanceof Error ? error.message : 'Unknown error',
        payload,
      });
      throw error;
    }
  }

  /**
   * Perform transaction
   */
  async performTransaction(payload: PaymeWebhookPayload): Promise<{
    perform_time: number;
    transaction: string;
    state: number;
  }> {
    try {
      const transactionId = payload.params.id || '';

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
          perform_time: transaction.perform_time || Date.now(),
          transaction: transactionId,
          state: 2,
        };
      }

      // Perform transaction
      const performTime = Date.now();
      await this.updateTransaction(transactionId, {
        perform_time: performTime,
        state: 2, // Performed
      });

      // Complete order
      await this.completeOrder(transaction.account.order_id, transaction.amount);

      logger.info('Transaction performed', {
        transactionId,
        orderId: transaction.account.order_id,
        amount: transaction.amount,
      });

      return {
        perform_time: performTime,
        transaction: transactionId,
        state: 2,
      };
    } catch (error) {
      logger.error('Failed to perform transaction', {
        error: error instanceof Error ? error.message : 'Unknown error',
        payload,
      });
      throw error;
    }
  }

  /**
   * Cancel transaction
   */
  async cancelTransaction(payload: PaymeWebhookPayload): Promise<{
    cancel_time: number;
    transaction: string;
    state: number;
  }> {
    try {
      const transactionId = payload.params.id || '';
      const reason = payload.params.reason || 0;

      if (!transactionId) {
        throw new Error('Transaction ID is required');
      }

      // Get transaction
      const transaction = await this.getTransaction(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Cancel transaction
      const cancelTime = Date.now();
      let newState = 0;

      if (transaction.state === 1) {
        newState = -1; // Cancelled before perform
      } else if (transaction.state === 2) {
        newState = -2; // Cancelled after perform (refund)
        await this.refundOrder(transaction.account.order_id, transaction.amount);
      }

      await this.updateTransaction(transactionId, {
        cancel_time: cancelTime,
        state: newState,
        reason,
      });

      logger.info('Transaction cancelled', {
        transactionId,
        orderId: transaction.account.order_id,
        reason,
        newState,
      });

      return {
        cancel_time: cancelTime,
        transaction: transactionId,
        state: newState,
      };
    } catch (error) {
      logger.error('Failed to cancel transaction', {
        error: error instanceof Error ? error.message : 'Unknown error',
        payload,
      });
      throw error;
    }
  }

  /**
   * Check transaction status
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
      const transactionId = payload.params.id || '';

      if (!transactionId) {
        throw new Error('Transaction ID is required');
      }

      // Get transaction
      const transaction = await this.getTransaction(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      return {
        create_time: transaction.create_time,
        perform_time: transaction.perform_time,
        cancel_time: transaction.cancel_time,
        transaction: transactionId,
        state: transaction.state,
        reason: transaction.reason,
      };
    } catch (error) {
      logger.error('Failed to check transaction', {
        error: error instanceof Error ? error.message : 'Unknown error',
        payload,
      });
      throw error;
    }
  }

  /**
   * Verify order exists and amount matches
   */
  private async verifyOrder(orderId: string, amount: number): Promise<boolean> {
    try {
      // Get order from database
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
        },
      });

      if (!order) {
        logger.error('Order not found', { orderId });
        return false;
      }

      // Calculate total amount
      const totalAmount = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Convert to tiyin (1 UZS = 100 tiyin)
      const amountInTiyin = Math.round(totalAmount * 100);

      if (amountInTiyin !== amount) {
        logger.error('Amount mismatch', {
          orderId,
          expectedAmount: amountInTiyin,
          receivedAmount: amount,
        });
        return false;
      }

      if (order.status !== 'pending') {
        logger.error('Order status is not pending', {
          orderId,
          status: order.status,
        });
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
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const items = order.items.map((item, index) => ({
        title: item.product.name,
        price: Math.round(item.price * 100), // Convert to tiyin
        count: item.quantity,
        code: item.product.sku || `item_${index + 1}`,
        units: 796, // Units code for pieces
        vat_percent: 12, // VAT percentage
        package_code: item.product.id.substring(0, 8),
      }));

      return { items };
    } catch (error) {
      logger.error('Failed to get order details', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
      });
      throw error;
    }
  }

  /**
   * Store transaction in database
   */
  private async storeTransaction(transaction: PaymeTransaction): Promise<PaymeTransaction> {
    try {
      await prisma.paymeTransaction.create({
        data: {
          id: transaction.id,
          time: new Date(transaction.time),
          amount: transaction.amount,
          orderId: transaction.account.order_id,
          createTime: new Date(transaction.create_time),
          performTime: transaction.perform_time ? new Date(transaction.perform_time) : null,
          cancelTime: transaction.cancel_time ? new Date(transaction.cancel_time) : null,
          state: transaction.state,
          reason: transaction.reason,
        },
      });

      logger.info('Transaction stored', {
        transactionId: transaction.id,
        orderId: transaction.account.order_id,
      });

      return transaction;
    } catch (error) {
      logger.error('Failed to store transaction', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transactionId: transaction.id,
      });
      throw error;
    }
  }

  /**
   * Get transaction from database
   */
  private async getTransaction(transactionId: string): Promise<PaymeTransaction | null> {
    try {
      const transaction = await prisma.paymeTransaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        return null;
      }

      return {
        id: transaction.id,
        time: transaction.time.getTime(),
        amount: transaction.amount,
        account: {
          order_id: transaction.orderId,
        },
        create_time: transaction.createTime.getTime(),
        perform_time: transaction.performTime?.getTime(),
        cancel_time: transaction.cancelTime?.getTime(),
        state: transaction.state,
        reason: transaction.reason,
      };
    } catch (error) {
      logger.error('Failed to get transaction', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transactionId,
      });
      return null;
    }
  }

  /**
   * Update transaction in database
   */
  private async updateTransaction(
    transactionId: string,
    updates: Partial<PaymeTransaction>
  ): Promise<void> {
    try {
      const updateData: any = {};

      if (updates.perform_time) {
        updateData.performTime = new Date(updates.perform_time);
      }
      if (updates.cancel_time) {
        updateData.cancelTime = new Date(updates.cancel_time);
      }
      if (updates.state !== undefined) {
        updateData.state = updates.state;
      }
      if (updates.reason !== undefined) {
        updateData.reason = updates.reason;
      }

      await prisma.paymeTransaction.update({
        where: { id: transactionId },
        data: updateData,
      });

      logger.info('Transaction updated', {
        transactionId,
        updates,
      });
    } catch (error) {
      logger.error('Failed to update transaction', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transactionId,
      });
      throw error;
    }
  }

  /**
   * Complete order after successful payment
   */
  private async completeOrder(orderId: string, amount: number): Promise<void> {
    try {
      // Update order status
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'paid',
          paidAt: new Date(),
          paymentMethod: 'payme',
          paymentAmount: amount / 100, // Convert from tiyin to UZS
        },
      });

      // Create payment record
      await prisma.payment.create({
        data: {
          orderId,
          amount: amount / 100,
          currency: 'UZS',
          provider: 'payme',
          status: 'completed',
          transactionId: `payme_${orderId}_${Date.now()}`,
          completedAt: new Date(),
        },
      });

      // Send notification to user
      await this.sendOrderCompletionNotification(orderId);

      logger.info('Order completed', {
        orderId,
        amount,
      });
    } catch (error) {
      logger.error('Failed to complete order', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
      });
      throw error;
    }
  }

  /**
   * Refund order after cancelled payment
   */
  private async refundOrder(orderId: string, amount: number): Promise<void> {
    try {
      // Update order status
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'refunded',
          refundedAt: new Date(),
          refundAmount: amount / 100,
        },
      });

      // Create refund record
      await prisma.refund.create({
        data: {
          orderId,
          amount: amount / 100,
          currency: 'UZS',
          provider: 'payme',
          status: 'completed',
          reason: 'Payment cancelled',
          processedAt: new Date(),
        },
      });

      logger.info('Order refunded', {
        orderId,
        amount,
      });
    } catch (error) {
      logger.error('Failed to refund order', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
      });
      throw error;
    }
  }

  /**
   * Send order completion notification
   */
  private async sendOrderCompletionNotification(orderId: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
        },
      });

      if (!order || !order.user) {
        return;
      }

      // Send notification via notification service
      await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/notifications`, {
        userId: order.userId,
        type: 'order_completed',
        title: 'Buyurtma to\'lovi muvaffaqiyatli amalga oshirildi',
        message: `Buyurtma #${orderId} uchun to'lov muvaffaqiyatli qabul qilindi.`,
        data: {
          orderId,
          amount: order.totalAmount,
        },
      });

      logger.info('Order completion notification sent', {
        orderId,
        userId: order.userId,
      });
    } catch (error) {
      logger.error('Failed to send order completion notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
      });
      // Don't throw error, notification failure shouldn't break payment flow
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha1', this.secretKey)
        .update(payload)
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      logger.error('Failed to verify webhook signature', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}
