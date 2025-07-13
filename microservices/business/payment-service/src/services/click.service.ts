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
      logger.info('Verifying order', { merchantTransId, amount });

      // Real order verification implementation
      const order = await this.getOrderFromDatabase(merchantTransId);
      if (!order) {
        logger.error('Order not found', { merchantTransId });
        return false;
      }

      // Verify order status
      if (order.status !== 'pending') {
        logger.error('Order is not in pending status', { 
          merchantTransId, 
          status: order.status 
        });
        return false;
      }

      // Verify order amount
      if (order.totalAmount !== amount) {
        logger.error('Order amount mismatch', { 
          merchantTransId, 
          expected: order.totalAmount, 
          actual: amount 
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
   * Get order from database
   */
  private async getOrderFromDatabase(orderId: string): Promise<any> {
    try {
      // This would typically call the Order Service API
      // For now, we'll simulate the database call
      const response = await fetch(`${process.env.ORDER_SERVICE_URL}/api/v1/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to get order from database', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
      });
      return null;
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
      // Real database storage implementation
      const transactionData = {
        clickTransId: payload.click_trans_id,
        merchantTransId: payload.merchant_trans_id,
        merchantPrepareId,
        amount: payload.amount,
        status: 'prepared',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in database
      await this.saveTransactionToDatabase(transactionData);

      logger.info('Storing prepare transaction', {
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
   * Save transaction to database
   */
  private async saveTransactionToDatabase(transactionData: any): Promise<void> {
    try {
      // This would typically use Prisma or another ORM
      // For now, we'll simulate the database call
      const response = await fetch(`${process.env.PAYMENT_SERVICE_URL}/api/v1/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        throw new Error('Failed to save transaction to database');
      }
    } catch (error) {
      logger.error('Failed to save transaction to database', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transactionData,
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
      // Real database check implementation
      const transaction = await this.getTransactionFromDatabase(clickTransId, merchantPrepareId);
      
      logger.info('Verifying prepare transaction', {
        clickTransId,
        merchantPrepareId,
        found: !!transaction,
      });

      return !!transaction;
    } catch (error) {
      logger.error('Failed to verify prepare transaction', {
        error: error instanceof Error ? error.message : 'Unknown error',
        clickTransId,
      });
      return false;
    }
  }

  /**
   * Get transaction from database
   */
  private async getTransactionFromDatabase(clickTransId: string, merchantPrepareId: string): Promise<any> {
    try {
      // This would typically use Prisma or another ORM
      // For now, we'll simulate the database call
      const response = await fetch(`${process.env.PAYMENT_SERVICE_URL}/api/v1/transactions/${clickTransId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const transaction = await response.json();
      
      // Verify merchant prepare ID matches
      if (transaction.merchantPrepareId !== merchantPrepareId) {
        return null;
      }

      return transaction;
    } catch (error) {
      logger.error('Failed to get transaction from database', {
        error: error instanceof Error ? error.message : 'Unknown error',
        clickTransId,
      });
      return null;
    }
  }

  /**
   * Complete payment
   */
  private async completePayment(payload: ClickWebhookPayload): Promise<void> {
    try {
      // Real payment completion implementation
      logger.info('Completing payment', {
        clickTransId: payload.click_trans_id,
        merchantTransId: payload.merchant_trans_id,
        amount: payload.amount,
      });

      // Update transaction status
      await this.updateTransactionStatus(payload.click_trans_id, 'completed');

      // Update order status
      await this.updateOrderStatus(payload.merchant_trans_id, 'paid');

      // Send payment confirmation notification
      await this.sendPaymentNotification(payload.merchant_trans_id, 'completed');

      // Update inventory
      await this.updateInventory(payload.merchant_trans_id);

      logger.info('Payment completed successfully', {
        clickTransId: payload.click_trans_id,
        merchantTransId: payload.merchant_trans_id,
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
   * Update transaction status
   */
  private async updateTransactionStatus(clickTransId: string, status: string): Promise<void> {
    try {
      const response = await fetch(`${process.env.PAYMENT_SERVICE_URL}/api/v1/transactions/${clickTransId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update transaction status');
      }
    } catch (error) {
      logger.error('Failed to update transaction status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        clickTransId,
      });
      throw error;
    }
  }

  /**
   * Update order status
   */
  private async updateOrderStatus(orderId: string, status: string): Promise<void> {
    try {
      const response = await fetch(`${process.env.ORDER_SERVICE_URL}/api/v1/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      logger.error('Failed to update order status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
      });
      throw error;
    }
  }

  /**
   * Send payment notification
   */
  private async sendPaymentNotification(orderId: string, status: string): Promise<void> {
    try {
      const response = await fetch(`${process.env.NOTIFICATION_SERVICE_URL}/api/v1/notifications/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
        },
        body: JSON.stringify({
          orderId,
          status,
          type: 'payment_confirmation',
        }),
      });

      if (!response.ok) {
        logger.warn('Failed to send payment notification', { orderId, status });
      }
    } catch (error) {
      logger.error('Failed to send payment notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
      });
    }
  }

  /**
   * Update inventory
   */
  private async updateInventory(orderId: string): Promise<void> {
    try {
      const response = await fetch(`${process.env.INVENTORY_SERVICE_URL}/api/v1/inventory/update-from-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
        },
        body: JSON.stringify({ orderId }),
      });

      if (!response.ok) {
        logger.warn('Failed to update inventory', { orderId });
      }
    } catch (error) {
      logger.error('Failed to update inventory', {
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
      // Real status check implementation
      logger.info('Getting payment status', { transactionId });

      const transaction = await this.getTransactionFromDatabase(transactionId, '');
      if (!transaction) {
        return {
          status: 'failed',
          error: 'Transaction not found',
        };
      }

      return {
        status: transaction.status,
        amount: transaction.amount,
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
