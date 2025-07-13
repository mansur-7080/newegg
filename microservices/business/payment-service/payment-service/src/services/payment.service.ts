import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface PaymentData {
  amount: number;
  currency: string;
  orderId: string;
  userId: string;
  paymentMethod: 'click' | 'payme' | 'uzcard';
  description?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;
  status: 'pending' | 'success' | 'failed';
  message: string;
  amount?: number;
  currency?: string;
}

export interface RefundData {
  transactionId: string;
  amount: number;
  reason: string;
  userId: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  message: string;
}

export interface PaymentStatus {
  transactionId: string;
  status: 'pending' | 'success' | 'failed';
  amount: number;
  currency: string;
  timestamp: Date;
  paymentMethod: string;
}

export class PaymentService {
  private readonly logger = logger;

  async createPayment(paymentData: PaymentData): Promise<PaymentResult> {
    try {
      this.logger.info('Creating payment', { paymentData });

      // Validate payment data
      if (!paymentData.amount || paymentData.amount <= 0) {
        throw new Error('Invalid payment amount');
      }

      if (!paymentData.orderId || !paymentData.userId) {
        throw new Error('Missing required payment data');
      }

      // Create payment record in database
      const payment = await prisma.payment.create({
        data: {
          amount: paymentData.amount,
          currency: paymentData.currency,
          orderId: paymentData.orderId,
          userId: paymentData.userId,
          paymentMethod: paymentData.paymentMethod,
          status: 'pending',
          description: paymentData.description,
          returnUrl: paymentData.returnUrl,
          cancelUrl: paymentData.cancelUrl,
        },
      });

      // Process payment based on method
      let paymentResult: PaymentResult;

      switch (paymentData.paymentMethod) {
        case 'click':
          paymentResult = await this.processClickPayment(payment, paymentData);
          break;
        case 'payme':
          paymentResult = await this.processPaymePayment(payment, paymentData);
          break;
        case 'uzcard':
          paymentResult = await this.processUzcardPayment(payment, paymentData);
          break;
        default:
          throw new Error(`Unsupported payment method: ${paymentData.paymentMethod}`);
      }

      // Update payment record with result
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: paymentResult.status,
          transactionId: paymentResult.transactionId,
          paymentUrl: paymentResult.paymentUrl,
        },
      });

      this.logger.info('Payment created successfully', { 
        paymentId: payment.id, 
        transactionId: paymentResult.transactionId 
      });

      return paymentResult;
    } catch (error) {
      this.logger.error('Payment creation failed', { error, paymentData });
      throw error;
    }
  }

  async processClickPayment(payment: any, paymentData: PaymentData): Promise<PaymentResult> {
    try {
      // Click payment processing logic
      const transactionId = `click_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const paymentUrl = `${process.env.CLICK_PAYMENT_URL || 'https://click.uz'}/payment?transaction_id=${transactionId}`;

      return {
        success: true,
        transactionId,
        paymentUrl,
        status: 'pending',
        message: 'Click payment initiated successfully',
        amount: paymentData.amount,
        currency: paymentData.currency,
      };
    } catch (error) {
      this.logger.error('Click payment processing failed', { error });
      throw error;
    }
  }

  async processPaymePayment(payment: any, paymentData: PaymentData): Promise<PaymentResult> {
    try {
      // Payme payment processing logic
      const transactionId = `payme_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const paymentUrl = `${process.env.PAYME_PAYMENT_URL || 'https://payme.uz'}/payment?transaction_id=${transactionId}`;

      return {
        success: true,
        transactionId,
        paymentUrl,
        status: 'pending',
        message: 'Payme payment initiated successfully',
        amount: paymentData.amount,
        currency: paymentData.currency,
      };
    } catch (error) {
      this.logger.error('Payme payment processing failed', { error });
      throw error;
    }
  }

  async processUzcardPayment(payment: any, paymentData: PaymentData): Promise<PaymentResult> {
    try {
      // Uzcard payment processing logic
      const transactionId = `uzcard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const paymentUrl = `${process.env.UZCARD_PAYMENT_URL || 'https://uzcard.uz'}/payment?transaction_id=${transactionId}`;

      return {
        success: true,
        transactionId,
        paymentUrl,
        status: 'pending',
        message: 'Uzcard payment initiated successfully',
        amount: paymentData.amount,
        currency: paymentData.currency,
      };
    } catch (error) {
      this.logger.error('Uzcard payment processing failed', { error });
      throw error;
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    try {
      const payment = await prisma.payment.findFirst({
        where: { transactionId },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      return {
        transactionId: payment.transactionId || '',
        status: payment.status as 'pending' | 'success' | 'failed',
        amount: payment.amount,
        currency: payment.currency,
        timestamp: payment.createdAt,
        paymentMethod: payment.paymentMethod,
      };
    } catch (error) {
      this.logger.error('Failed to get payment status', { error, transactionId });
      throw error;
    }
  }

  async processRefund(refundData: RefundData): Promise<RefundResult> {
    try {
      this.logger.info('Processing refund', { refundData });

      // Validate refund data
      if (!refundData.transactionId || !refundData.amount || !refundData.reason) {
        throw new Error('Invalid refund data');
      }

      // Check if payment exists and can be refunded
      const payment = await prisma.payment.findFirst({
        where: { transactionId: refundData.transactionId },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'success') {
        throw new Error('Payment cannot be refunded');
      }

      if (refundData.amount > payment.amount) {
        throw new Error('Refund amount cannot exceed payment amount');
      }

      // Create refund record
      const refund = await prisma.refund.create({
        data: {
          paymentId: payment.id,
          amount: refundData.amount,
          reason: refundData.reason,
          status: 'pending',
          userId: refundData.userId,
        },
      });

      // Process refund based on payment method
      let refundResult: RefundResult;

      switch (payment.paymentMethod) {
        case 'click':
          refundResult = await this.processClickRefund(refund, payment);
          break;
        case 'payme':
          refundResult = await this.processPaymeRefund(refund, payment);
          break;
        case 'uzcard':
          refundResult = await this.processUzcardRefund(refund, payment);
          break;
        default:
          throw new Error(`Unsupported payment method for refund: ${payment.paymentMethod}`);
      }

      // Update refund record
      await prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: refundResult.status,
          refundId: refundResult.refundId,
        },
      });

      this.logger.info('Refund processed successfully', { 
        refundId: refund.id, 
        transactionId: refundData.transactionId 
      });

      return refundResult;
    } catch (error) {
      this.logger.error('Refund processing failed', { error, refundData });
      throw error;
    }
  }

  async processClickRefund(refund: any, payment: any): Promise<RefundResult> {
    try {
      // Click refund processing logic
      const refundId = `click_refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        success: true,
        refundId,
        amount: refund.amount,
        currency: payment.currency,
        status: 'completed',
        message: 'Click refund processed successfully',
      };
    } catch (error) {
      this.logger.error('Click refund processing failed', { error });
      throw error;
    }
  }

  async processPaymeRefund(refund: any, payment: any): Promise<RefundResult> {
    try {
      // Payme refund processing logic
      const refundId = `payme_refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        success: true,
        refundId,
        amount: refund.amount,
        currency: payment.currency,
        status: 'completed',
        message: 'Payme refund processed successfully',
      };
    } catch (error) {
      this.logger.error('Payme refund processing failed', { error });
      throw error;
    }
  }

  async processUzcardRefund(refund: any, payment: any): Promise<RefundResult> {
    try {
      // Uzcard refund processing logic
      const refundId = `uzcard_refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        success: true,
        refundId,
        amount: refund.amount,
        currency: payment.currency,
        status: 'completed',
        message: 'Uzcard refund processed successfully',
      };
    } catch (error) {
      this.logger.error('Uzcard refund processing failed', { error });
      throw error;
    }
  }

  async getPaymentHistory(userId: string, options: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<{
    payments: PaymentStatus[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        status = 'all',
        startDate,
        endDate,
      } = options;

      const where: any = { userId };

      if (status !== 'all') {
        where.status = status;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.payment.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        payments: payments.map((payment) => ({
          transactionId: payment.transactionId || '',
          status: payment.status as 'pending' | 'success' | 'failed',
          amount: payment.amount,
          currency: payment.currency,
          timestamp: payment.createdAt,
          paymentMethod: payment.paymentMethod,
        })),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error('Failed to get payment history', { error, userId });
      throw error;
    }
  }
}
