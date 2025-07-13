import crypto from 'crypto';
import axios from 'axios';
import { logger } from '@ultramarket/shared';
import { AppError, HttpStatusCode, ErrorCode, ResourceNotFoundError, BusinessRuleViolationError, AuthorizationError, ValidationError } from '../../libs/shared';

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
      throw new AppError(HttpStatusCode.INTERNAL_SERVER_ERROR, 'Payme payment gateway configuration is missing', ErrorCode.INTERNAL_ERROR);
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
        throw new ResourceNotFoundError('Resource', 'Order not found or amount mismatch');
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
        throw new ResourceNotFoundError('Resource', 'Order not found or amount mismatch');
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
        throw new ResourceNotFoundError('Resource', 'Transaction not found');
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
        throw new ResourceNotFoundError('Resource', 'Transaction not found');
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
        throw new ResourceNotFoundError('Resource', 'Transaction not found');
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
      // This would typically call the Order Service
      logger.info('Verifying order', { orderId, amount });

      // TODO: Implement actual order verification
      // const order = await orderService.getOrder(orderId);
      // return order && order.amount === amount && order.status === 'pending';

      return true; // Temporary for development
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
      // TODO: Get actual order details
      logger.info('Getting order details', { orderId });

      return {
        items: [
          {
            title: 'Order #' + orderId,
            price: 100000, // Amount in tiyin
            count: 1,
            code: '123456789',
            units: 796,
            vat_percent: 12,
            package_code: '123456',
          },
        ],
      };
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
      // TODO: Store in database
      logger.info('Storing Payme transaction', {
        transactionId: transaction.id,
        orderId: transaction.account.order_id,
        amount: transaction.amount,
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
      // TODO: Get from database
      logger.info('Getting Payme transaction', { transactionId });

      return null; // Temporary for development
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
      // TODO: Update in database
      logger.info('Updating Payme transaction', {
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
      // TODO: Update order status, send notifications, etc.
      logger.info('Completing order', { orderId, amount });
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
      // TODO: Handle refund logic
      logger.info('Refunding order', { orderId, amount });
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
