import crypto from 'crypto';
import axios from 'axios';
import { logger } from '@ultramarket/shared';

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
  private readonly db: any; // PrismaClient from database service

  constructor() {
    this.merchantId = process.env.PAYME_MERCHANT_ID || '';
    this.secretKey = process.env.PAYME_SECRET_KEY || '';
    this.endpoint = process.env.PAYME_ENDPOINT || 'https://checkout.paycom.uz/api';
    this.testMode = process.env.NODE_ENV !== 'production';

    // Initialize database connection
    try {
      const { db } = require('../../../../libs/shared/src/database/database.service');
      this.db = db.getClient();
    } catch (error) {
      console.error('Failed to initialize database connection:', error);
      throw new Error('Database connection required for payment service');
    }

    if (!this.merchantId || !this.secretKey) {
      throw new Error('Payme payment gateway configuration is missing');
    }
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

      // Create payment URL
      const paymentUrl = this.generatePaymentUrl(request);

      return {
        success: true,
        paymentUrl,
        transactionId: request.merchantTransId,
      };
    } catch (error) {
      logger.error('Payme payment creation failed', {
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
   * Generate Payme payment URL
   */
  private generatePaymentUrl(request: PaymePaymentRequest): string {
    const params = {
      m: this.merchantId,
      ac: {
        order_id: request.orderId,
      },
      a: request.amount,
      c: request.returnUrl,
      cr: request.cancelUrl,
    };

    const encodedParams = btoa(JSON.stringify(params));
    return `${this.endpoint}?${encodedParams}`;
  }

  /**
   * Handle Payme webhook - CheckPerformTransaction
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
      logger.info('Handling Payme CheckPerformTransaction', {
        orderId: payload.params.account?.order_id,
        amount: payload.params.amount,
      });

      // Verify order exists and amount matches
      const orderValid = await this.verifyOrder(
        payload.params.account?.order_id || '',
        payload.params.amount || 0
      );

      if (!orderValid) {
        logger.error('Payme order verification failed', {
          orderId: payload.params.account?.order_id,
          amount: payload.params.amount,
        });
        throw new Error('Order not found or amount mismatch');
      }

      // Get order details for receipt
      const orderDetails = await this.getOrderDetails(payload.params.account?.order_id || '');

      return {
        allow: true,
        detail: {
          receipt_type: 0,
          items: orderDetails.items || [],
        },
      };
    } catch (error) {
      logger.error('Payme CheckPerformTransaction error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId: payload.params.account?.order_id,
      });
      throw error;
    }
  }

  /**
   * Handle Payme webhook - CreateTransaction
   */
  async createTransaction(payload: PaymeWebhookPayload): Promise<{
    create_time: number;
    transaction: string;
    state: number;
  }> {
    try {
      logger.info('Handling Payme CreateTransaction', {
        orderId: payload.params.account?.order_id,
        amount: payload.params.amount,
        id: payload.params.id,
      });

      // Check if transaction already exists
      const existingTransaction = await this.getTransaction(payload.params.id || '');
      if (existingTransaction) {
        logger.info('Payme transaction already exists', {
          transactionId: payload.params.id,
        });
        return {
          create_time: existingTransaction.create_time,
          transaction: existingTransaction.id,
          state: existingTransaction.state,
        };
      }

      // Verify order is still available
      const orderValid = await this.verifyOrder(
        payload.params.account?.order_id || '',
        payload.params.amount || 0
      );

      if (!orderValid) {
        logger.error('Payme order verification failed during create', {
          orderId: payload.params.account?.order_id,
          amount: payload.params.amount,
        });
        throw new Error('Order not found or amount mismatch');
      }

      // Create transaction
      const transaction = await this.storeTransaction({
        id: payload.params.id || '',
        time: payload.params.time || Date.now(),
        amount: payload.params.amount || 0,
        account: payload.params.account || { order_id: '' },
        create_time: Date.now(),
        state: 1, // Created
      });

      logger.info('Payme transaction created', {
        transactionId: transaction.id,
        orderId: payload.params.account?.order_id,
      });

      return {
        create_time: transaction.create_time,
        transaction: transaction.id,
        state: transaction.state,
      };
    } catch (error) {
      logger.error('Payme CreateTransaction error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId: payload.params.account?.order_id,
      });
      throw error;
    }
  }

  /**
   * Handle Payme webhook - PerformTransaction
   */
  async performTransaction(payload: PaymeWebhookPayload): Promise<{
    perform_time: number;
    transaction: string;
    state: number;
  }> {
    try {
      logger.info('Handling Payme PerformTransaction', {
        transactionId: payload.params.id,
      });

      // Get transaction
      const transaction = await this.getTransaction(payload.params.id || '');
      if (!transaction) {
        logger.error('Payme transaction not found for perform', {
          transactionId: payload.params.id,
        });
        throw new Error('Transaction not found');
      }

      // Check if already performed
      if (transaction.state === 2) {
        logger.info('Payme transaction already performed', {
          transactionId: payload.params.id,
        });
        return {
          perform_time: transaction.perform_time || Date.now(),
          transaction: transaction.id,
          state: transaction.state,
        };
      }

      // Perform transaction
      const performTime = Date.now();
      await this.updateTransaction(transaction.id, {
        state: 2, // Performed
        perform_time: performTime,
      });

      // Complete order
      await this.completeOrder(transaction.account.order_id, transaction.amount);

      logger.info('Payme transaction performed', {
        transactionId: transaction.id,
        orderId: transaction.account.order_id,
      });

      return {
        perform_time: performTime,
        transaction: transaction.id,
        state: 2,
      };
    } catch (error) {
      logger.error('Payme PerformTransaction error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transactionId: payload.params.id,
      });
      throw error;
    }
  }

  /**
   * Handle Payme webhook - CancelTransaction
   */
  async cancelTransaction(payload: PaymeWebhookPayload): Promise<{
    cancel_time: number;
    transaction: string;
    state: number;
  }> {
    try {
      logger.info('Handling Payme CancelTransaction', {
        transactionId: payload.params.id,
        reason: payload.params.reason,
      });

      // Get transaction
      const transaction = await this.getTransaction(payload.params.id || '');
      if (!transaction) {
        logger.error('Payme transaction not found for cancel', {
          transactionId: payload.params.id,
        });
        throw new Error('Transaction not found');
      }

      // Check if already cancelled
      if (transaction.state === -1 || transaction.state === -2) {
        logger.info('Payme transaction already cancelled', {
          transactionId: payload.params.id,
        });
        return {
          cancel_time: transaction.cancel_time || Date.now(),
          transaction: transaction.id,
          state: transaction.state,
        };
      }

      // Cancel transaction
      const cancelTime = Date.now();
      const newState = transaction.state === 1 ? -1 : -2; // -1 if created, -2 if performed

      await this.updateTransaction(transaction.id, {
        state: newState,
        cancel_time: cancelTime,
        reason: payload.params.reason,
      });

      // If transaction was performed, handle refund
      if (transaction.state === 2) {
        await this.refundOrder(transaction.account.order_id, transaction.amount);
      }

      logger.info('Payme transaction cancelled', {
        transactionId: transaction.id,
        orderId: transaction.account.order_id,
        reason: payload.params.reason,
      });

      return {
        cancel_time: cancelTime,
        transaction: transaction.id,
        state: newState,
      };
    } catch (error) {
      logger.error('Payme CancelTransaction error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transactionId: payload.params.id,
      });
      throw error;
    }
  }

  /**
   * Handle Payme webhook - CheckTransaction
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
      logger.info('Handling Payme CheckTransaction', {
        transactionId: payload.params.id,
      });

      // Get transaction
      const transaction = await this.getTransaction(payload.params.id || '');
      if (!transaction) {
        logger.error('Payme transaction not found for check', {
          transactionId: payload.params.id,
        });
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
      logger.error('Payme CheckTransaction error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transactionId: payload.params.id,
      });
      throw error;
    }
  }

  /**
   * Verify order exists and amount matches
   */
  private async verifyOrder(orderId: string, amount: number): Promise<boolean> {
    try {
      logger.info('Verifying order', { orderId, amount });

      // Real database order verification
      const order = await this.db.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          total: true,
          status: true,
          userId: true,
        },
      });

      if (!order) {
        logger.warn('Order not found', { orderId });
        return false;
      }

      if (order.status !== 'PENDING') {
        logger.warn('Order status invalid for payment', { 
          orderId, 
          status: order.status 
        });
        return false;
      }

      // Convert amount from tiyin to sum for comparison
      const orderAmountInTiyin = Math.round(order.total.toNumber() * 100);
      
      if (orderAmountInTiyin !== amount) {
        logger.warn('Order amount mismatch', { 
          orderId, 
          expectedAmount: orderAmountInTiyin, 
          receivedAmount: amount 
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
      logger.info('Getting order details', { orderId });

      // Get real order details from database
      const order = await this.db.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  sku: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Convert order items to Payme receipt format
      const items = order.items.map((item: any, index: number) => ({
        title: item.product.name || `Product ${item.productId}`,
        price: Math.round(item.price.toNumber() * 100), // Convert to tiyin
        count: item.quantity,
        code: item.product.sku || `ITEM_${index + 1}`,
        units: 796, // Standard unit code for "pieces"
        vat_percent: 12, // Standard VAT in Uzbekistan
        package_code: '123456', // Standard package code
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
      logger.info('Storing Payme transaction', {
        transactionId: transaction.id,
        orderId: transaction.account.order_id,
        amount: transaction.amount,
      });

      // Store payment transaction in database
      await this.db.payment.create({
        data: {
          id: transaction.id,
          orderId: transaction.account.order_id,
          amount: transaction.amount / 100, // Convert from tiyin to sum
          currency: 'UZS',
          provider: 'PAYME',
          status: 'PENDING',
          providerTransactionId: transaction.id,
          metadata: {
            payme_transaction: transaction,
            create_time: transaction.create_time,
            state: transaction.state,
          },
          createdAt: new Date(transaction.create_time),
        },
      });

      logger.info('Transaction stored successfully', {
        transactionId: transaction.id,
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
      logger.info('Getting Payme transaction', { transactionId });

      // Get transaction from database
      const payment = await this.db.payment.findUnique({
        where: {
          providerTransactionId: transactionId,
          provider: 'PAYME',
        },
      });

      if (!payment) {
        logger.warn('Transaction not found', { transactionId });
        return null;
      }

      // Convert database payment to PaymeTransaction format
      const transaction: PaymeTransaction = {
        id: transactionId,
        time: payment.metadata?.payme_transaction?.time || payment.createdAt.getTime(),
        amount: Math.round(payment.amount.toNumber() * 100), // Convert to tiyin
        account: {
          order_id: payment.orderId,
        },
        create_time: payment.metadata?.create_time || payment.createdAt.getTime(),
        perform_time: payment.metadata?.perform_time,
        cancel_time: payment.metadata?.cancel_time,
        state: payment.metadata?.state || 1,
        reason: payment.metadata?.reason,
      };

      return transaction;
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
      logger.info('Updating Payme transaction', {
        transactionId,
        updates,
      });

      // Update payment status based on transaction state
      let paymentStatus = 'PENDING';
      if (updates.perform_time) {
        paymentStatus = 'COMPLETED';
      } else if (updates.cancel_time) {
        paymentStatus = 'CANCELLED';
      }

      // Update transaction in database
      await this.db.payment.updateMany({
        where: {
          providerTransactionId: transactionId,
          provider: 'PAYME',
        },
        data: {
          status: paymentStatus,
          metadata: {
            update_time: Date.now(),
            ...updates,
          },
          updatedAt: new Date(),
        },
      });

      logger.info('Transaction updated successfully', {
        transactionId,
        status: paymentStatus,
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
      logger.info('Completing order', { orderId, amount });

      // Update order status to PAID
      const order = await this.db.order.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
            },
          },
        },
      });

      // Create notification for user
      await this.db.notification.create({
        data: {
          userId: order.userId,
          title: 'To\'lov muvaffaqiyatli amalga oshirildi',
          message: `Buyurtma #${orderId} uchun to\'lov qabul qilindi. Summa: ${amount / 100} so'm`,
          type: 'PAYMENT_SUCCESS',
          isRead: false,
        },
      });

      // Log successful payment
      logger.info('Order completed successfully', {
        orderId,
        userId: order.userId,
        amount: amount / 100,
        userEmail: order.user.email,
      });

      // Here you could trigger other services:
      // - Inventory service to update stock
      // - Shipping service to create shipment
      // - Email service to send confirmation
      // - Analytics service for tracking

    } catch (error) {
      logger.error('Failed to complete order', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
      });
      throw error;
    }
  }

  /**
   * Refund order after transaction cancellation
   */
  private async refundOrder(orderId: string, amount: number): Promise<void> {
    try {
      logger.info('Refunding order', { orderId, amount });

      // Update order status to CANCELLED
      const order = await this.db.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
            },
          },
        },
      });

      // Create notification for user
      await this.db.notification.create({
        data: {
          userId: order.userId,
          title: 'To\'lov bekor qilindi',
          message: `Buyurtma #${orderId} uchun to\'lov bekor qilindi. Summa: ${amount / 100} so'm`,
          type: 'PAYMENT_CANCELLED',
          isRead: false,
        },
      });

      // Log cancelled payment
      logger.info('Order refunded successfully', {
        orderId,
        userId: order.userId,
        amount: amount / 100,
        userEmail: order.user.email,
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
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha1', this.secretKey)
        .update(payload)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      logger.error('Failed to verify webhook signature', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}
