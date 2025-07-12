import axios from 'axios';
import { logger } from '@ultramarket/common';

export interface UzbekistanPaymentRequest {
  amount: number;
  currency: string;
  method: 'click' | 'payme' | 'apelsin' | 'uzum' | 'paynet' | 'bank_transfer';
  orderId: string;
  userId: string;
  description?: string;
  phoneNumber?: string;
  cardNumber?: string;
}

export interface UzbekistanPaymentResponse {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  currency: string;
  method: string;
  transactionId?: string;
  redirectUrl?: string;
  qrCode?: string;
  metadata?: Record<string, any>;
}

export class UzbekistanPaymentService {
  private clickApiUrl: string;
  private paymeApiUrl: string;
  private apelsinApiUrl: string;

  constructor() {
    this.clickApiUrl = process.env.CLICK_API_URL || 'https://api.click.uz';
    this.paymeApiUrl = process.env.PAYME_API_URL || 'https://api.paycom.uz';
    this.apelsinApiUrl = process.env.APELSIN_API_URL || 'https://api.apelsin.uz';
  }

  async processPayment(request: UzbekistanPaymentRequest): Promise<UzbekistanPaymentResponse> {
    try {
      logger.info('Processing Uzbekistan payment', {
        method: request.method,
        amount: request.amount,
        orderId: request.orderId
      });

      switch (request.method) {
        case 'click':
          return await this.processClickPayment(request);
        case 'payme':
          return await this.processPaymePayment(request);
        case 'apelsin':
          return await this.processApelsinPayment(request);
        case 'uzum':
          return await this.processUzumPayment(request);
        case 'paynet':
          return await this.processPaynetPayment(request);
        case 'bank_transfer':
          return await this.processBankTransfer(request);
        default:
          throw new Error(`Unsupported payment method: ${request.method}`);
      }
    } catch (error) {
      logger.error('Uzbekistan payment processing failed:', error);
      throw error;
    }
  }

  private async processClickPayment(request: UzbekistanPaymentRequest): Promise<UzbekistanPaymentResponse> {
    try {
      // Click API integration
      const clickRequest = {
        service_id: process.env.CLICK_SERVICE_ID,
        merchant_id: process.env.CLICK_MERCHANT_ID,
        amount: request.amount * 100, // Convert to tiyin
        currency: 'UZS',
        merchant_prepare_id: request.orderId,
        return_url: `${process.env.FRONTEND_URL}/payment/success?paymentId=${request.orderId}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?paymentId=${request.orderId}`,
        description: request.description || 'UltraMarket purchase'
      };

      const response = await axios.post(
        `${this.clickApiUrl}/payment/prepare`,
        clickRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CLICK_API_KEY}`
          }
        }
      );

      return {
        id: request.orderId,
        status: 'pending',
        amount: request.amount,
        currency: request.currency,
        method: 'click',
        redirectUrl: response.data.pay_url,
        transactionId: response.data.click_paydoc_id,
        metadata: {
          clickPaydocId: response.data.click_paydoc_id,
          merchantPrepareId: response.data.merchant_prepare_id
        }
      };
    } catch (error) {
      logger.error('Click payment failed:', error);
      throw new Error('Click payment processing failed');
    }
  }

  private async processPaymePayment(request: UzbekistanPaymentRequest): Promise<UzbekistanPaymentResponse> {
    try {
      // Payme API integration
      const paymeRequest = {
        method: 'receipts.create',
        params: {
          amount: request.amount * 100, // Convert to tiyin
          currency: 'UZS',
          description: request.description || 'UltraMarket purchase',
          order_id: request.orderId,
          merchant_id: process.env.PAYME_MERCHANT_ID,
          return_url: `${process.env.FRONTEND_URL}/payment/success?paymentId=${request.orderId}`,
          cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?paymentId=${request.orderId}`
        }
      };

      const response = await axios.post(
        this.paymeApiUrl,
        paymeRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.PAYME_API_KEY}`
          }
        }
      );

      return {
        id: request.orderId,
        status: 'pending',
        amount: request.amount,
        currency: request.currency,
        method: 'payme',
        redirectUrl: response.data.result.receipt.pay_url,
        transactionId: response.data.result.receipt._id,
        metadata: {
          paymeReceiptId: response.data.result.receipt._id
        }
      };
    } catch (error) {
      logger.error('Payme payment failed:', error);
      throw new Error('Payme payment processing failed');
    }
  }

  private async processApelsinPayment(request: UzbekistanPaymentRequest): Promise<UzbekistanPaymentResponse> {
    try {
      // Apelsin API integration
      const apelsinRequest = {
        amount: request.amount * 100, // Convert to tiyin
        currency: 'UZS',
        description: request.description || 'UltraMarket purchase',
        order_id: request.orderId,
        merchant_id: process.env.APELSIN_MERCHANT_ID,
        return_url: `${process.env.FRONTEND_URL}/payment/success?paymentId=${request.orderId}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?paymentId=${request.orderId}`,
        phone: request.phoneNumber
      };

      const response = await axios.post(
        `${this.apelsinApiUrl}/payment/create`,
        apelsinRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.APELSIN_API_KEY}`
          }
        }
      );

      return {
        id: request.orderId,
        status: 'pending',
        amount: request.amount,
        currency: request.currency,
        method: 'apelsin',
        redirectUrl: response.data.payment_url,
        transactionId: response.data.transaction_id,
        metadata: {
          apelsinTransactionId: response.data.transaction_id
        }
      };
    } catch (error) {
      logger.error('Apelsin payment failed:', error);
      throw new Error('Apelsin payment processing failed');
    }
  }

  private async processUzumPayment(request: UzbekistanPaymentRequest): Promise<UzbekistanPaymentResponse> {
    try {
      // Uzum payment integration (simplified)
      return {
        id: request.orderId,
        status: 'pending',
        amount: request.amount,
        currency: request.currency,
        method: 'uzum',
        redirectUrl: `https://uzum.uz/payment?orderId=${request.orderId}`,
        transactionId: `UZUM-${Date.now()}`,
        metadata: {
          uzumOrderId: request.orderId
        }
      };
    } catch (error) {
      logger.error('Uzum payment failed:', error);
      throw new Error('Uzum payment processing failed');
    }
  }

  private async processPaynetPayment(request: UzbekistanPaymentRequest): Promise<UzbekistanPaymentResponse> {
    try {
      // Paynet payment integration (simplified)
      return {
        id: request.orderId,
        status: 'pending',
        amount: request.amount,
        currency: request.currency,
        method: 'paynet',
        redirectUrl: `https://paynet.uz/payment?orderId=${request.orderId}`,
        transactionId: `PAYNET-${Date.now()}`,
        metadata: {
          paynetOrderId: request.orderId
        }
      };
    } catch (error) {
      logger.error('Paynet payment failed:', error);
      throw new Error('Paynet payment processing failed');
    }
  }

  private async processBankTransfer(request: UzbekistanPaymentRequest): Promise<UzbekistanPaymentResponse> {
    try {
      // Bank transfer details
      const bankDetails = {
        bankName: 'National Bank of Uzbekistan',
        accountNumber: process.env.BANK_ACCOUNT_NUMBER || '20208000912345678901',
        recipientName: 'UltraMarket LLC',
        purpose: `Payment for order ${request.orderId}`,
        amount: request.amount,
        currency: request.currency
      };

      return {
        id: request.orderId,
        status: 'pending',
        amount: request.amount,
        currency: request.currency,
        method: 'bank_transfer',
        transactionId: `BANK-${Date.now()}`,
        metadata: {
          bankDetails,
          instructions: 'Please transfer the amount to the provided bank account and upload the receipt'
        }
      };
    } catch (error) {
      logger.error('Bank transfer failed:', error);
      throw new Error('Bank transfer processing failed');
    }
  }

  async confirmPayment(paymentId: string, method: string, transactionData: any): Promise<UzbekistanPaymentResponse> {
    try {
      switch (method) {
        case 'click':
          return await this.confirmClickPayment(paymentId, transactionData);
        case 'payme':
          return await this.confirmPaymePayment(paymentId, transactionData);
        case 'apelsin':
          return await this.confirmApelsinPayment(paymentId, transactionData);
        default:
          throw new Error(`Unsupported confirmation method: ${method}`);
      }
    } catch (error) {
      logger.error('Payment confirmation failed:', error);
      throw error;
    }
  }

  private async confirmClickPayment(paymentId: string, transactionData: any): Promise<UzbekistanPaymentResponse> {
    try {
      const response = await axios.post(
        `${this.clickApiUrl}/payment/complete`,
        {
          click_paydoc_id: transactionData.click_paydoc_id,
          service_id: process.env.CLICK_SERVICE_ID,
          merchant_prepare_id: paymentId,
          amount: transactionData.amount,
          sign_time: transactionData.sign_time,
          sign_string: transactionData.sign_string
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CLICK_API_KEY}`
          }
        }
      );

      return {
        id: paymentId,
        status: response.data.error === 0 ? 'completed' : 'failed',
        amount: transactionData.amount / 100,
        currency: 'UZS',
        method: 'click',
        transactionId: transactionData.click_paydoc_id,
        metadata: response.data
      };
    } catch (error) {
      logger.error('Click payment confirmation failed:', error);
      throw error;
    }
  }

  private async confirmPaymePayment(paymentId: string, transactionData: any): Promise<UzbekistanPaymentResponse> {
    try {
      const response = await axios.post(
        this.paymeApiUrl,
        {
          method: 'receipts.check',
          params: {
            id: transactionData.receipt_id
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.PAYME_API_KEY}`
          }
        }
      );

      return {
        id: paymentId,
        status: response.data.result.receipt.state === 1 ? 'completed' : 'failed',
        amount: response.data.result.receipt.amount / 100,
        currency: 'UZS',
        method: 'payme',
        transactionId: transactionData.receipt_id,
        metadata: response.data
      };
    } catch (error) {
      logger.error('Payme payment confirmation failed:', error);
      throw error;
    }
  }

  private async confirmApelsinPayment(paymentId: string, transactionData: any): Promise<UzbekistanPaymentResponse> {
    try {
      const response = await axios.get(
        `${this.apelsinApiUrl}/payment/status/${transactionData.transaction_id}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.APELSIN_API_KEY}`
          }
        }
      );

      return {
        id: paymentId,
        status: response.data.status === 'success' ? 'completed' : 'failed',
        amount: response.data.amount / 100,
        currency: 'UZS',
        method: 'apelsin',
        transactionId: transactionData.transaction_id,
        metadata: response.data
      };
    } catch (error) {
      logger.error('Apelsin payment confirmation failed:', error);
      throw error;
    }
  }

  async handleWebhook(payload: any, signature: string): Promise<void> {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(payload, signature)) {
        throw new Error('Invalid webhook signature');
      }

      const { payment_id, status, amount, method } = payload;

      logger.info('Payment webhook received', {
        paymentId: payment_id,
        status,
        amount,
        method
      });

      // Process webhook based on payment method
      switch (method) {
        case 'click':
          await this.handleClickWebhook(payload);
          break;
        case 'payme':
          await this.handlePaymeWebhook(payload);
          break;
        case 'apelsin':
          await this.handleApelsinWebhook(payload);
          break;
        default:
          logger.warn('Unhandled webhook method:', method);
      }
    } catch (error) {
      logger.error('Webhook processing failed:', error);
      throw error;
    }
  }

  private verifyWebhookSignature(payload: any, signature: string): boolean {
    // Implement signature verification logic
    // This is a simplified implementation
    return true;
  }

  private async handleClickWebhook(payload: any): Promise<void> {
    // Handle Click webhook
    logger.info('Click webhook processed', payload);
  }

  private async handlePaymeWebhook(payload: any): Promise<void> {
    // Handle Payme webhook
    logger.info('Payme webhook processed', payload);
  }

  private async handleApelsinWebhook(payload: any): Promise<void> {
    // Handle Apelsin webhook
    logger.info('Apelsin webhook processed', payload);
  }
}