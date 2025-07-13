import crypto from 'crypto';
import axios from 'axios';
import { logger } from '@ultramarket/shared';
import { PaymentRepository } from '../repositories/payment.repository';
import { IOrderService, Order, OrderStatus } from '../interfaces/order.interface';

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
  private readonly paymentRepository: PaymentRepository;
  private readonly orderService: IOrderService;

  constructor(orderService: IOrderService, prisma: any) {
    this.merchantId = process.env.PAYME_MERCHANT_ID || '';
    this.secretKey = process.env.PAYME_SECRET_KEY || '';
    this.endpoint = process.env.PAYME_ENDPOINT || 'https://checkout.paycom.uz/api';
    this.testMode = process.env.NODE_ENV !== 'production';
    this.paymentRepository = new PaymentRepository(prisma);
    this.orderService = orderService;

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
      logger.info('Verifying order with order service', { orderId, amount });

      // Get order from order service
      const order = await this.orderService.getOrderById(orderId);
      
      if (!order) {
        logger.warn('Order not found', { orderId });
        return false;
      }

      // Verify order status and amount
      const isValid = order.status === 'pending' && 
                     Math.abs(order.amount - amount) < 0.01; // Allow small floating point differences

      if (!isValid) {
        logger.warn('Order verification failed', {
          orderId,
          expectedAmount: amount,
          actualAmount: order.amount,
          status: order.status
        });
      }

      return isValid;
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
      logger.info('Getting order details from order service', { orderId });

      // Get order details from order service
      const order = await this.orderService.getOrderById(orderId);
      
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Convert order items to Payme receipt format
      const items = order.items.map((item, index) => ({
        title: item.productName,
        price: Math.round(item.price * 100), // Convert to tiyin (1/100 som)
        count: item.quantity,
        code: item.productId || `ITEM_${index + 1}`,
        units: 796, // Dona (piece) - standard unit code in Uzbekistan
        vat_percent: 12, // Standard VAT in Uzbekistan
        package_code: '123456'
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
      logger.info('Storing Payme transaction in database', {
        transactionId: transaction.id,
        orderId: transaction.account.order_id,
        amount: transaction.amount,
        state: transaction.state
      });

      // Store transaction using repository
      const storedTransaction = await this.paymentRepository.createPaymentTransaction({
        id: transaction.id,
        orderId: transaction.account.order_id,
        amount: transaction.amount,
        currency: 'UZS',
        provider: 'payme',
        status: this.mapPaymeStateToStatus(transaction.state),
        providerTransactionId: transaction.id,
        metadata: {
          payme_transaction: transaction,
          create_time: transaction.create_time,
          perform_time: transaction.perform_time,
          cancel_time: transaction.cancel_time,
          reason: transaction.reason
        },
        createdAt: new Date(transaction.create_time),
        updatedAt: new Date()
      });

      logger.info('Payme transaction stored successfully', {
        transactionId: transaction.id,
        dbId: storedTransaction.id
      });

      return transaction;
    } catch (error) {
      logger.error('Failed to store Payme transaction', {
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
      logger.info('Getting Payme transaction from database', { transactionId });

      // Get transaction from database
      const dbTransaction = await this.paymentRepository.getTransactionByProviderTransactionId(
        transactionId, 
        'payme'
      );

      if (!dbTransaction) {
        logger.info('Payme transaction not found in database', { transactionId });
        return null;
      }

      // Convert database transaction back to Payme format
      const paymeTransaction: PaymeTransaction = {
        id: transactionId,
        time: dbTransaction.metadata?.payme_transaction?.time || Date.now(),
        amount: dbTransaction.amount,
        account: {
          order_id: dbTransaction.orderId
        },
        create_time: dbTransaction.metadata?.create_time || dbTransaction.createdAt.getTime(),
        perform_time: dbTransaction.metadata?.perform_time,
        cancel_time: dbTransaction.metadata?.cancel_time,
        state: this.mapStatusToPaymeState(dbTransaction.status),
        reason: dbTransaction.metadata?.reason
      };

      logger.info('Payme transaction retrieved from database', {
        transactionId,
        state: paymeTransaction.state
      });

      return paymeTransaction;
    } catch (error) {
      logger.error('Failed to get Payme transaction from database', {
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
      logger.info('Updating Payme transaction in database', {
        transactionId,
        updates: Object.keys(updates)
      });

      // Get existing transaction
      const existingTransaction = await this.paymentRepository.getTransactionByProviderTransactionId(
        transactionId,
        'payme'
      );

      if (!existingTransaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      // Prepare update data
      const updateData: any = {
        updatedAt: new Date()
      };

      if (updates.state !== undefined) {
        updateData.status = this.mapPaymeStateToStatus(updates.state);
      }

      if (updates.perform_time || updates.cancel_time) {
        updateData.metadata = {
          ...existingTransaction.metadata,
          perform_time: updates.perform_time,
          cancel_time: updates.cancel_time,
          reason: updates.reason
        };
      }

      // Update in database
      await this.paymentRepository.updatePaymentTransaction(
        existingTransaction.id,
        updateData
      );

      logger.info('Payme transaction updated successfully', {
        transactionId,
        newState: updates.state
      });
    } catch (error) {
      logger.error('Failed to update Payme transaction', {
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
      logger.info('Completing order after successful payment', { orderId, amount });

      // Update order status to paid
      await this.orderService.updateOrderStatus(orderId, OrderStatus.CONFIRMED);

      // Send order confirmation notifications
      const order = await this.orderService.getOrderById(orderId);
      if (order) {
        // Send email confirmation
        await this.sendOrderConfirmationEmail(order);
        
        // Send SMS confirmation if phone number available
        if (order.customer.phone) {
          await this.sendOrderConfirmationSMS(order);
        }

        // Create inventory reservations
        await this.reserveOrderItems(order);

        // Log successful completion
        logger.info('Order completed successfully', {
          orderId,
          amount,
          userId: order.userId
        });
      }
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
      logger.info('Processing order refund', { orderId, amount });

      // Update order status to refunded
      await this.orderService.updateOrderStatus(orderId, OrderStatus.REFUNDED);

      // Create refund record (simplified for now)
      logger.info('Creating refund record', {
        orderId,
        amount,
        currency: 'UZS',
        provider: 'payme'
      });

      // Release inventory reservations
      const order = await this.orderService.getOrderById(orderId);
      if (order) {
        await this.releaseOrderItems(order);

        // Send refund notification
        await this.sendRefundNotificationEmail(order, amount);

        logger.info('Order refund processed successfully', {
          orderId,
          amount,
          userId: order.userId
        });
      }
    } catch (error) {
      logger.error('Failed to process order refund', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
      });
      throw error;
    }
  }

  // Helper methods for order completion
  private async sendOrderConfirmationEmail(order: Order): Promise<void> {
    // Implementation would integrate with email service
    logger.info('Sending order confirmation email', {
      orderId: order.id,
      email: order.customer.email
    });
  }

  private async sendOrderConfirmationSMS(order: Order): Promise<void> {
    // Implementation would integrate with SMS service
    logger.info('Sending order confirmation SMS', {
      orderId: order.id,
      phone: order.customer.phone
    });
  }

  private async sendRefundNotificationEmail(order: Order, amount: number): Promise<void> {
    // Implementation would integrate with email service
    logger.info('Sending refund notification email', {
      orderId: order.id,
      email: order.customer.email,
      amount
    });
  }

  private async reserveOrderItems(order: Order): Promise<void> {
    // Implementation would integrate with inventory service
    logger.info('Reserving order items', {
      orderId: order.id,
      itemCount: order.items.length
    });
  }

  private async releaseOrderItems(order: Order): Promise<void> {
    // Implementation would integrate with inventory service
    logger.info('Releasing order items', {
      orderId: order.id,
      itemCount: order.items.length
    });
  }

  // State mapping utilities
  private mapPaymeStateToStatus(state: number): string {
    switch (state) {
      case 1: return 'pending';
      case 2: return 'completed';
      case -1: return 'cancelled_before_perform';
      case -2: return 'cancelled_after_perform';
      default: return 'unknown';
    }
  }

  private mapStatusToPaymeState(status: string): number {
    switch (status) {
      case 'pending': return 1;
      case 'completed': return 2;
      case 'cancelled_before_perform': return -1;
      case 'cancelled_after_perform': return -2;
      default: return 1;
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
