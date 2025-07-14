import { Request, Response, NextFunction } from 'express';
import { ClickService } from '../services/click.service';
import { PaymeService } from '../services/payme.service';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class PaymentController {
  private clickService: ClickService;
  private paymeService: PaymeService;

  constructor() {
    this.clickService = new ClickService();
    this.paymeService = new PaymeService();
  }

  /**
   * Create a new payment
   */
  createPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { orderId, amount, provider, description, returnUrl, cancelUrl } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      // Generate merchant transaction ID
      const merchantTransId = `${orderId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      let result;
      switch (provider) {
        case 'CLICK':
          result = await this.clickService.createPayment({
            orderId,
            amount,
            userId,
            description: description || `Payment for order ${orderId}`,
            returnUrl,
            cancelUrl: cancelUrl || returnUrl,
            merchantTransId,
          });
          break;

        case 'PAYME':
          result = await this.paymeService.createPayment({
            orderId,
            amount,
            userId,
            description: description || `Payment for order ${orderId}`,
            returnUrl,
            cancelUrl: cancelUrl || returnUrl,
            merchantTransId,
          });
          break;

        case 'UZCARD':
        case 'HUMO':
          // TODO: Implement Uzcard/Humo payment
          result = {
            success: false,
            error: 'Uzcard/Humo payment not yet implemented',
          };
          break;

        case 'APELSIN':
          // TODO: Implement Apelsin payment
          result = {
            success: false,
            error: 'Apelsin payment not yet implemented',
          };
          break;

        case 'BANK_TRANSFER':
          // TODO: Implement bank transfer
          result = {
            success: false,
            error: 'Bank transfer not yet implemented',
          };
          break;

        case 'CASH_ON_DELIVERY':
          // Create payment record for COD
          const payment = await prisma.payment.create({
            data: {
              orderId,
              userId,
              amount,
              currency: 'UZS',
              provider: PaymentProvider.CASH_ON_DELIVERY,
              status: PaymentStatus.PENDING,
              merchantTransId,
              metadata: {
                description: description || `Cash on delivery for order ${orderId}`,
              },
            },
          });

          result = {
            success: true,
            paymentUrl: null,
            transactionId: payment.id,
          };
          break;

        default:
          result = {
            success: false,
            error: 'Invalid payment provider',
          };
      }

      if (result.success) {
        res.status(201).json({
          success: true,
          data: {
            paymentUrl: result.paymentUrl,
            transactionId: result.transactionId,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      logger.error('Failed to create payment', error);
      next(error);
    }
  };

  /**
   * Get payment details
   */
  getPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentId } = req.params;
      const userId = req.user?.id;

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          transactions: true,
          refunds: true,
        },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found',
        });
      }

      // Check if user has permission to view this payment
      if (payment.userId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      logger.error('Failed to get payment', error);
      next(error);
    }
  };

  /**
   * Get payment by order ID
   */
  getPaymentByOrderId = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;

      const payment = await prisma.payment.findUnique({
        where: { orderId },
        include: {
          transactions: true,
          refunds: true,
        },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found',
        });
      }

      // Check if user has permission to view this payment
      if (payment.userId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      logger.error('Failed to get payment by order ID', error);
      next(error);
    }
  };

  /**
   * Cancel a payment
   */
  cancelPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentId } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id;

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found',
        });
      }

      // Check if user has permission
      if (payment.userId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      // Check if payment can be cancelled
      if (payment.status !== PaymentStatus.PENDING && payment.status !== PaymentStatus.PROCESSING) {
        return res.status(400).json({
          success: false,
          error: 'Payment cannot be cancelled',
        });
      }

      // Update payment status
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.CANCELLED,
          cancelledAt: new Date(),
          metadata: {
            ...payment.metadata as object,
            cancelReason: reason,
            cancelledBy: userId,
          },
        },
      });

      res.json({
        success: true,
        message: 'Payment cancelled successfully',
      });
    } catch (error) {
      logger.error('Failed to cancel payment', error);
      next(error);
    }
  };

  /**
   * Refund a payment
   */
  refundPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentId } = req.params;
      const { amount, reason } = req.body;
      const userId = req.user?.id;

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { refunds: true },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found',
        });
      }

      // Check if user has permission
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only administrators can process refunds',
        });
      }

      // Check if payment can be refunded
      if (payment.status !== PaymentStatus.COMPLETED) {
        return res.status(400).json({
          success: false,
          error: 'Only completed payments can be refunded',
        });
      }

      // Calculate total refunded amount
      const totalRefunded = payment.refunds.reduce((sum, refund) => sum + refund.amount, 0);
      const refundAmount = amount || payment.amount;

      if (totalRefunded + refundAmount > payment.amount) {
        return res.status(400).json({
          success: false,
          error: 'Refund amount exceeds payment amount',
        });
      }

      // Create refund record
      const refund = await prisma.refund.create({
        data: {
          paymentId,
          orderId: payment.orderId,
          amount: refundAmount,
          currency: payment.currency,
          provider: payment.provider,
          reason: reason || 'Refund requested',
          status: 'PENDING',
        },
      });

      // TODO: Process refund with payment provider

      // Update payment status if fully refunded
      if (totalRefunded + refundAmount === payment.amount) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.REFUNDED,
          },
        });
      }

      res.json({
        success: true,
        data: refund,
      });
    } catch (error) {
      logger.error('Failed to refund payment', error);
      next(error);
    }
  };

  /**
   * Get user payment history
   */
  getUserPaymentHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 10, status } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const skip = (Number(page) - 1) * Number(limit);
      const where: any = { userId };

      if (status) {
        where.status = status as PaymentStatus;
      }

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            transactions: true,
            refunds: true,
          },
        }),
        prisma.payment.count({ where }),
      ]);

      res.json({
        success: true,
        data: payments,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      logger.error('Failed to get user payment history', error);
      next(error);
    }
  };

  /**
   * Get available payment methods
   */
  getAvailablePaymentMethods = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const methods = [
        {
          id: 'click',
          name: 'Click',
          description: 'Fast and secure payment with Click',
          provider: PaymentProvider.CLICK,
          icon: '/images/payment/click.png',
          minAmount: 1000,
          maxAmount: 100000000,
          fee: 1, // 1%
          enabled: true,
        },
        {
          id: 'payme',
          name: 'Payme',
          description: 'Pay with Payme mobile wallet',
          provider: PaymentProvider.PAYME,
          icon: '/images/payment/payme.png',
          minAmount: 1000,
          maxAmount: 100000000,
          fee: 1.5, // 1.5%
          enabled: true,
        },
        {
          id: 'uzcard',
          name: 'Uzcard',
          description: 'Pay with Uzcard bank card',
          provider: PaymentProvider.UZCARD,
          icon: '/images/payment/uzcard.png',
          minAmount: 5000,
          maxAmount: 50000000,
          fee: 1.2, // 1.2%
          enabled: false, // TODO: Enable when implemented
        },
        {
          id: 'humo',
          name: 'Humo',
          description: 'Pay with Humo bank card',
          provider: PaymentProvider.HUMO,
          icon: '/images/payment/humo.png',
          minAmount: 5000,
          maxAmount: 50000000,
          fee: 1.2, // 1.2%
          enabled: false, // TODO: Enable when implemented
        },
        {
          id: 'apelsin',
          name: 'Apelsin',
          description: 'Pay with Apelsin installments',
          provider: PaymentProvider.APELSIN,
          icon: '/images/payment/apelsin.png',
          minAmount: 100000,
          maxAmount: 10000000,
          fee: 0, // No fee for customer
          enabled: false, // TODO: Enable when implemented
        },
        {
          id: 'bank_transfer',
          name: 'Bank Transfer',
          description: 'Direct bank transfer',
          provider: PaymentProvider.BANK_TRANSFER,
          icon: '/images/payment/bank.png',
          minAmount: 50000,
          maxAmount: 1000000000,
          fee: 0,
          enabled: false, // TODO: Enable when implemented
        },
        {
          id: 'cod',
          name: 'Cash on Delivery',
          description: 'Pay when you receive your order',
          provider: PaymentProvider.CASH_ON_DELIVERY,
          icon: '/images/payment/cash.png',
          minAmount: 10000,
          maxAmount: 5000000,
          fee: 0,
          enabled: true,
        },
      ];

      res.json({
        success: true,
        data: methods.filter(m => m.enabled),
      });
    } catch (error) {
      logger.error('Failed to get available payment methods', error);
      next(error);
    }
  };

  // ============================================
  // CLICK PAYMENT METHODS
  // ============================================

  /**
   * Create Click payment
   */
  createClickPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { orderId, amount, description, returnUrl } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const merchantTransId = `${orderId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const result = await this.clickService.createPayment({
        orderId,
        amount,
        userId,
        description: description || `Payment for order ${orderId}`,
        returnUrl,
        cancelUrl: returnUrl,
        merchantTransId,
      });

      if (result.success) {
        res.status(201).json({
          success: true,
          data: {
            paymentUrl: result.paymentUrl,
            transactionId: result.transactionId,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      logger.error('Failed to create Click payment', error);
      next(error);
    }
  };

  /**
   * Handle Click webhook
   */
  handleClickWebhook = async (req: Request, res: Response) => {
    try {
      const payload = req.body;
      logger.info('Received Click webhook', { payload });

      // Determine action type
      if (payload.action === 0) {
        // PREPARE
        const result = await this.clickService.handlePrepare(payload);
        res.json(result);
      } else if (payload.action === 1) {
        // COMPLETE
        const result = await this.clickService.handleComplete(payload);
        res.json(result);
      } else {
        res.json({
          error: -3,
          error_note: 'Invalid action',
        });
      }
    } catch (error) {
      logger.error('Click webhook error', error);
      res.json({
        error: -1,
        error_note: 'Internal error',
      });
    }
  };

  /**
   * Get Click payment status
   */
  getClickPaymentStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { transactionId } = req.params;

      const result = await this.clickService.getPaymentStatus(transactionId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Failed to get Click payment status', error);
      next(error);
    }
  };

  // ============================================
  // PAYME PAYMENT METHODS
  // ============================================

  /**
   * Create Payme payment
   */
  createPaymePayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { orderId, amount, description, returnUrl } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const merchantTransId = `${orderId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const result = await this.paymeService.createPayment({
        orderId,
        amount,
        userId,
        description: description || `Payment for order ${orderId}`,
        returnUrl,
        cancelUrl: returnUrl,
        merchantTransId,
      });

      if (result.success) {
        res.status(201).json({
          success: true,
          data: {
            paymentUrl: result.paymentUrl,
            transactionId: result.transactionId,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      logger.error('Failed to create Payme payment', error);
      next(error);
    }
  };

  /**
   * Handle Payme webhook
   */
  handlePaymeWebhook = async (req: Request, res: Response) => {
    try {
      const { method, params, id } = req.body;
      logger.info('Received Payme webhook', { method, params, id });

      let result;
      switch (method) {
        case 'CheckPerformTransaction':
          result = await this.paymeService.checkPerformTransaction({ method, params, id });
          break;

        case 'CreateTransaction':
          result = await this.paymeService.createTransaction({ method, params, id });
          break;

        case 'PerformTransaction':
          result = await this.paymeService.performTransaction({ method, params, id });
          break;

        case 'CancelTransaction':
          result = await this.paymeService.cancelTransaction({ method, params, id });
          break;

        case 'CheckTransaction':
          result = await this.paymeService.checkTransaction({ method, params, id });
          break;

        default:
          result = {
            error: {
              code: -32601,
              message: 'Method not found',
            },
          };
      }

      res.json({
        jsonrpc: '2.0',
        id,
        result,
      });
    } catch (error) {
      logger.error('Payme webhook error', error);
      res.json({
        jsonrpc: '2.0',
        id: req.body.id,
        error: {
          code: -32603,
          message: 'Internal error',
        },
      });
    }
  };

  // ============================================
  // OTHER PAYMENT METHODS (To be implemented)
  // ============================================

  createCardPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    res.status(501).json({
      success: false,
      error: 'Card payment not yet implemented',
    });
  };

  verifyCardPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    res.status(501).json({
      success: false,
      error: 'Card payment verification not yet implemented',
    });
  };

  createBankTransfer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    res.status(501).json({
      success: false,
      error: 'Bank transfer not yet implemented',
    });
  };

  createApelsinPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    res.status(501).json({
      success: false,
      error: 'Apelsin payment not yet implemented',
    });
  };

  createCashOnDelivery = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { orderId, amount, deliveryAddress, contactPhone } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const merchantTransId = `COD_${orderId}_${Date.now()}`;

      const payment = await prisma.payment.create({
        data: {
          orderId,
          userId,
          amount,
          currency: 'UZS',
          provider: PaymentProvider.CASH_ON_DELIVERY,
          status: PaymentStatus.PENDING,
          merchantTransId,
          metadata: {
            deliveryAddress,
            contactPhone,
            paymentMethod: 'CASH_ON_DELIVERY',
          },
        },
      });

      res.status(201).json({
        success: true,
        data: {
          paymentId: payment.id,
          orderId,
          amount,
          status: payment.status,
          message: 'Cash on delivery order created. Payment will be collected upon delivery.',
        },
      });
    } catch (error) {
      logger.error('Failed to create cash on delivery order', error);
      next(error);
    }
  };

  // ============================================
  // PAYMENT METHODS MANAGEMENT
  // ============================================

  getSavedPaymentMethods = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const methods = await prisma.paymentMethod.findMany({
        where: { userId },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      res.json({
        success: true,
        data: methods,
      });
    } catch (error) {
      logger.error('Failed to get saved payment methods', error);
      next(error);
    }
  };

  savePaymentMethod = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { provider, token, lastFour, cardType, expiryMonth, expiryYear } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      // Check if this is the first payment method
      const existingMethods = await prisma.paymentMethod.count({
        where: { userId },
      });

      const paymentMethod = await prisma.paymentMethod.create({
        data: {
          userId,
          provider,
          token,
          lastFour,
          cardType,
          expiryMonth,
          expiryYear,
          isDefault: existingMethods === 0, // Set as default if it's the first method
        },
      });

      res.status(201).json({
        success: true,
        data: paymentMethod,
      });
    } catch (error) {
      logger.error('Failed to save payment method', error);
      next(error);
    }
  };

  deletePaymentMethod = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { methodId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const method = await prisma.paymentMethod.findUnique({
        where: { id: methodId },
      });

      if (!method || method.userId !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Payment method not found',
        });
      }

      await prisma.paymentMethod.delete({
        where: { id: methodId },
      });

      // If this was the default method, set another as default
      if (method.isDefault) {
        const nextMethod = await prisma.paymentMethod.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        if (nextMethod) {
          await prisma.paymentMethod.update({
            where: { id: nextMethod.id },
            data: { isDefault: true },
          });
        }
      }

      res.json({
        success: true,
        message: 'Payment method deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete payment method', error);
      next(error);
    }
  };

  setDefaultPaymentMethod = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { methodId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const method = await prisma.paymentMethod.findUnique({
        where: { id: methodId },
      });

      if (!method || method.userId !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Payment method not found',
        });
      }

      // Unset current default
      await prisma.paymentMethod.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: { isDefault: false },
      });

      // Set new default
      await prisma.paymentMethod.update({
        where: { id: methodId },
        data: { isDefault: true },
      });

      res.json({
        success: true,
        message: 'Default payment method updated',
      });
    } catch (error) {
      logger.error('Failed to set default payment method', error);
      next(error);
    }
  };

  // ============================================
  // ADMIN METHODS
  // ============================================

  getAllPayments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 20, status, provider, startDate, endDate } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const where: any = {};

      if (status) where.status = status as PaymentStatus;
      if (provider) where.provider = provider as PaymentProvider;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            transactions: true,
            refunds: true,
          },
        }),
        prisma.payment.count({ where }),
      ]);

      res.json({
        success: true,
        data: payments,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      logger.error('Failed to get all payments', error);
      next(error);
    }
  };

  getPaymentStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate } = req.query;

      const where: any = {};
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      const [
        totalPayments,
        completedPayments,
        pendingPayments,
        failedPayments,
        totalAmount,
        providerStats,
      ] = await Promise.all([
        prisma.payment.count({ where }),
        prisma.payment.count({ where: { ...where, status: PaymentStatus.COMPLETED } }),
        prisma.payment.count({ where: { ...where, status: PaymentStatus.PENDING } }),
        prisma.payment.count({ where: { ...where, status: PaymentStatus.FAILED } }),
        prisma.payment.aggregate({
          where: { ...where, status: PaymentStatus.COMPLETED },
          _sum: { amount: true },
        }),
        prisma.payment.groupBy({
          by: ['provider'],
          where,
          _count: { _all: true },
          _sum: { amount: true },
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalPayments,
          completedPayments,
          pendingPayments,
          failedPayments,
          totalAmount: totalAmount._sum.amount || 0,
          providerStats: providerStats.map(stat => ({
            provider: stat.provider,
            count: stat._count._all,
            totalAmount: stat._sum.amount || 0,
          })),
        },
      });
    } catch (error) {
      logger.error('Failed to get payment stats', error);
      next(error);
    }
  };

  manuallyVerifyPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentId } = req.params;
      const { notes } = req.body;
      const adminId = req.user?.id;

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found',
        });
      }

      if (payment.status === PaymentStatus.COMPLETED) {
        return res.status(400).json({
          success: false,
          error: 'Payment already completed',
        });
      }

      // Update payment status
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.COMPLETED,
          completedAt: new Date(),
          metadata: {
            ...payment.metadata as object,
            manuallyVerified: true,
            verifiedBy: adminId,
            verificationNotes: notes,
            verifiedAt: new Date(),
          },
        },
      });

      // Update order status
      await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          status: 'PAYMENT_CONFIRMED',
          paidAmount: payment.amount,
          paidAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Payment manually verified successfully',
      });
    } catch (error) {
      logger.error('Failed to manually verify payment', error);
      next(error);
    }
  };
}
