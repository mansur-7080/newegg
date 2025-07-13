import { Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { redis } from '../config/redis';

interface PaymeRequest {
  id: number;
  method: string;
  params: any;
}

interface PaymeResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: {
      uz: string;
      ru: string;
      en: string;
    };
    data?: any;
  };
}

export class PaymeService {
  private merchantId: string;
  private secretKey: string;
  private testMode: boolean;

  constructor() {
    this.merchantId = process.env.PAYME_MERCHANT_ID || '';
    this.secretKey = process.env.PAYME_SECRET_KEY || '';
    this.testMode = process.env.NODE_ENV !== 'production';
  }

  /**
   * Main handler for Payme API requests
   */
  async handlePaymeRequest(req: Request, res: Response) {
    try {
      const paymeRequest: PaymeRequest = req.body;
      
      // Validate authentication
      if (!this.validateAuth(req)) {
        return this.sendError(res, paymeRequest.id, -32504, 'Insufficient privileges');
      }

      // Route to appropriate method handler
      let response: PaymeResponse;
      
      switch (paymeRequest.method) {
        case 'CheckPerformTransaction':
          response = await this.checkPerformTransaction(paymeRequest);
          break;
        case 'CreateTransaction':
          response = await this.createTransaction(paymeRequest);
          break;
        case 'PerformTransaction':
          response = await this.performTransaction(paymeRequest);
          break;
        case 'CancelTransaction':
          response = await this.cancelTransaction(paymeRequest);
          break;
        case 'CheckTransaction':
          response = await this.checkTransaction(paymeRequest);
          break;
        case 'GetStatement':
          response = await this.getStatement(paymeRequest);
          break;
        default:
          response = this.createErrorResponse(paymeRequest.id, -32601, 'Method not found');
      }

      res.json(response);
    } catch (error) {
      logger.error('Payme request error:', error);
      this.sendError(res, req.body.id, -32400, 'Internal error');
    }
  }

  /**
   * Validate Basic Auth
   */
  private validateAuth(req: Request): boolean {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return false;
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    return username === 'Paycom' && password === this.secretKey;
  }

  /**
   * Check if transaction can be performed
   */
  private async checkPerformTransaction(request: PaymeRequest): Promise<PaymeResponse> {
    try {
      const { amount, account } = request.params;
      
      // Validate order exists and amount is correct
      const order = await prisma.order.findUnique({
        where: { id: account.order_id }
      });

      if (!order) {
        return this.createErrorResponse(request.id, -31050, 'Order not found');
      }

      if (order.status !== 'PENDING') {
        return this.createErrorResponse(request.id, -31051, 'Order already processed');
      }

      if (order.totalAmount * 100 !== amount) { // Payme uses tiyin (1/100 sum)
        return this.createErrorResponse(request.id, -31001, 'Invalid amount');
      }

      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          allow: true,
          detail: {
            receipt_type: 0,
            items: [
              {
                title: `Order #${order.orderNumber}`,
                price: amount,
                count: 1,
                code: order.id,
                vat_percent: 0
              }
            ]
          }
        }
      };
    } catch (error) {
      logger.error('CheckPerformTransaction error:', error);
      return this.createErrorResponse(request.id, -32400, 'Internal error');
    }
  }

  /**
   * Create new transaction
   */
  private async createTransaction(request: PaymeRequest): Promise<PaymeResponse> {
    try {
      const { id, time, amount, account } = request.params;

      // Check if transaction already exists
      let transaction = await prisma.paymentTransaction.findUnique({
        where: { paymeTransactionId: id }
      });

      if (transaction) {
        if (transaction.status !== 'PENDING') {
          return this.createErrorResponse(request.id, -31008, 'Transaction already exists');
        }

        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            create_time: transaction.createdAt.getTime(),
            transaction: transaction.id,
            state: 1
          }
        };
      }

      // Verify order
      const order = await prisma.order.findUnique({
        where: { id: account.order_id }
      });

      if (!order) {
        return this.createErrorResponse(request.id, -31050, 'Order not found');
      }

      if (order.totalAmount * 100 !== amount) {
        return this.createErrorResponse(request.id, -31001, 'Invalid amount');
      }

      // Create transaction
      transaction = await prisma.paymentTransaction.create({
        data: {
          orderId: order.id,
          paymeTransactionId: id,
          amount: amount / 100, // Convert from tiyin to sum
          status: 'PENDING',
          paymentMethod: 'PAYME',
          metadata: {
            time,
            account
          }
        }
      });

      // Set timeout for transaction (12 hours)
      await redis.setex(`payme:transaction:${id}`, 43200, JSON.stringify({
        transactionId: transaction.id,
        timeout: Date.now() + 43200000
      }));

      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          create_time: transaction.createdAt.getTime(),
          transaction: transaction.id,
          state: 1
        }
      };
    } catch (error) {
      logger.error('CreateTransaction error:', error);
      return this.createErrorResponse(request.id, -32400, 'Internal error');
    }
  }

  /**
   * Perform transaction (complete payment)
   */
  private async performTransaction(request: PaymeRequest): Promise<PaymeResponse> {
    try {
      const { id } = request.params;

      const transaction = await prisma.paymentTransaction.findUnique({
        where: { paymeTransactionId: id },
        include: { order: true }
      });

      if (!transaction) {
        return this.createErrorResponse(request.id, -31003, 'Transaction not found');
      }

      if (transaction.status === 'COMPLETED') {
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            transaction: transaction.id,
            perform_time: transaction.completedAt?.getTime() || Date.now(),
            state: 2
          }
        };
      }

      if (transaction.status !== 'PENDING') {
        return this.createErrorResponse(request.id, -31008, 'Invalid transaction state');
      }

      // Check timeout
      const timeoutData = await redis.get(`payme:transaction:${id}`);
      if (timeoutData) {
        const { timeout } = JSON.parse(timeoutData);
        if (Date.now() > timeout) {
          await this.cancelTransactionInternal(transaction.id, 'TIMEOUT');
          return this.createErrorResponse(request.id, -31008, 'Transaction timeout');
        }
      }

      // Complete transaction
      const completedAt = new Date();
      await prisma.$transaction(async (tx) => {
        // Update transaction
        await tx.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'COMPLETED',
            completedAt
          }
        });

        // Update order status
        await tx.order.update({
          where: { id: transaction.orderId },
          data: {
            status: 'PAID',
            paymentStatus: 'PAID',
            paidAt: completedAt
          }
        });

        // Create order status history
        await tx.orderStatusHistory.create({
          data: {
            orderId: transaction.orderId,
            status: 'PAID',
            comment: 'Payment completed via Payme'
          }
        });
      });

      // Clear timeout
      await redis.del(`payme:transaction:${id}`);

      // Send notifications
      await this.sendPaymentNotifications(transaction.order);

      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          transaction: transaction.id,
          perform_time: completedAt.getTime(),
          state: 2
        }
      };
    } catch (error) {
      logger.error('PerformTransaction error:', error);
      return this.createErrorResponse(request.id, -32400, 'Internal error');
    }
  }

  /**
   * Cancel transaction
   */
  private async cancelTransaction(request: PaymeRequest): Promise<PaymeResponse> {
    try {
      const { id, reason } = request.params;

      const transaction = await prisma.paymentTransaction.findUnique({
        where: { paymeTransactionId: id }
      });

      if (!transaction) {
        return this.createErrorResponse(request.id, -31003, 'Transaction not found');
      }

      if (transaction.status === 'CANCELLED') {
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            transaction: transaction.id,
            cancel_time: transaction.cancelledAt?.getTime() || Date.now(),
            state: -1
          }
        };
      }

      const cancelReason = this.getCancelReason(reason);
      await this.cancelTransactionInternal(transaction.id, cancelReason);

      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          transaction: transaction.id,
          cancel_time: Date.now(),
          state: -1
        }
      };
    } catch (error) {
      logger.error('CancelTransaction error:', error);
      return this.createErrorResponse(request.id, -32400, 'Internal error');
    }
  }

  /**
   * Check transaction status
   */
  private async checkTransaction(request: PaymeRequest): Promise<PaymeResponse> {
    try {
      const { id } = request.params;

      const transaction = await prisma.paymentTransaction.findUnique({
        where: { paymeTransactionId: id }
      });

      if (!transaction) {
        return this.createErrorResponse(request.id, -31003, 'Transaction not found');
      }

      let state = 0;
      if (transaction.status === 'PENDING') state = 1;
      else if (transaction.status === 'COMPLETED') state = 2;
      else if (transaction.status === 'CANCELLED') state = -1;

      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          create_time: transaction.createdAt.getTime(),
          perform_time: transaction.completedAt?.getTime() || 0,
          cancel_time: transaction.cancelledAt?.getTime() || 0,
          transaction: transaction.id,
          state,
          reason: transaction.cancelReason || null
        }
      };
    } catch (error) {
      logger.error('CheckTransaction error:', error);
      return this.createErrorResponse(request.id, -32400, 'Internal error');
    }
  }

  /**
   * Get transactions statement
   */
  private async getStatement(request: PaymeRequest): Promise<PaymeResponse> {
    try {
      const { from, to } = request.params;

      const transactions = await prisma.paymentTransaction.findMany({
        where: {
          paymentMethod: 'PAYME',
          createdAt: {
            gte: new Date(from),
            lte: new Date(to)
          }
        },
        include: {
          order: true
        }
      });

      const result = transactions.map(tx => {
        let state = 0;
        if (tx.status === 'PENDING') state = 1;
        else if (tx.status === 'COMPLETED') state = 2;
        else if (tx.status === 'CANCELLED') state = -1;

        return {
          id: tx.paymeTransactionId,
          time: tx.createdAt.getTime(),
          amount: tx.amount * 100,
          account: {
            order_id: tx.orderId
          },
          create_time: tx.createdAt.getTime(),
          perform_time: tx.completedAt?.getTime() || 0,
          cancel_time: tx.cancelledAt?.getTime() || 0,
          transaction: tx.id,
          state,
          reason: tx.cancelReason || null,
          receivers: null
        };
      });

      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          transactions: result
        }
      };
    } catch (error) {
      logger.error('GetStatement error:', error);
      return this.createErrorResponse(request.id, -32400, 'Internal error');
    }
  }

  /**
   * Internal method to cancel transaction
   */
  private async cancelTransactionInternal(transactionId: string, reason: string) {
    const cancelledAt = new Date();
    
    await prisma.$transaction(async (tx) => {
      // Update transaction
      await tx.paymentTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'CANCELLED',
          cancelledAt,
          cancelReason: reason
        }
      });

      // Update order if needed
      const transaction = await tx.paymentTransaction.findUnique({
        where: { id: transactionId },
        include: { order: true }
      });

      if (transaction && transaction.order.status === 'PAID') {
        await tx.order.update({
          where: { id: transaction.orderId },
          data: {
            status: 'CANCELLED',
            paymentStatus: 'REFUNDED'
          }
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: transaction.orderId,
            status: 'CANCELLED',
            comment: `Payment cancelled: ${reason}`
          }
        });
      }
    });

    // Clear timeout
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId }
    });
    if (transaction) {
      await redis.del(`payme:transaction:${transaction.paymeTransactionId}`);
    }
  }

  /**
   * Send payment notifications
   */
  private async sendPaymentNotifications(order: any) {
    try {
      // Send email notification
      await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/api/notifications/email`, {
        to: order.customerEmail,
        subject: 'Payment Confirmed',
        template: 'payment-success',
        data: {
          orderNumber: order.orderNumber,
          amount: order.totalAmount,
          paymentMethod: 'Payme'
        }
      });

      // Send SMS notification
      if (order.customerPhone) {
        await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/api/notifications/sms`, {
          to: order.customerPhone,
          message: `Buyurtma #${order.orderNumber} uchun to'lov qabul qilindi. Summa: ${order.totalAmount} so'm`
        });
      }
    } catch (error) {
      logger.error('Failed to send payment notifications:', error);
    }
  }

  /**
   * Map cancel reason codes
   */
  private getCancelReason(code: number): string {
    const reasons: { [key: number]: string } = {
      1: 'TIMEOUT',
      2: 'CUSTOMER_CANCELLED',
      3: 'FRAUD',
      4: 'INSUFFICIENT_FUNDS',
      5: 'UNKNOWN'
    };
    return reasons[code] || 'UNKNOWN';
  }

  /**
   * Create error response
   */
  private createErrorResponse(id: number, code: number, message: string): PaymeResponse {
    const messages: { [key: string]: { uz: string; ru: string; en: string } } = {
      'Invalid amount': {
        uz: "Noto'g'ri summa",
        ru: 'Неверная сумма',
        en: 'Invalid amount'
      },
      'Order not found': {
        uz: 'Buyurtma topilmadi',
        ru: 'Заказ не найден',
        en: 'Order not found'
      },
      'Transaction not found': {
        uz: 'Tranzaksiya topilmadi',
        ru: 'Транзакция не найдена',
        en: 'Transaction not found'
      },
      'Method not found': {
        uz: 'Metod topilmadi',
        ru: 'Метод не найден',
        en: 'Method not found'
      },
      'Insufficient privileges': {
        uz: 'Ruxsat etilmagan',
        ru: 'Недостаточно прав',
        en: 'Insufficient privileges'
      },
      'Internal error': {
        uz: 'Ichki xatolik',
        ru: 'Внутренняя ошибка',
        en: 'Internal error'
      }
    };

    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message: messages[message] || {
          uz: message,
          ru: message,
          en: message
        }
      }
    };
  }

  /**
   * Send error response
   */
  private sendError(res: Response, id: number, code: number, message: string) {
    res.json(this.createErrorResponse(id, code, message));
  }
}

export const paymeService = new PaymeService();
