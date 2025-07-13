/**
 * Payment Repository
 * Professional database operations for payment transactions
 */

import { PrismaClient } from '@prisma/client';
import { 
  PaymentTransaction, 
  PaymentWebhook, 
  PaymentMethod, 
  PaymentRefund,
  PaymentStatus,
  PaymentProvider,
  RefundStatus 
} from '../models/payment.model';
import { logger } from '../utils/logger';

export class PaymentRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create payment transaction
   */
  async createTransaction(data: Omit<PaymentTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentTransaction> {
    try {
      const transaction = await this.prisma.paymentTransaction.create({
        data: {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      logger.info('Payment transaction created', { transactionId: transaction.id });
      return transaction as PaymentTransaction;
    } catch (error) {
      logger.error('Failed to create payment transaction', { error, data });
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: string): Promise<PaymentTransaction | null> {
    try {
      const transaction = await this.prisma.paymentTransaction.findUnique({
        where: { id }
      });

      return transaction as PaymentTransaction | null;
    } catch (error) {
      logger.error('Failed to get transaction by ID', { error, id });
      throw error;
    }
  }

  /**
   * Get transaction by order ID
   */
  async getTransactionByOrderId(orderId: string): Promise<PaymentTransaction | null> {
    try {
      const transaction = await this.prisma.paymentTransaction.findFirst({
        where: { orderId },
        orderBy: { createdAt: 'desc' }
      });

      return transaction as PaymentTransaction | null;
    } catch (error) {
      logger.error('Failed to get transaction by order ID', { error, orderId });
      throw error;
    }
  }

  /**
   * Get transaction by provider transaction ID
   */
  async getTransactionByProviderTransactionId(providerTransactionId: string): Promise<PaymentTransaction | null> {
    try {
      const transaction = await this.prisma.paymentTransaction.findFirst({
        where: { providerTransactionId }
      });

      return transaction as PaymentTransaction | null;
    } catch (error) {
      logger.error('Failed to get transaction by provider transaction ID', { error, providerTransactionId });
      throw error;
    }
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    id: string, 
    status: PaymentStatus, 
    metadata?: Record<string, any>
  ): Promise<PaymentTransaction> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      if (status === PaymentStatus.COMPLETED) {
        updateData.completedAt = new Date();
      } else if (status === PaymentStatus.FAILED) {
        updateData.failedAt = new Date();
      }

      if (metadata) {
        updateData.metadata = metadata;
      }

      const transaction = await this.prisma.paymentTransaction.update({
        where: { id },
        data: updateData
      });

      logger.info('Payment transaction status updated', { 
        transactionId: id, 
        status, 
        metadata 
      });

      return transaction as PaymentTransaction;
    } catch (error) {
      logger.error('Failed to update transaction status', { error, id, status });
      throw error;
    }
  }

  /**
   * Store prepare transaction
   */
  async storePrepareTransaction(
    transactionId: string,
    providerTransactionId: string,
    providerPrepareId: string
  ): Promise<void> {
    try {
      await this.prisma.paymentTransaction.update({
        where: { id: transactionId },
        data: {
          providerTransactionId,
          providerPrepareId,
          status: PaymentStatus.PROCESSING,
          updatedAt: new Date()
        }
      });

      logger.info('Prepare transaction stored', {
        transactionId,
        providerTransactionId,
        providerPrepareId
      });
    } catch (error) {
      logger.error('Failed to store prepare transaction', {
        error,
        transactionId,
        providerTransactionId
      });
      throw error;
    }
  }

  /**
   * Verify prepare transaction
   */
  async verifyPrepareTransaction(
    providerTransactionId: string,
    providerPrepareId: string
  ): Promise<boolean> {
    try {
      const transaction = await this.prisma.paymentTransaction.findFirst({
        where: {
          providerTransactionId,
          providerPrepareId,
          status: PaymentStatus.PROCESSING
        }
      });

      return !!transaction;
    } catch (error) {
      logger.error('Failed to verify prepare transaction', {
        error,
        providerTransactionId,
        providerPrepareId
      });
      return false;
    }
  }

  /**
   * Create webhook record
   */
  async createWebhook(data: Omit<PaymentWebhook, 'id' | 'createdAt'>): Promise<PaymentWebhook> {
    try {
      const webhook = await this.prisma.paymentWebhook.create({
        data: {
          ...data,
          createdAt: new Date()
        }
      });

      logger.info('Payment webhook created', { webhookId: webhook.id });
      return webhook as PaymentWebhook;
    } catch (error) {
      logger.error('Failed to create webhook', { error, data });
      throw error;
    }
  }

  /**
   * Mark webhook as processed
   */
  async markWebhookProcessed(id: string): Promise<void> {
    try {
      await this.prisma.paymentWebhook.update({
        where: { id },
        data: {
          processed: true,
          processedAt: new Date()
        }
      });

      logger.info('Webhook marked as processed', { webhookId: id });
    } catch (error) {
      logger.error('Failed to mark webhook as processed', { error, id });
      throw error;
    }
  }

  /**
   * Create refund
   */
  async createRefund(data: Omit<PaymentRefund, 'id' | 'createdAt'>): Promise<PaymentRefund> {
    try {
      const refund = await this.prisma.paymentRefund.create({
        data: {
          ...data,
          createdAt: new Date()
        }
      });

      logger.info('Payment refund created', { refundId: refund.id });
      return refund as PaymentRefund;
    } catch (error) {
      logger.error('Failed to create refund', { error, data });
      throw error;
    }
  }

  /**
   * Update refund status
   */
  async updateRefundStatus(
    id: string,
    status: RefundStatus,
    providerRefundId?: string,
    errorMessage?: string
  ): Promise<PaymentRefund> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      if (status === RefundStatus.COMPLETED) {
        updateData.processedAt = new Date();
      }

      if (providerRefundId) {
        updateData.providerRefundId = providerRefundId;
      }

      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      }

      const refund = await this.prisma.paymentRefund.update({
        where: { id },
        data: updateData
      });

      logger.info('Refund status updated', { refundId: id, status });
      return refund as PaymentRefund;
    } catch (error) {
      logger.error('Failed to update refund status', { error, id, status });
      throw error;
    }
  }

  /**
   * Get user transactions
   */
  async getUserTransactions(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<PaymentTransaction[]> {
    try {
      const transactions = await this.prisma.paymentTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      return transactions as PaymentTransaction[];
    } catch (error) {
      logger.error('Failed to get user transactions', { error, userId });
      throw error;
    }
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(dateFrom: Date, dateTo: Date): Promise<any> {
    try {
      const stats = await this.prisma.paymentTransaction.groupBy({
        by: ['status'],
        where: {
          createdAt: {
            gte: dateFrom,
            lte: dateTo
          }
        },
        _count: {
          id: true
        },
        _sum: {
          amount: true
        }
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get transaction stats', { error, dateFrom, dateTo });
      throw error;
    }
  }
}