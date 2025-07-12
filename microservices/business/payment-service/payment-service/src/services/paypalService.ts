import paypal from '@paypal/checkout-server-sdk';
import { logger } from '@ultramarket/common';

export interface PayPalOrder {
  id: string;
  intent: 'CAPTURE' | 'AUTHORIZE';
  purchase_units: Array<{
    amount: {
      currency_code: string;
      value: string;
    };
    description?: string;
    custom_id?: string;
  }>;
  application_context?: {
    return_url?: string;
    cancel_url?: string;
    brand_name?: string;
    landing_page?: string;
    user_action?: string;
    shipping_preference?: string;
  };
}

export interface PayPalCapture {
  id: string;
  status: string;
  amount: {
    currency_code: string;
    value: string;
  };
  create_time: string;
  update_time: string;
}

export class PayPalService {
  private client: paypal.core.PayPalHttpClient;

  constructor() {
    const environment = process.env.NODE_ENV === 'production' 
      ? new paypal.core.LiveEnvironment(
          process.env.PAYPAL_CLIENT_ID!,
          process.env.PAYPAL_CLIENT_SECRET!
        )
      : new paypal.core.SandboxEnvironment(
          process.env.PAYPAL_CLIENT_ID!,
          process.env.PAYPAL_CLIENT_SECRET!
        );

    this.client = new paypal.core.PayPalHttpClient(environment);
  }

  async createOrder(orderData: {
    amount: number;
    currency: string;
    description?: string;
    orderId: string;
    returnUrl: string;
    cancelUrl: string;
  }): Promise<{ orderId: string; approvalUrl: string }> {
    try {
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer("return=representation");
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: orderData.currency.toUpperCase(),
            value: orderData.amount.toFixed(2)
          },
          description: orderData.description,
          custom_id: orderData.orderId
        }],
        application_context: {
          return_url: orderData.returnUrl,
          cancel_url: orderData.cancelUrl,
          brand_name: 'UltraMarket',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING'
        }
      });

      const order = await this.client.execute(request);
      
      logger.info('PayPal order created', {
        paypalOrderId: order.result.id,
        orderId: orderData.orderId,
        amount: orderData.amount
      });

      // Find approval URL
      const approvalLink = order.result.links?.find(link => link.rel === 'approve');
      if (!approvalLink?.href) {
        throw new Error('PayPal approval URL not found');
      }

      return {
        orderId: order.result.id!,
        approvalUrl: approvalLink.href
      };
    } catch (error) {
      logger.error('PayPal order creation failed:', error);
      throw error;
    }
  }

  async captureOrder(paypalOrderId: string): Promise<PayPalCapture> {
    try {
      const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
      request.prefer("return=representation");

      const capture = await this.client.execute(request);
      
      logger.info('PayPal order captured', {
        paypalOrderId,
        captureId: capture.result.purchase_units?.[0]?.payments?.captures?.[0]?.id,
        status: capture.result.status
      });

      const captureData = capture.result.purchase_units?.[0]?.payments?.captures?.[0];
      if (!captureData) {
        throw new Error('PayPal capture data not found');
      }

      return {
        id: captureData.id!,
        status: captureData.status!,
        amount: {
          currency_code: captureData.amount?.currency_code!,
          value: captureData.amount?.value!
        },
        create_time: captureData.create_time!,
        update_time: captureData.update_time!
      };
    } catch (error) {
      logger.error('PayPal order capture failed:', error);
      throw error;
    }
  }

  async getOrder(paypalOrderId: string): Promise<any> {
    try {
      const request = new paypal.orders.OrdersGetRequest(paypalOrderId);
      const order = await this.client.execute(request);
      return order.result;
    } catch (error) {
      logger.error('PayPal get order failed:', error);
      throw error;
    }
  }

  async refundCapture(captureId: string, amount?: number): Promise<any> {
    try {
      const request = new paypal.captures.CapturesRefundRequest(captureId);
      
      if (amount) {
        request.requestBody({
          amount: {
            value: amount.toFixed(2),
            currency_code: 'USD'
          }
        });
      }

      const refund = await this.client.execute(request);
      
      logger.info('PayPal refund processed', {
        captureId,
        refundId: refund.result.id,
        status: refund.result.status
      });

      return refund.result;
    } catch (error) {
      logger.error('PayPal refund failed:', error);
      throw error;
    }
  }

  async verifyWebhook(payload: string, signature: string): Promise<boolean> {
    try {
      // In production, you should verify the webhook signature
      // This is a simplified implementation
      const webhookId = process.env.PAYPAL_WEBHOOK_ID;
      if (!webhookId) {
        logger.warn('PayPal webhook ID not configured');
        return true; // For development
      }

      // Verify webhook signature logic would go here
      // For now, we'll return true for development
      return true;
    } catch (error) {
      logger.error('PayPal webhook verification failed:', error);
      return false;
    }
  }

  async processWebhook(payload: any): Promise<void> {
    try {
      const eventType = payload.event_type;
      const resource = payload.resource;

      switch (eventType) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          await this.handlePaymentCompleted(resource);
          break;
        case 'PAYMENT.CAPTURE.DENIED':
          await this.handlePaymentDenied(resource);
          break;
        case 'PAYMENT.CAPTURE.REFUNDED':
          await this.handlePaymentRefunded(resource);
          break;
        default:
          logger.info('Unhandled PayPal webhook event:', { eventType });
      }
    } catch (error) {
      logger.error('PayPal webhook processing failed:', error);
      throw error;
    }
  }

  private async handlePaymentCompleted(capture: any): Promise<void> {
    logger.info('PayPal payment completed', {
      captureId: capture.id,
      amount: capture.amount?.value,
      customId: capture.custom_id
    });

    // Update order status in your database
    // Emit event to other services
  }

  private async handlePaymentDenied(capture: any): Promise<void> {
    logger.info('PayPal payment denied', {
      captureId: capture.id,
      customId: capture.custom_id
    });

    // Update order status in your database
    // Emit event to other services
  }

  private async handlePaymentRefunded(capture: any): Promise<void> {
    logger.info('PayPal payment refunded', {
      captureId: capture.id,
      customId: capture.custom_id
    });

    // Update order status in your database
    // Emit event to other services
  }
}