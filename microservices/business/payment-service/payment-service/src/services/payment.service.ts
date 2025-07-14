import Stripe from 'stripe';
import { PaymentMethod, PaymentStatus, Currency } from '../types/payment.types';
import { logger } from '@ultramarket/common';
import { createError } from '@ultramarket/common';
import { PaymentModel } from '../models/Payment';
import { EventEmitter } from 'events';
import axios from 'axios';
import crypto from 'crypto';

// O'zbekiston Payment Providers - Real Implementation
interface ClickConfig {
  serviceId: string;
  merchantId: string;
  secretKey: string;
  environment: 'test' | 'production';
}

interface PaymeConfig {
  merchantId: string;
  secretKey: string;
  environment: 'test' | 'production';
}

interface ApelsinConfig {
  merchantId: string;
  secretKey: string;
  environment: 'test' | 'production';
}

interface UzbekPaymentOrder {
  id: string;
  status: string;
  amount: number;
  currency: string;
  merchantId: string;
  paymentUrl?: string;
  transactionId?: string;
}

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
  private clickConfig: ClickConfig;
  private paymeConfig: PaymeConfig;
  private apelsinConfig: ApelsinConfig;

  constructor() {
    super();
    
    // Initialize Stripe only if configured
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
      });
      this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    }

    // O'zbekiston payment providers configuration
    this.clickConfig = {
      serviceId: process.env.CLICK_SERVICE_ID || '',
      merchantId: process.env.CLICK_MERCHANT_ID || '',
      secretKey: process.env.CLICK_SECRET_KEY || '',
      environment: (process.env.CLICK_ENVIRONMENT as 'test' | 'production') || 'test',
    };

    this.paymeConfig = {
      merchantId: process.env.PAYME_MERCHANT_ID || '',
      secretKey: process.env.PAYME_SECRET_KEY || '',
      environment: (process.env.PAYME_ENVIRONMENT as 'test' | 'production') || 'test',
    };

    this.apelsinConfig = {
      merchantId: process.env.APELSIN_MERCHANT_ID || '',
      secretKey: process.env.APELSIN_SECRET_KEY || '',
      environment: (process.env.APELSIN_ENVIRONMENT as 'test' | 'production') || 'test',
    };

    // Validate required configurations
    this.validateConfigurations();
  }

  /**
   * Validate payment provider configurations
   */
  private validateConfigurations(): void {
    const errors: string[] = [];

    if (!this.clickConfig.serviceId || !this.clickConfig.merchantId || !this.clickConfig.secretKey) {
      errors.push('Click configuration is incomplete');
    }

    if (!this.paymeConfig.merchantId || !this.paymeConfig.secretKey) {
      errors.push('Payme configuration is incomplete');
    }

    if (!this.apelsinConfig.merchantId || !this.apelsinConfig.secretKey) {
      errors.push('Apelsin configuration is incomplete');
    }

    if (errors.length > 0) {
      logger.warn('Payment service configuration issues', { errors });
    }
  }

  /**
   * Process a payment
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      logger.info('Processing payment', { 
        orderId: request.orderId, 
        amount: request.amount,
        method: request.method,
        currency: request.currency 
      });

      // Validate request
      this.validatePaymentRequest(request);

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
          if (!this.stripe) {
            throw createError(400, 'Stripe is not configured for card payments');
          }
          response = await this.processCardPayment(payment.id, request);
          break;

        case PaymentMethod.CLICK:
          response = await this.processClickPayment(payment.id, request);
          break;

        case PaymentMethod.PAYME:
          response = await this.processPaymePayment(payment.id, request);
          break;

        case PaymentMethod.APELSIN:
          response = await this.processApelsinPayment(payment.id, request);
          break;

        case PaymentMethod.BANK_TRANSFER:
          response = await this.processBankTransfer(payment.id, request);
          break;

        case PaymentMethod.CASH_ON_DELIVERY:
          response = await this.processCashOnDelivery(payment.id, request);
          break;

        default:
          throw createError(400, `Unsupported payment method: ${request.method}`);
      }

      // Update payment record
      await PaymentModel.findByIdAndUpdate(payment.id, {
        status: response.status,
        transactionId: response.transactionId,
        processedAt: response.status === PaymentStatus.COMPLETED ? new Date() : undefined,
        metadata: {
          ...request.metadata,
          ...response.metadata,
        },
      });

      // Emit payment event
      this.emit('payment.processed', {
        paymentId: payment.id,
        orderId: request.orderId,
        status: response.status,
        amount: request.amount,
        currency: request.currency,
        method: request.method,
      });

      return response;
    } catch (error) {
      logger.error('Payment processing failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId: request.orderId,
        method: request.method 
      });
      throw error;
    }
  }

  /**
   * Validate payment request
   */
  private validatePaymentRequest(request: PaymentRequest): void {
    if (!request.amount || request.amount <= 0) {
      throw createError(400, 'Invalid amount');
    }

    if (!request.orderId) {
      throw createError(400, 'Order ID is required');
    }

    if (!request.userId) {
      throw createError(400, 'User ID is required');
    }

    if (!request.currency) {
      throw createError(400, 'Currency is required');
    }

    // Validate amount limits for Uzbekistan
    if (request.amount < 1000) { // 1000 UZS minimum
      throw createError(400, 'Amount must be at least 1000 UZS');
    }

    if (request.amount > 100000000) { // 100M UZS maximum
      throw createError(400, 'Amount exceeds maximum limit');
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
          });
          customerId = customer.id;
        }
      }

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(request.amount * 100), // Convert to cents
        currency: request.currency.toLowerCase(),
        customer: customerId,
        metadata: {
          orderId: request.orderId,
          paymentId,
          userId: request.userId,
          ...request.metadata,
        },
        description: request.description || 'UltraMarket Purchase',
        automatic_payment_methods: {
          enabled: true,
        },
      });

      logger.info('Card payment intent created', {
        paymentIntentId: paymentIntent.id,
        paymentId,
        status: paymentIntent.status,
      });

      return {
        id: paymentId,
        status: this.mapStripeStatus(paymentIntent.status),
        amount: request.amount,
        currency: request.currency,
        method: request.method,
        transactionId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || undefined,
        metadata: {
          ...request.metadata,
          stripePaymentIntentId: paymentIntent.id,
          stripeStatus: paymentIntent.status,
        },
      };
    } catch (error) {
      logger.error('Card payment processing failed', { 
        paymentId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw createError(400, `Card payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process Click payment (O'zbekiston)
   */
  private async processClickPayment(
    paymentId: string,
    request: PaymentRequest
  ): Promise<PaymentResponse> {
    try {
      logger.info('Processing Click payment', {
        paymentId,
        orderId: request.orderId,
        amount: request.amount,
      });

      // Create Click order
      const clickOrder = await this.createClickOrder(request);

      logger.info('Click order created successfully', {
        clickOrderId: clickOrder.id,
        paymentId,
        status: clickOrder.status,
      });

      return {
        id: paymentId,
        status: PaymentStatus.PENDING,
        amount: request.amount,
        currency: request.currency,
        method: request.method,
        transactionId: clickOrder.id,
        redirectUrl: clickOrder.paymentUrl,
        metadata: {
          ...request.metadata,
          clickOrderId: clickOrder.id,
          clickStatus: clickOrder.status,
        },
      };
    } catch (error) {
      logger.error('Click payment processing failed', { 
        paymentId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw createError(400, `Click payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process Payme payment (O'zbekiston)
   */
  private async processPaymePayment(
    paymentId: string,
    request: PaymentRequest
  ): Promise<PaymentResponse> {
    try {
      logger.info('Processing Payme payment', {
        paymentId,
        orderId: request.orderId,
        amount: request.amount,
      });

      // Create Payme order
      const paymeOrder = await this.createPaymeOrder(request);

      logger.info('Payme order created successfully', {
        paymeOrderId: paymeOrder.id,
        paymentId,
        status: paymeOrder.status,
      });

      return {
        id: paymentId,
        status: PaymentStatus.PENDING,
        amount: request.amount,
        currency: request.currency,
        method: request.method,
        transactionId: paymeOrder.id,
        redirectUrl: paymeOrder.paymentUrl,
        metadata: {
          ...request.metadata,
          paymeOrderId: paymeOrder.id,
          paymeStatus: paymeOrder.status,
        },
      };
    } catch (error) {
      logger.error('Payme payment processing failed', { 
        paymentId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw createError(400, `Payme payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process Apelsin payment (O'zbekiston)
   */
  private async processApelsinPayment(
    paymentId: string,
    request: PaymentRequest
  ): Promise<PaymentResponse> {
    try {
      logger.info('Processing Apelsin payment', {
        paymentId,
        orderId: request.orderId,
        amount: request.amount,
      });

      // Create Apelsin order
      const apelsinOrder = await this.createApelsinOrder(request);

      logger.info('Apelsin order created successfully', {
        apelsinOrderId: apelsinOrder.id,
        paymentId,
        status: apelsinOrder.status,
      });

      return {
        id: paymentId,
        status: PaymentStatus.PENDING,
        amount: request.amount,
        currency: request.currency,
        method: request.method,
        transactionId: apelsinOrder.id,
        redirectUrl: apelsinOrder.paymentUrl,
        metadata: {
          ...request.metadata,
          apelsinOrderId: apelsinOrder.id,
          apelsinStatus: apelsinOrder.status,
        },
      };
    } catch (error) {
      logger.error('Apelsin payment processing failed', { 
        paymentId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw createError(400, `Apelsin payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create Click order with proper error handling
   */
  private async createClickOrder(request: PaymentRequest): Promise<UzbekPaymentOrder> {
    try {
      // Validate Click configuration
      if (!this.clickConfig.serviceId || !this.clickConfig.merchantId || !this.clickConfig.secretKey) {
        throw new Error('Click configuration is incomplete');
      }

      const apiUrl = this.clickConfig.environment === 'production'
        ? 'https://api.click.uz/v2/merchant/invoice/create'
        : 'https://testmerchant.click.uz/v2/merchant/invoice/create';

      const orderData = {
        service_id: this.clickConfig.serviceId,
        merchant_id: this.clickConfig.merchantId,
        amount: request.amount,
        currency: request.currency,
        merchant_trans_id: request.orderId,
        merchant_prepare_id: request.orderId,
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/cancel`,
        description: request.description || "UltraMarket to'lov",
      };

      // Add signature for security
      const signature = this.generateClickSignature(orderData);

      const response = await axios.post(apiUrl, {
        ...orderData,
        sign_string: signature,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.clickConfig.merchantId}:${this.clickConfig.secretKey}`).toString('base64')}`,
        },
        timeout: 30000, // 30 seconds timeout
      });

      if (!response.data || response.data.error) {
        throw new Error(response.data?.error || 'Click API error');
      }

      return {
        id: response.data.invoice_id,
        status: 'pending',
        amount: request.amount,
        currency: request.currency,
        merchantId: this.clickConfig.merchantId,
        paymentUrl: response.data.payment_url,
        transactionId: response.data.invoice_id,
      };
    } catch (error) {
      logger.error('Failed to create Click order', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId: request.orderId 
      });
      throw createError(500, `Click order creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate Click signature for security
   */
  private generateClickSignature(data: any): string {
    const signString = `${data.service_id}${data.merchant_id}${data.amount}${data.currency}${data.merchant_trans_id}${data.merchant_prepare_id}${this.clickConfig.secretKey}`;
    return crypto.createHash('md5').update(signString).digest('hex');
  }

  /**
   * Create Payme order with proper error handling
   */
  private async createPaymeOrder(request: PaymentRequest): Promise<UzbekPaymentOrder> {
    try {
      // Validate Payme configuration
      if (!this.paymeConfig.merchantId || !this.paymeConfig.secretKey) {
        throw new Error('Payme configuration is incomplete');
      }

      const apiUrl = this.paymeConfig.environment === 'production'
        ? 'https://checkout.paycom.uz'
        : 'https://test.paycom.uz';

      const orderData = {
        method: 'cards.create',
        params: {
          amount: request.amount * 100, // Payme uses tiyin (1/100 of sum)
          currency: request.currency,
          account: {
            order: request.orderId,
          },
          description: request.description || "UltraMarket to'lov",
          callback_url: `${process.env.API_URL}/payment/payme/callback`,
          callback_timeout: 15,
        },
      };

      // Add signature for security
      const signature = this.generatePaymeSignature(orderData);

      const response = await axios.post(apiUrl, {
        ...orderData,
        sign_string: signature,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.paymeConfig.merchantId}:${this.paymeConfig.secretKey}`).toString('base64')}`,
        },
        timeout: 30000, // 30 seconds timeout
      });

      if (!response.data || response.data.error) {
        throw new Error(response.data?.error || 'Payme API error');
      }

      return {
        id: response.data.result.id,
        status: 'pending',
        amount: request.amount,
        currency: request.currency,
        merchantId: this.paymeConfig.merchantId,
        paymentUrl: response.data.result.pay_url,
        transactionId: response.data.result.id,
      };
    } catch (error) {
      logger.error('Failed to create Payme order', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId: request.orderId 
      });
      throw createError(500, `Payme order creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate Payme signature for security
   */
  private generatePaymeSignature(data: any): string {
    const signString = `${data.method}${JSON.stringify(data.params)}${this.paymeConfig.secretKey}`;
    return crypto.createHash('md5').update(signString).digest('hex');
  }

  /**
   * Create Apelsin order with proper error handling
   */
  private async createApelsinOrder(request: PaymentRequest): Promise<UzbekPaymentOrder> {
    try {
      // Validate Apelsin configuration
      if (!this.apelsinConfig.merchantId || !this.apelsinConfig.secretKey) {
        throw new Error('Apelsin configuration is incomplete');
      }

      const apiUrl = this.apelsinConfig.environment === 'production'
        ? 'https://pay.apelsin.uz/api/v1/invoice'
        : 'https://test.pay.apelsin.uz/api/v1/invoice';

      const orderData = {
        merchant_id: this.apelsinConfig.merchantId,
        amount: request.amount,
        currency: request.currency,
        order_id: request.orderId,
        description: request.description || "UltraMarket to'lov",
        return_url: `${process.env.FRONTEND_URL}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        callback_url: `${process.env.API_URL}/payment/apelsin/callback`,
      };

      // Add signature for security
      const signature = this.generateApelsinSignature(orderData);

      const response = await axios.post(apiUrl, {
        ...orderData,
        sign_string: signature,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apelsinConfig.secretKey}`,
        },
        timeout: 30000, // 30 seconds timeout
      });

      if (!response.data || response.data.error) {
        throw new Error(response.data?.error || 'Apelsin API error');
      }

      return {
        id: response.data.invoice_id,
        status: 'pending',
        amount: request.amount,
        currency: request.currency,
        merchantId: this.apelsinConfig.merchantId,
        paymentUrl: response.data.payment_url,
        transactionId: response.data.invoice_id,
      };
    } catch (error) {
      logger.error('Failed to create Apelsin order', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId: request.orderId 
      });
      throw createError(500, `Apelsin order creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate Apelsin signature for security
   */
  private generateApelsinSignature(data: any): string {
    const signString = `${data.merchant_id}${data.amount}${data.currency}${data.order_id}${this.apelsinConfig.secretKey}`;
    return crypto.createHash('md5').update(signString).digest('hex');
  }

  /**
   * Process bank transfer (O'zbekiston banks)
   */
  private async processBankTransfer(
    paymentId: string,
    request: PaymentRequest
  ): Promise<PaymentResponse> {
    try {
      logger.info('Processing bank transfer', {
        paymentId,
        orderId: request.orderId,
        amount: request.amount,
      });

      // Generate bank transfer instructions
      const transferInstructions = this.generateBankTransferInstructions(request);

      logger.info('Bank transfer instructions generated', {
        paymentId,
        bankAccount: transferInstructions.bankAccount,
        amount: transferInstructions.amount,
      });

      return {
        id: paymentId,
        status: PaymentStatus.PENDING,
        amount: request.amount,
        currency: request.currency,
        method: request.method,
        metadata: {
          ...request.metadata,
          bankAccount: transferInstructions.bankAccount,
          bankName: transferInstructions.bankName,
          transferCode: transferInstructions.transferCode,
          instructions: transferInstructions.instructions,
        },
      };
    } catch (error) {
      logger.error('Bank transfer processing failed', error);
      throw createError(
        400,
        `Bank transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Process cash on delivery
   */
  private async processCashOnDelivery(
    paymentId: string,
    request: PaymentRequest
  ): Promise<PaymentResponse> {
    try {
      logger.info('Processing cash on delivery', {
        paymentId,
        orderId: request.orderId,
        amount: request.amount,
      });

      return {
        id: paymentId,
        status: PaymentStatus.PENDING,
        amount: request.amount,
        currency: request.currency,
        method: request.method,
        metadata: {
          ...request.metadata,
          paymentMethod: 'CASH_ON_DELIVERY',
          requiresConfirmation: true,
        },
      };
    } catch (error) {
      logger.error('Cash on delivery processing failed', error);
      throw createError(
        400,
        `Cash on delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate bank transfer instructions for O'zbekiston banks
   */
  private generateBankTransferInstructions(request: PaymentRequest) {
    const banks = [
      {
        name: 'NBU (Milliy Bank)',
        account: '2021 4000 1234 5678',
        mfo: '00014',
        swift: 'UZBNUZ22',
      },
      {
        name: 'Asaka Bank',
        account: '2021 4000 8765 4321',
        mfo: '00015',
        swift: 'UZASUZ22',
      },
      {
        name: 'Xalq Banki',
        account: '2021 4000 1111 2222',
        mfo: '00016',
        swift: 'UZHLUZ22',
      },
      {
        name: 'Kapital Bank',
        account: '2021 4000 3333 4444',
        mfo: '00017',
        swift: 'UZKPUZ22',
      },
    ];

    const selectedBank = banks[Math.floor(Math.random() * banks.length)];
    const transferCode = `UZ${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    return {
      bankName: selectedBank.name,
      bankAccount: selectedBank.account,
      mfo: selectedBank.mfo,
      swift: selectedBank.swift,
      transferCode,
      amount: request.amount,
      currency: request.currency,
      instructions: [
        `Bank: ${selectedBank.name}`,
        `Account: ${selectedBank.account}`,
        `MFO: ${selectedBank.mfo}`,
        `Amount: ${request.amount} ${request.currency}`,
        `Transfer Code: ${transferCode}`,
        `Purpose: UltraMarket order ${request.orderId}`,
      ],
    };
  }

  /**
   * Confirm payment (for webhook handling)
   */
  async confirmPayment(paymentId: string, data: any): Promise<PaymentResponse> {
    try {
      const payment = await PaymentModel.findById(paymentId);
      if (!payment) {
        throw createError(404, 'Payment not found');
      }

      // Update payment status based on provider response
      let status = PaymentStatus.COMPLETED;
      let transactionId = data.transactionId || data.id;

      // Validate payment amount
      if (data.amount && data.amount !== payment.amount) {
        logger.warn('Payment amount mismatch', {
          paymentId,
          expected: payment.amount,
          received: data.amount,
        });
        status = PaymentStatus.FAILED;
      }

      // Update payment record
      await PaymentModel.findByIdAndUpdate(paymentId, {
        status,
        transactionId,
        processedAt: new Date(),
        metadata: {
          ...payment.metadata,
          confirmationData: data,
        },
      });

      // Emit payment confirmed event
      this.emit('payment.confirmed', {
        paymentId,
        orderId: payment.orderId,
        status,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
      });

      return {
        id: paymentId,
        status,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        transactionId,
        metadata: {
          confirmationData: data,
        },
      };
    } catch (error) {
      logger.error('Payment confirmation failed', { paymentId, error });
      throw error;
    }
  }

  /**
   * Process refund
   */
  async processRefund(request: RefundRequest): Promise<any> {
    try {
      const payment = await PaymentModel.findById(request.paymentId);
      if (!payment) {
        throw createError(404, 'Payment not found');
      }

      if (payment.status !== PaymentStatus.COMPLETED) {
        throw createError(400, 'Payment is not completed');
      }

      const refundAmount = request.amount || payment.amount;

      // Process refund based on payment method
      let refundResult;
      switch (payment.method) {
        case PaymentMethod.CREDIT_CARD:
        case PaymentMethod.DEBIT_CARD:
          if (this.stripe) {
            refundResult = await this.stripe.refunds.create({
              payment_intent: payment.transactionId,
              amount: Math.round(refundAmount * 100),
              reason: request.reason || 'requested_by_customer',
              metadata: {
                paymentId: request.paymentId,
                orderId: payment.orderId,
                ...request.metadata,
              },
            });
          }
          break;

        case PaymentMethod.CLICK:
          refundResult = await this.processClickRefund(payment, refundAmount, request);
          break;

        case PaymentMethod.PAYME:
          refundResult = await this.processPaymeRefund(payment, refundAmount, request);
          break;

        case PaymentMethod.APELSIN:
          refundResult = await this.processApelsinRefund(payment, refundAmount, request);
          break;

        default:
          throw createError(400, `Refund not supported for payment method: ${payment.method}`);
      }

      // Create refund record
      await PaymentModel.create({
        orderId: payment.orderId,
        userId: payment.userId,
        amount: -refundAmount, // Negative amount for refund
        currency: payment.currency,
        method: payment.method,
        status: PaymentStatus.COMPLETED,
        description: `Refund: ${request.reason || 'Customer request'}`,
        metadata: {
          originalPaymentId: request.paymentId,
          refundId: refundResult?.id,
          reason: request.reason,
          ...request.metadata,
        },
      });

      logger.info('Refund processed successfully', {
        paymentId: request.paymentId,
        refundAmount,
        method: payment.method,
      });

      return refundResult;
    } catch (error) {
      logger.error('Refund processing failed', { 
        paymentId: request.paymentId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Process Click refund
   */
  private async processClickRefund(payment: any, amount: number, request: RefundRequest): Promise<any> {
    try {
      const apiUrl = this.clickConfig.environment === 'production'
        ? 'https://api.click.uz/v2/merchant/invoice/refund'
        : 'https://testmerchant.click.uz/v2/merchant/invoice/refund';

      const refundData = {
        service_id: this.clickConfig.serviceId,
        merchant_id: this.clickConfig.merchantId,
        invoice_id: payment.transactionId,
        amount: amount,
        reason: request.reason || 'Customer request',
      };

      const signature = this.generateClickSignature(refundData);

      const response = await axios.post(apiUrl, {
        ...refundData,
        sign_string: signature,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.clickConfig.merchantId}:${this.clickConfig.secretKey}`).toString('base64')}`,
        },
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      logger.error('Click refund failed', { paymentId: request.paymentId, error });
      throw createError(500, 'Click refund failed');
    }
  }

  /**
   * Process Payme refund
   */
  private async processPaymeRefund(payment: any, amount: number, request: RefundRequest): Promise<any> {
    try {
      const apiUrl = this.paymeConfig.environment === 'production'
        ? 'https://checkout.paycom.uz'
        : 'https://test.paycom.uz';

      const refundData = {
        method: 'cards.refund',
        params: {
          id: payment.transactionId,
          amount: amount * 100, // Convert to tiyin
          reason: request.reason || 'Customer request',
        },
      };

      const signature = this.generatePaymeSignature(refundData);

      const response = await axios.post(apiUrl, {
        ...refundData,
        sign_string: signature,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.paymeConfig.merchantId}:${this.paymeConfig.secretKey}`).toString('base64')}`,
        },
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      logger.error('Payme refund failed', { paymentId: request.paymentId, error });
      throw createError(500, 'Payme refund failed');
    }
  }

  /**
   * Process Apelsin refund
   */
  private async processApelsinRefund(payment: any, amount: number, request: RefundRequest): Promise<any> {
    try {
      const apiUrl = this.apelsinConfig.environment === 'production'
        ? 'https://pay.apelsin.uz/api/v1/refund'
        : 'https://test.pay.apelsin.uz/api/v1/refund';

      const refundData = {
        merchant_id: this.apelsinConfig.merchantId,
        invoice_id: payment.transactionId,
        amount: amount,
        reason: request.reason || 'Customer request',
      };

      const signature = this.generateApelsinSignature(refundData);

      const response = await axios.post(apiUrl, {
        ...refundData,
        sign_string: signature,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apelsinConfig.secretKey}`,
        },
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      logger.error('Apelsin refund failed', { paymentId: request.paymentId, error });
      throw createError(500, 'Apelsin refund failed');
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    try {
      if (this.stripe) {
        const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
        
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
            logger.info(`Unhandled webhook event: ${event.type}`);
        }
      }
    } catch (error) {
      logger.error('Webhook handling failed', error);
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      const payment = await PaymentModel.findOne({
        transactionId: paymentIntent.id,
      });

      if (payment) {
        await this.confirmPayment(payment.id, {
          transactionId: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          status: 'succeeded',
        });
      }
    } catch (error) {
      logger.error('Payment success handling failed', error);
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      const payment = await PaymentModel.findOne({
        transactionId: paymentIntent.id,
      });

      if (payment) {
        await PaymentModel.findByIdAndUpdate(payment.id, {
          status: PaymentStatus.FAILED,
          metadata: {
            ...payment.metadata,
            failureReason: paymentIntent.last_payment_error?.message,
          },
        });
      }
    } catch (error) {
      logger.error('Payment failure handling failed', error);
    }
  }

  /**
   * Handle refund update
   */
  private async handleRefundUpdate(charge: Stripe.Charge): Promise<void> {
    try {
      const payment = await PaymentModel.findOne({
        transactionId: charge.payment_intent as string,
      });

      if (payment) {
        await PaymentModel.findByIdAndUpdate(payment.id, {
          metadata: {
            ...payment.metadata,
            refunded: true,
            refundAmount: charge.amount_refunded / 100,
          },
        });
      }
    } catch (error) {
      logger.error('Refund update handling failed', error);
    }
  }

  /**
   * Map Stripe status to internal status
   */
  private mapStripeStatus(stripeStatus: string): PaymentStatus {
    switch (stripeStatus) {
      case 'succeeded':
        return PaymentStatus.COMPLETED;
      case 'processing':
        return PaymentStatus.PENDING;
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return PaymentStatus.PENDING;
      case 'canceled':
        return PaymentStatus.FAILED;
      default:
        return PaymentStatus.PENDING;
    }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string): Promise<any> {
    try {
      const payment = await PaymentModel.findById(paymentId);
      if (!payment) {
        throw createError(404, 'Payment not found');
      }
      return payment;
    } catch (error) {
      logger.error('Get payment by ID failed', { paymentId, error });
      throw error;
    }
  }

  /**
   * Get payments by order ID
   */
  async getPaymentsByOrderId(orderId: string): Promise<any[]> {
    try {
      return await PaymentModel.find({ orderId }).sort({ createdAt: -1 });
    } catch (error) {
      logger.error('Get payments by order ID failed', { orderId, error });
      throw error;
    }
  }

  /**
   * Get payments by user ID
   */
  async getPaymentsByUserId(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<any[]> {
    try {
      const query = PaymentModel.find({ userId }).sort({ createdAt: -1 });
      
      if (options?.limit) {
        query.limit(options.limit);
      }
      
      if (options?.offset) {
        query.skip(options.offset);
      }
      
      return await query.exec();
    } catch (error) {
      logger.error('Get payments by user ID failed', { userId, error });
      throw error;
    }
  }
}
