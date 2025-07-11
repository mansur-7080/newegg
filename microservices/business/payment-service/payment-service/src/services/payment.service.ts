import Stripe from 'stripe';
import { PaymentMethod, PaymentStatus, Currency } from '../types/payment.types';
import { logger, createError } from '@ultramarket/shared';
import { PaymentModel } from '../models/Payment';
import { EventEmitter } from 'events';

export interface PaymentRequest {
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  orderId: string;
  userId: string;
  description?: string;
  metadata?: Record<string, any>;
  customer?: {
    email: string;
    name: string;
    phone?: string;
  };
  billing?: {
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface PaymentResponse {
  id: string;
  status: PaymentStatus;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  transactionId?: string;
  clientSecret?: string;
  redirectUrl?: string;
  metadata?: Record<string, any>;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number;
  reason?: string;
  metadata?: Record<string, any>;
}

export class PaymentService extends EventEmitter {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor() {
    super();
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
    });
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  }

  /**
   * Process a payment
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      logger.info('Processing payment', { orderId: request.orderId, amount: request.amount });

      // Create payment record
      const payment = await PaymentModel.create({
        orderId: request.orderId,
        userId: request.userId,
        amount: request.amount,
        currency: request.currency,
        method: request.method,
        status: PaymentStatus.PENDING,
        description: request.description,
        metadata: request.metadata,
      });

      let response: PaymentResponse;

      switch (request.method) {
        case PaymentMethod.CREDIT_CARD:
        case PaymentMethod.DEBIT_CARD:
          response = await this.processCardPayment(payment.id, request);
          break;

        case PaymentMethod.PAYPAL:
          response = await this.processPayPalPayment(payment.id, request);
          break;

        case PaymentMethod.APPLE_PAY:
          response = await this.processApplePayPayment(payment.id, request);
          break;

        case PaymentMethod.GOOGLE_PAY:
          response = await this.processGooglePayPayment(payment.id, request);
          break;

        case PaymentMethod.BANK_TRANSFER:
          response = await this.processBankTransfer(payment.id, request);
          break;

        case PaymentMethod.CRYPTO:
          response = await this.processCryptoPayment(payment.id, request);
          break;

        default:
          throw createError(400, `Unsupported payment method: ${request.method}`);
      }

      // Update payment record
      await PaymentModel.findByIdAndUpdate(payment.id, {
        status: response.status,
        transactionId: response.transactionId,
        processedAt: response.status === PaymentStatus.COMPLETED ? new Date() : undefined,
      });

      // Emit payment event
      this.emit('payment.processed', {
        paymentId: payment.id,
        orderId: request.orderId,
        status: response.status,
        amount: request.amount,
        currency: request.currency,
      });

      return response;
    } catch (error) {
      logger.error('Payment processing failed', error);
      throw error;
    }
  }

  /**
   * Process card payment using Stripe
   */
  private async processCardPayment(
    paymentId: string,
    request: PaymentRequest
  ): Promise<PaymentResponse> {
    try {
      // Create or retrieve customer
      let customerId: string | undefined;
      if (request.customer?.email) {
        const customers = await this.stripe.customers.list({
          email: request.customer.email,
          limit: 1,
        });

        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        } else {
          const customer = await this.stripe.customers.create({
            email: request.customer.email,
            name: request.customer.name,
            phone: request.customer.phone,
            metadata: {
              userId: request.userId,
            },
          });
          customerId = customer.id;
        }
      }

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(request.amount * 100), // Convert to cents
        currency: request.currency.toLowerCase(),
        customer: customerId,
        description: request.description,
        metadata: {
          paymentId,
          orderId: request.orderId,
          userId: request.userId,
          ...request.metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        id: paymentId,
        status: this.mapStripeStatus(paymentIntent.status),
        amount: request.amount,
        currency: request.currency,
        method: request.method,
        transactionId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        metadata: paymentIntent.metadata,
      };
    } catch (error: any) {
      logger.error('Stripe payment failed', error);
      throw createError(400, `Card payment failed: ${error.message}`);
    }
  }

  /**
   * Process PayPal payment
   */
  private async processPayPalPayment(
    paymentId: string,
    request: PaymentRequest
  ): Promise<PaymentResponse> {
    // PayPal integration would go here
    // This is a placeholder implementation
    return {
      id: paymentId,
      status: PaymentStatus.PENDING,
      amount: request.amount,
      currency: request.currency,
      method: request.method,
      redirectUrl: `https://paypal.com/checkout/${paymentId}`,
      metadata: request.metadata,
    };
  }

  /**
   * Process Apple Pay payment
   */
  private async processApplePayPayment(
    paymentId: string,
    request: PaymentRequest
  ): Promise<PaymentResponse> {
    // Apple Pay uses Stripe Payment Request API
    return this.processCardPayment(paymentId, request);
  }

  /**
   * Process Google Pay payment
   */
  private async processGooglePayPayment(
    paymentId: string,
    request: PaymentRequest
  ): Promise<PaymentResponse> {
    // Google Pay uses Stripe Payment Request API
    return this.processCardPayment(paymentId, request);
  }

  /**
   * Process bank transfer
   */
  private async processBankTransfer(
    paymentId: string,
    request: PaymentRequest
  ): Promise<PaymentResponse> {
    // Bank transfer implementation
    return {
      id: paymentId,
      status: PaymentStatus.PENDING,
      amount: request.amount,
      currency: request.currency,
      method: request.method,
      metadata: {
        ...request.metadata,
        instructions: 'Bank transfer instructions will be sent via email',
      },
    };
  }

  /**
   * Process cryptocurrency payment
   */
  private async processCryptoPayment(
    paymentId: string,
    request: PaymentRequest
  ): Promise<PaymentResponse> {
    // Crypto payment implementation (e.g., using Coinbase Commerce)
    return {
      id: paymentId,
      status: PaymentStatus.PENDING,
      amount: request.amount,
      currency: request.currency,
      method: request.method,
      redirectUrl: `https://commerce.coinbase.com/checkout/${paymentId}`,
      metadata: request.metadata,
    };
  }

  /**
   * Confirm a payment
   */
  async confirmPayment(paymentId: string, data: any): Promise<PaymentResponse> {
    try {
      const payment = await PaymentModel.findById(paymentId);
      if (!payment) {
        throw createError(404, 'Payment not found');
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw createError(400, 'Payment is not in pending status');
      }

      // Process confirmation based on payment method
      let status = PaymentStatus.COMPLETED;
      let transactionId = payment.transactionId;

      if (
        payment.method === PaymentMethod.CREDIT_CARD ||
        payment.method === PaymentMethod.DEBIT_CARD
      ) {
        // Confirm Stripe payment intent
        const paymentIntent = await this.stripe.paymentIntents.confirm(payment.transactionId!);
        status = this.mapStripeStatus(paymentIntent.status);
        transactionId = paymentIntent.id;
      }

      // Update payment status
      payment.status = status;
      payment.transactionId = transactionId;
      payment.processedAt = status === PaymentStatus.COMPLETED ? new Date() : undefined;
      await payment.save();

      // Emit confirmation event
      this.emit('payment.confirmed', {
        paymentId: payment.id,
        orderId: payment.orderId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
      });

      return {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        transactionId: payment.transactionId,
      };
    } catch (error) {
      logger.error('Payment confirmation failed', error);
      throw error;
    }
  }

  /**
   * Process a refund
   */
  async processRefund(request: RefundRequest): Promise<any> {
    try {
      const payment = await PaymentModel.findById(request.paymentId);
      if (!payment) {
        throw createError(404, 'Payment not found');
      }

      if (payment.status !== PaymentStatus.COMPLETED) {
        throw createError(400, 'Cannot refund uncompleted payment');
      }

      const refundAmount = request.amount || payment.amount;
      if (refundAmount > payment.amount - payment.refundedAmount) {
        throw createError(400, 'Refund amount exceeds available amount');
      }

      let refund: any;

      if (
        payment.method === PaymentMethod.CREDIT_CARD ||
        payment.method === PaymentMethod.DEBIT_CARD
      ) {
        // Process Stripe refund
        refund = await this.stripe.refunds.create({
          payment_intent: payment.transactionId!,
          amount: Math.round(refundAmount * 100),
          reason: request.reason as any,
          metadata: request.metadata,
        });
      }

      // Update payment record
      payment.refundedAmount += refundAmount;
      payment.status =
        payment.refundedAmount >= payment.amount
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIALLY_REFUNDED;
      await payment.save();

      // Emit refund event
      this.emit('payment.refunded', {
        paymentId: payment.id,
        orderId: payment.orderId,
        refundAmount,
        totalRefunded: payment.refundedAmount,
        status: payment.status,
      });

      return {
        id: refund?.id,
        paymentId: payment.id,
        amount: refundAmount,
        status: refund?.status || 'succeeded',
        reason: request.reason,
        metadata: request.metadata,
      };
    } catch (error) {
      logger.error('Refund processing failed', error);
      throw error;
    }
  }

  /**
   * Handle Stripe webhook
   */
  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);

      logger.info('Stripe webhook received', { type: event.type, id: event.id });

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
          break;

        case 'charge.refunded':
          await this.handleRefundUpdate(event.data.object as Stripe.Charge);
          break;

        default:
          logger.info('Unhandled webhook event type', { type: event.type });
      }
    } catch (error) {
      logger.error('Webhook processing failed', error);
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await PaymentModel.findOne({ transactionId: paymentIntent.id });
    if (!payment) {
      logger.warn('Payment not found for successful payment intent', { id: paymentIntent.id });
      return;
    }

    payment.status = PaymentStatus.COMPLETED;
    payment.processedAt = new Date();
    await payment.save();

    this.emit('payment.success', {
      paymentId: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
    });
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await PaymentModel.findOne({ transactionId: paymentIntent.id });
    if (!payment) {
      logger.warn('Payment not found for failed payment intent', { id: paymentIntent.id });
      return;
    }

    payment.status = PaymentStatus.FAILED;
    payment.failureReason = paymentIntent.last_payment_error?.message;
    await payment.save();

    this.emit('payment.failed', {
      paymentId: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      reason: payment.failureReason,
    });
  }

  /**
   * Handle refund update
   */
  private async handleRefundUpdate(charge: Stripe.Charge): Promise<void> {
    const payment = await PaymentModel.findOne({ transactionId: charge.payment_intent });
    if (!payment) {
      logger.warn('Payment not found for refunded charge', { id: charge.id });
      return;
    }

    const refundedAmount = charge.amount_refunded / 100;
    payment.refundedAmount = refundedAmount;
    payment.status =
      refundedAmount >= payment.amount ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
    await payment.save();

    this.emit('payment.refund.updated', {
      paymentId: payment.id,
      orderId: payment.orderId,
      refundedAmount,
      status: payment.status,
    });
  }

  /**
   * Map Stripe payment intent status to our status
   */
  private mapStripeStatus(stripeStatus: string): PaymentStatus {
    switch (stripeStatus) {
      case 'succeeded':
        return PaymentStatus.COMPLETED;
      case 'processing':
        return PaymentStatus.PROCESSING;
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return PaymentStatus.PENDING;
      case 'canceled':
        return PaymentStatus.CANCELLED;
      default:
        return PaymentStatus.FAILED;
    }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string): Promise<any> {
    const payment = await PaymentModel.findById(paymentId);
    if (!payment) {
      throw createError(404, 'Payment not found');
    }
    return payment;
  }

  /**
   * Get payments by order ID
   */
  async getPaymentsByOrderId(orderId: string): Promise<any[]> {
    return PaymentModel.find({ orderId }).sort({ createdAt: -1 });
  }

  /**
   * Get payments by user ID
   */
  async getPaymentsByUserId(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<any[]> {
    const query = PaymentModel.find({ userId }).sort({ createdAt: -1 });

    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.skip(options.offset);
    }

    return query.exec();
  }
}

export const paymentService = new PaymentService();
