import crypto from 'crypto';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
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
    this.endpoint = process.env.PAYME_ENDPOINT || 'https://checkout.paycom.uz';
    this.testMode = process.env.NODE_ENV === 'development';

    if (!this.merchantId || !this.secretKey) {
      throw new Error('Payme credentials not configured');
    }
  }

  async createPayment(request: PaymePaymentRequest): Promise<PaymePaymentResponse> {
    try {
      const paymentUrl = this.generatePaymentUrl(request);

      // Store payment request in database
      await prisma.paymentRequest.create({
        data: {
          orderId: request.orderId,
          userId: request.userId,
          amount: request.amount,
          method: 'payme',
          status: 'pending',
          merchantTransId: request.merchantTransId,
          description: request.description,
        },
      });

      return {
        success: true,
        paymentUrl,
        transactionId: request.merchantTransId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment creation failed',
      };
    }
  }

  private generatePaymentUrl(request: PaymePaymentRequest): string {
    const params = new URLSearchParams({
      m: this.merchantId,
      'ac.order_id': request.orderId,
      a: (request.amount * 100).toString(), // Convert to tiyin
      c: request.returnUrl,
      l: 'uz',
    });

    return `${this.endpoint}/${Buffer.from(this.merchantId).toString('base64')}?${params.toString()}`;
  }

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
      const orderExists = await this.verifyOrder(orderId, amount);
      if (!orderExists) {
        return { allow: false };
      }

      // Get order details for receipt
      const orderDetails = await this.getOrderDetails(orderId);

      return {
        allow: true,
        detail: {
          receipt_type: 0, // Cash receipt
          items: orderDetails.items,
        },
      };
    } catch (error) {
      return { allow: false };
    }
  }

  async createTransaction(payload: PaymeWebhookPayload): Promise<{
    create_time: number;
    transaction: string;
    state: number;
  }> {
    try {
      const transactionId = payload.params.id;
      const orderId = payload.params.account?.order_id;
      const amount = payload.params.amount || 0;

      if (!transactionId || !orderId) {
        throw new Error('Invalid transaction parameters');
      }

      // Store transaction in database
      const transaction = await this.storeTransaction({
        id: transactionId,
        time: Date.now(),
        amount,
        account: { order_id: orderId },
        create_time: Date.now(),
        state: 1, // Pending
      });

      return {
        create_time: transaction.create_time,
        transaction: transaction.id,
        state: transaction.state,
      };
    } catch (error) {
      throw error;
    }
  }

  async performTransaction(payload: PaymeWebhookPayload): Promise<{
    perform_time: number;
    transaction: string;
    state: number;
  }> {
    try {
      const transactionId = payload.params.id;
      const orderId = payload.params.account?.order_id;
      const amount = payload.params.amount || 0;

      if (!transactionId || !orderId) {
        throw new Error('Invalid transaction parameters');
      }

      // Update transaction state
      await this.updateTransaction(transactionId, {
        perform_time: Date.now(),
        state: 2, // Completed
      });

      // Complete order
      await this.completeOrder(orderId, amount);

      return {
        perform_time: Date.now(),
        transaction: transactionId,
        state: 2,
      };
    } catch (error) {
      throw error;
    }
  }

  async cancelTransaction(payload: PaymeWebhookPayload): Promise<{
    cancel_time: number;
    transaction: string;
    state: number;
  }> {
    try {
      const transactionId = payload.params.id;
      const orderId = payload.params.account?.order_id;
      const amount = payload.params.amount || 0;
      const reason = payload.params.reason || 0;

      if (!transactionId || !orderId) {
        throw new Error('Invalid transaction parameters');
      }

      // Update transaction state
      await this.updateTransaction(transactionId, {
        cancel_time: Date.now(),
        state: -1, // Cancelled
        reason,
      });

      // Handle refund if needed
      if (reason === 4) { // Refund reason
        await this.refundOrder(orderId, amount);
      }

      return {
        cancel_time: Date.now(),
        transaction: transactionId,
        state: -1,
      };
    } catch (error) {
      throw error;
    }
  }

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
        throw new Error('Transaction ID required');
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
      throw error;
    }
  }

  /**
   * Verify order exists and amount matches
   */
  private async verifyOrder(orderId: string, amount: number): Promise<boolean> {
    try {
      // Call Order Service to verify order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, total: true, status: true },
      });

      if (!order) {
        return false;
      }

      // Check if order is pending and amount matches
      const orderAmount = Number(order.total) * 100; // Convert to tiyin
      return order.status === 'PENDING' && orderAmount === amount;
    } catch (error) {
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

      const items = order.items.map((item) => ({
        title: item.product.name,
        price: Number(item.price) * 100, // Convert to tiyin
        count: item.quantity,
        code: item.product.id,
        units: 796, // Default units
        vat_percent: 12, // Default VAT
        package_code: item.product.id,
      }));

      return { items };
    } catch (error) {
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
          orderId: transaction.account.order_id,
          amount: transaction.amount,
          state: transaction.state,
          createTime: transaction.create_time,
          performTime: transaction.perform_time,
          cancelTime: transaction.cancel_time,
          reason: transaction.reason,
        },
      });

      return transaction;
    } catch (error) {
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
        time: transaction.createTime,
        amount: transaction.amount,
        account: { order_id: transaction.orderId },
        create_time: transaction.createTime,
        perform_time: transaction.performTime,
        cancel_time: transaction.cancelTime,
        state: transaction.state,
        reason: transaction.reason,
      };
    } catch (error) {
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
      await prisma.paymeTransaction.update({
        where: { id: transactionId },
        data: {
          state: updates.state,
          performTime: updates.perform_time,
          cancelTime: updates.cancel_time,
          reason: updates.reason,
        },
      });
    } catch (error) {
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
        data: { status: 'CONFIRMED' },
      });

      // Send notification to user
      await this.sendPaymentNotification(orderId, 'payment_success', {
        amount: amount,
        currency: 'UZS', // Assuming UZS for now
        transactionId: orderId,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Refund order after transaction cancellation
   */
  private async refundOrder(orderId: string, amount: number): Promise<void> {
    try {
      // Update order status to cancelled
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      // Process refund logic
      await this.processRefund({
        userId: orderId, // Assuming orderId is the user ID for refund
        amount: amount,
        currency: 'UZS',
        transactionId: orderId,
        reason: 4, // Refund reason
      });
    } catch (error) {
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
      return false;
    }
  }

  private async sendPaymentNotification(
    userId: string, 
    type: string, 
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      // Simple notification implementation - can be extended later
      console.log(`Payment notification sent to user ${userId}:`, {
        type,
        data,
        timestamp: new Date().toISOString()
      });
      
      // TODO: Integrate with actual notification service when available
      // For now, just log the notification
    } catch (error) {
      console.warn('Failed to send payment notification:', error);
      // Don't throw error as notification failure shouldn't break payment flow
    }
  }

  async processRefund(refundData: {
    userId: string;
    amount: number;
    currency: string;
    transactionId: string;
    reason: number;
  }): Promise<{
    success: boolean;
    refundId?: string;
    amount: number;
    currency: string;
    status: string;
  }> {
    try {
      // Validate refund data
      if (!refundData.transactionId || !refundData.amount || !refundData.reason) {
        throw new Error('Invalid refund data');
      }

      // Call Payme refund API
      const refundResponse = await this.callPaymeRefundAPI(refundData);
      
      if (!refundResponse.success) {
        throw new Error(`Refund failed: ${refundResponse.message}`);
      }

      // Update database
      await this.updateRefundStatus(refundData.transactionId, 'completed', refundResponse.refundId);

      // Send notification
      await this.sendPaymentNotification(refundData.userId, 'refund_success', {
        amount: refundData.amount,
        currency: refundData.currency,
        transactionId: refundData.transactionId,
        refundId: refundResponse.refundId,
        reason: refundData.reason
      });

      return {
        success: true,
        refundId: refundResponse.refundId,
        amount: refundData.amount,
        currency: refundData.currency,
        status: 'completed'
      };
    } catch (error) {
      // logger.error('Payme refund processing failed:', error); // logger is not defined
      throw new Error('Refund processing failed');
    }
  }

  private async callPaymeRefundAPI(refundData: {
    userId: string;
    amount: number;
    currency: string;
    transactionId: string;
    reason: number;
  }): Promise<{
    success: boolean;
    refundId?: string;
    message?: string;
  }> {
    try {
      const response = await axios.post(
        `${this.endpoint}/refund`, // Assuming endpoint is the base URL for refund
        {
          transaction_id: refundData.transactionId,
          amount: refundData.amount,
          reason: refundData.reason,
          merchant_id: this.merchantId,
          timestamp: Date.now()
        },
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: response.data.success,
        refundId: response.data.refund_id,
        message: response.data.message
      };
    } catch (error) {
      // logger.error('Payme refund API call failed:', error); // logger is not defined
      return {
        success: false,
        message: 'Refund API call failed'
      };
    }
  }

  private async updateRefundStatus(
    transactionId: string, 
    status: string, 
    refundId?: string
  ): Promise<void> {
    try {
      await prisma.paymeTransaction.update({
        where: { id: transactionId },
        data: {
          refundStatus: status,
          refundId,
          refundedAt: status === 'completed' ? new Date() : null
        }
      });
    } catch (error) {
      // logger.error('Failed to update refund status:', error); // logger is not defined
      throw new Error('Failed to update refund status');
    }
  }
}
