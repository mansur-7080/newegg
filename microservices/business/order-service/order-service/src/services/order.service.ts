import { PrismaClient, Order, OrderItem, OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../utils/logger';
import { 
  OrderNotFoundError, 
  InvalidOrderStatusError, 
  InsufficientStockError,
  PaymentValidationError,
  OrderValidationError 
} from '../utils/errors';

const prisma = new PrismaClient();

export interface CreateOrderData {
  userId: string;
  cartId: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  billingAddress?: {
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  paymentMethod: PaymentMethod;
  notes?: string;
  couponCode?: string;
}

export interface OrderCalculation {
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
}

export interface OrderWithDetails extends Order {
  orderItems: OrderItem[];
  orderHistory: any[];
  payments: any[];
}

export interface UpdateOrderStatusData {
  status: OrderStatus;
  notes?: string;
  trackingNumber?: string;
}

export class OrderService {
  
  /**
   * Create new order from cart
   */
  async createOrder(data: CreateOrderData): Promise<OrderWithDetails> {
    try {
      logger.info('Creating new order', { userId: data.userId, cartId: data.cartId });

      // Get cart items from Cart Service
      const cartItems = await this.getCartItems(data.cartId);
      if (!cartItems || cartItems.length === 0) {
        throw new OrderValidationError('Cart is empty or not found');
      }

      // Validate stock availability
      await this.validateStockAvailability(cartItems);

      // Calculate order totals
      const calculations = await this.calculateOrderTotals(cartItems, data.couponCode);

      // Create order in transaction
      const order = await prisma.$transaction(async (tx) => {
        // Create order
        const newOrder = await tx.order.create({
          data: {
            userId: data.userId,
            status: 'PENDING',
            subtotal: new Decimal(calculations.subtotal),
            taxAmount: new Decimal(calculations.taxAmount),
            shippingAmount: new Decimal(calculations.shippingAmount),
            discountAmount: new Decimal(calculations.discountAmount),
            totalAmount: new Decimal(calculations.totalAmount),
            currency: 'UZS',
            shippingAddress: data.shippingAddress,
            billingAddress: data.billingAddress || data.shippingAddress,
            paymentMethod: data.paymentMethod,
            paymentStatus: 'PENDING',
            notes: data.notes,
          },
          include: {
            orderItems: true,
            orderHistory: true,
            payments: true,
          }
        });

        // Create order items
        for (const cartItem of cartItems) {
          await tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              productId: cartItem.productId,
              variantId: cartItem.variantId,
              name: cartItem.name,
              sku: cartItem.sku,
              price: new Decimal(cartItem.price),
              quantity: cartItem.quantity,
              subtotal: new Decimal(cartItem.price * cartItem.quantity),
              weight: cartItem.weight ? new Decimal(cartItem.weight) : null,
              dimensions: cartItem.dimensions,
              image: cartItem.image,
              attributes: cartItem.attributes,
            }
          });
        }

        // Create order history entry
        await tx.orderHistory.create({
          data: {
            orderId: newOrder.id,
            status: 'PENDING',
            notes: 'Order created successfully',
            createdBy: data.userId,
          }
        });

        // Reserve stock
        await this.reserveStock(cartItems);

        // Clear cart after successful order creation
        await this.clearCart(data.cartId);

        return newOrder;
      });

      logger.info('Order created successfully', { 
        orderId: order.id, 
        userId: data.userId,
        totalAmount: calculations.totalAmount 
      });

      // Send order confirmation notification
      await this.sendOrderConfirmation(order);

      return order;
    } catch (error) {
      logger.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string, userId?: string): Promise<OrderWithDetails> {
    try {
      const whereClause: any = { id: orderId };
      if (userId) {
        whereClause.userId = userId;
      }

      const order = await prisma.order.findUnique({
        where: whereClause,
        include: {
          orderItems: {
            orderBy: { createdAt: 'asc' }
          },
          orderHistory: {
            orderBy: { createdAt: 'desc' }
          },
          payments: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!order) {
        throw new OrderNotFoundError('Order not found');
      }

      return order;
    } catch (error) {
      logger.error('Error getting order by ID:', error);
      throw error;
    }
  }

  /**
   * Get user orders with pagination
   */
  async getUserOrders(
    userId: string, 
    page: number = 1, 
    limit: number = 10,
    status?: OrderStatus
  ): Promise<{
    orders: OrderWithDetails[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const offset = (page - 1) * limit;
      const whereClause: any = { userId };
      
      if (status) {
        whereClause.status = status;
      }

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: whereClause,
          include: {
            orderItems: true,
            orderHistory: {
              orderBy: { createdAt: 'desc' },
              take: 1 // Latest status only for list view
            },
            payments: {
              orderBy: { createdAt: 'desc' },
              take: 1 // Latest payment only for list view
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit,
        }),
        prisma.order.count({ where: whereClause })
      ]);

      return {
        orders,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error getting user orders:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string, 
    data: UpdateOrderStatusData,
    updatedBy: string
  ): Promise<OrderWithDetails> {
    try {
      logger.info('Updating order status', { orderId, status: data.status });

      // Get current order
      const currentOrder = await this.getOrderById(orderId);
      
      // Validate status transition
      this.validateStatusTransition(currentOrder.status, data.status);

      // Update order in transaction
      const updatedOrder = await prisma.$transaction(async (tx) => {
        // Update order
        const order = await tx.order.update({
          where: { id: orderId },
          data: {
            status: data.status,
            trackingNumber: data.trackingNumber,
            updatedAt: new Date(),
          },
          include: {
            orderItems: true,
            orderHistory: {
              orderBy: { createdAt: 'desc' }
            },
            payments: true,
          }
        });

        // Create history entry
        await tx.orderHistory.create({
          data: {
            orderId: orderId,
            status: data.status,
            previousStatus: currentOrder.status,
            notes: data.notes || `Order status updated to ${data.status}`,
            trackingNumber: data.trackingNumber,
            createdBy: updatedBy,
          }
        });

        // Handle status-specific logic
        await this.handleStatusChange(order, currentOrder.status, data.status);

        return order;
      });

      logger.info('Order status updated successfully', { 
        orderId, 
        oldStatus: currentOrder.status,
        newStatus: data.status 
      });

      // Send status update notification
      await this.sendStatusUpdateNotification(updatedOrder);

      return updatedOrder;
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, reason: string, cancelledBy: string): Promise<OrderWithDetails> {
    try {
      logger.info('Cancelling order', { orderId, reason });

      const order = await this.getOrderById(orderId);

      // Validate if order can be cancelled
      if (!this.canCancelOrder(order.status)) {
        throw new InvalidOrderStatusError(`Cannot cancel order with status: ${order.status}`);
      }

      const cancelledOrder = await prisma.$transaction(async (tx) => {
        // Update order status
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'CANCELLED',
            updatedAt: new Date(),
          },
          include: {
            orderItems: true,
            orderHistory: {
              orderBy: { createdAt: 'desc' }
            },
            payments: true,
          }
        });

        // Create history entry
        await tx.orderHistory.create({
          data: {
            orderId: orderId,
            status: 'CANCELLED',
            previousStatus: order.status,
            notes: `Order cancelled. Reason: ${reason}`,
            createdBy: cancelledBy,
          }
        });

        // Release reserved stock
        await this.releaseStock(order.orderItems);

        // Handle refund if payment was completed
        if (order.paymentStatus === 'COMPLETED') {
          await this.processRefund(order);
        }

        return updatedOrder;
      });

      logger.info('Order cancelled successfully', { orderId });

      // Send cancellation notification
      await this.sendCancellationNotification(cancelledOrder, reason);

      return cancelledOrder;
    } catch (error) {
      logger.error('Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Process payment for order
   */
  async processPayment(orderId: string, paymentData: any): Promise<any> {
    try {
      logger.info('Processing payment for order', { orderId });

      const order = await this.getOrderById(orderId);

      if (order.paymentStatus === 'COMPLETED') {
        throw new PaymentValidationError('Order is already paid');
      }

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          orderId: orderId,
          amount: order.totalAmount,
          currency: order.currency,
          method: order.paymentMethod,
          status: 'PROCESSING',
          transactionId: paymentData.transactionId,
          providerResponse: paymentData,
        }
      });

      // Process payment based on method
      let paymentResult;
      switch (order.paymentMethod) {
        case 'CLICK':
          paymentResult = await this.processClickPayment(order, payment, paymentData);
          break;
        case 'PAYME':
          paymentResult = await this.processPaymePayment(order, payment, paymentData);
          break;
        case 'UZCARD':
          paymentResult = await this.processUzcardPayment(order, payment, paymentData);
          break;
        case 'CASH_ON_DELIVERY':
          paymentResult = await this.processCashOnDelivery(order, payment);
          break;
        default:
          throw new PaymentValidationError(`Unsupported payment method: ${order.paymentMethod}`);
      }

      // Update order payment status
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: paymentResult.success ? 'COMPLETED' : 'FAILED',
          updatedAt: new Date(),
        }
      });

      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: paymentResult.success ? 'COMPLETED' : 'FAILED',
          transactionId: paymentResult.transactionId,
          providerResponse: paymentResult,
          updatedAt: new Date(),
        }
      });

      logger.info('Payment processed', { 
        orderId, 
        paymentId: payment.id,
        success: paymentResult.success 
      });

      // If payment successful, update order status to CONFIRMED
      if (paymentResult.success) {
        await this.updateOrderStatus(orderId, {
          status: 'CONFIRMED',
          notes: 'Payment completed successfully'
        }, 'system');
      }

      return {
        success: paymentResult.success,
        payment: payment,
        transactionId: paymentResult.transactionId,
        message: paymentResult.message,
      };
    } catch (error) {
      logger.error('Error processing payment:', error);
      throw error;
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStatistics(
    startDate?: Date,
    endDate?: Date,
    userId?: string
  ): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    statusBreakdown: Record<string, number>;
    paymentMethodBreakdown: Record<string, number>;
  }> {
    try {
      const whereClause: any = {};
      
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }
      
      if (userId) {
        whereClause.userId = userId;
      }

      const [totalOrders, revenueData, statusData, paymentMethodData] = await Promise.all([
        prisma.order.count({ where: whereClause }),
        prisma.order.aggregate({
          where: whereClause,
          _sum: { totalAmount: true },
          _avg: { totalAmount: true },
        }),
        prisma.order.groupBy({
          by: ['status'],
          where: whereClause,
          _count: { status: true },
        }),
        prisma.order.groupBy({
          by: ['paymentMethod'],
          where: whereClause,
          _count: { paymentMethod: true },
        }),
      ]);

      const statusBreakdown = statusData.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<string, number>);

      const paymentMethodBreakdown = paymentMethodData.reduce((acc, item) => {
        acc[item.paymentMethod] = item._count.paymentMethod;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalOrders,
        totalRevenue: revenueData._sum.totalAmount?.toNumber() || 0,
        averageOrderValue: revenueData._avg.totalAmount?.toNumber() || 0,
        statusBreakdown,
        paymentMethodBreakdown,
      };
    } catch (error) {
      logger.error('Error getting order statistics:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private async getCartItems(cartId: string): Promise<any[]> {
    // Call Cart Service API to get cart items
    try {
      // This would be a real API call to Cart Service
      // For now, simulating the response
      const response = await fetch(`http://cart-service:3006/api/cart/${cartId}/items`);
      if (!response.ok) {
        throw new Error('Failed to get cart items');
      }
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      logger.error('Error getting cart items:', error);
      throw new OrderValidationError('Failed to get cart items');
    }
  }

  private async validateStockAvailability(cartItems: any[]): Promise<void> {
    for (const item of cartItems) {
      // Call Inventory Service to check stock
      const stockAvailable = await this.checkProductStock(item.productId, item.quantity);
      if (!stockAvailable) {
        throw new InsufficientStockError(`Insufficient stock for product: ${item.name}`);
      }
    }
  }

  private async checkProductStock(productId: string, quantity: number): Promise<boolean> {
    try {
      // This would be a real API call to Inventory Service
      const response = await fetch(`http://inventory-service:3008/api/inventory/${productId}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      });
      const data = await response.json();
      return data.available;
    } catch (error) {
      logger.error('Error checking product stock:', error);
      return false; // Fail safe - assume not available
    }
  }

  private async calculateOrderTotals(cartItems: any[], couponCode?: string): Promise<OrderCalculation> {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Calculate tax (15% VAT for Uzbekistan)
    const taxRate = 0.15;
    const taxAmount = subtotal * taxRate;
    
    // Calculate shipping (free shipping for orders over 200,000 UZS)
    const freeShippingThreshold = 200000;
    let shippingAmount = 0;
    
    if (subtotal < freeShippingThreshold) {
      // Calculate shipping based on total weight and delivery region
      const totalWeight = cartItems.reduce((sum, item) => sum + (item.weight || 0), 0);
      shippingAmount = this.calculateShippingCost(totalWeight, subtotal);
    }
    
    // Calculate discount
    let discountAmount = 0;
    if (couponCode) {
      discountAmount = await this.calculateDiscount(subtotal, couponCode);
    }
    
    const totalAmount = subtotal + taxAmount + shippingAmount - discountAmount;
    
    return {
      subtotal,
      taxAmount,
      shippingAmount,
      discountAmount,
      totalAmount,
    };
  }

  private calculateShippingCost(weight: number, orderValue: number): number {
    // Uzbekistan shipping calculation
    const baseShipping = 20000; // 20,000 UZS base shipping
    const weightMultiplier = Math.max(0, weight - 1) * 5000; // 5,000 UZS per kg after first kg
    const valueMultiplier = orderValue > 100000 ? 0 : 10000; // Extra fee for low-value orders
    
    return baseShipping + weightMultiplier + valueMultiplier;
  }

  private async calculateDiscount(subtotal: number, couponCode: string): Promise<number> {
    try {
      // Call Discount Service to calculate discount
      const response = await fetch(`http://discount-service:3009/api/discount/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtotal, couponCode })
      });
      const data = await response.json();
      return data.discountAmount || 0;
    } catch (error) {
      logger.error('Error calculating discount:', error);
      return 0; // No discount if service fails
    }
  }

  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['DELIVERED', 'CANCELLED'],
      DELIVERED: ['REFUNDED'],
      CANCELLED: [],
      REFUNDED: [],
      PAID: ['CONFIRMED', 'CANCELLED'],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new InvalidOrderStatusError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  private canCancelOrder(status: OrderStatus): boolean {
    return ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(status);
  }

  private async handleStatusChange(
    order: OrderWithDetails, 
    oldStatus: OrderStatus, 
    newStatus: OrderStatus
  ): Promise<void> {
    switch (newStatus) {
      case 'SHIPPED':
        // Generate tracking number if not provided
        if (!order.trackingNumber) {
          await prisma.order.update({
            where: { id: order.id },
            data: { trackingNumber: this.generateTrackingNumber() }
          });
        }
        break;
      
      case 'DELIVERED':
        // Mark delivery date
        await prisma.orderHistory.create({
          data: {
            orderId: order.id,
            status: 'DELIVERED',
            notes: 'Order delivered successfully',
            deliveredAt: new Date(),
            createdBy: 'system',
          }
        });
        break;
      
      case 'CANCELLED':
        // Release stock
        await this.releaseStock(order.orderItems);
        break;
    }
  }

  private generateTrackingNumber(): string {
    const prefix = 'UM'; // UltraMarket prefix
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  private async reserveStock(cartItems: any[]): Promise<void> {
    for (const item of cartItems) {
      try {
        await fetch(`http://inventory-service:3008/api/inventory/${item.productId}/reserve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: item.quantity })
        });
      } catch (error) {
        logger.error('Error reserving stock:', error);
        // Continue with other items
      }
    }
  }

  private async releaseStock(orderItems: OrderItem[]): Promise<void> {
    for (const item of orderItems) {
      try {
        await fetch(`http://inventory-service:3008/api/inventory/${item.productId}/release`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: item.quantity })
        });
      } catch (error) {
        logger.error('Error releasing stock:', error);
        // Continue with other items
      }
    }
  }

  private async clearCart(cartId: string): Promise<void> {
    try {
      await fetch(`http://cart-service:3006/api/cart/${cartId}/clear`, {
        method: 'DELETE'
      });
    } catch (error) {
      logger.error('Error clearing cart:', error);
      // Non-critical error, don't throw
    }
  }

  private async processClickPayment(order: any, payment: any, paymentData: any): Promise<any> {
    // Click.uz payment processing logic
    try {
      const clickResponse = await fetch('https://api.click.uz/v2/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CLICK_API_KEY}`
        },
        body: JSON.stringify({
          amount: order.totalAmount,
          order_id: order.id,
          return_url: `${process.env.BASE_URL}/orders/${order.id}/payment/success`,
          cancel_url: `${process.env.BASE_URL}/orders/${order.id}/payment/cancel`,
        })
      });

      const clickData = await clickResponse.json();
      
      return {
        success: clickData.status === 'success',
        transactionId: clickData.transaction_id,
        message: clickData.message,
        paymentUrl: clickData.payment_url,
      };
    } catch (error) {
      logger.error('Click payment error:', error);
      return {
        success: false,
        message: 'Click payment failed',
      };
    }
  }

  private async processPaymePayment(order: any, payment: any, paymentData: any): Promise<any> {
    // Payme payment processing logic
    try {
      const paymeResponse = await fetch('https://api.payme.uz/v1/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PAYME_API_KEY}`
        },
        body: JSON.stringify({
          amount: order.totalAmount * 100, // Payme uses tiyin
          account: { order_id: order.id },
        })
      });

      const paymeData = await paymeResponse.json();
      
      return {
        success: paymeData.result !== undefined,
        transactionId: paymeData.result?.transaction,
        message: paymeData.error?.message || 'Payment processed',
      };
    } catch (error) {
      logger.error('Payme payment error:', error);
      return {
        success: false,
        message: 'Payme payment failed',
      };
    }
  }

  private async processUzcardPayment(order: any, payment: any, paymentData: any): Promise<any> {
    // Uzcard payment processing logic
    return {
      success: true,
      transactionId: `uzcard_${Date.now()}`,
      message: 'Uzcard payment processed',
    };
  }

  private async processCashOnDelivery(order: any, payment: any): Promise<any> {
    // Cash on delivery - no immediate payment processing
    return {
      success: true,
      transactionId: `cod_${Date.now()}`,
      message: 'Cash on delivery order confirmed',
    };
  }

  private async processRefund(order: OrderWithDetails): Promise<void> {
    // Process refund based on original payment method
    logger.info('Processing refund for cancelled order', { orderId: order.id });
    
    // Update payment status
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'REFUNDED' }
    });
    
    // Create refund record
    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: order.totalAmount.mul(-1), // Negative amount for refund
        currency: order.currency,
        method: order.paymentMethod,
        status: 'COMPLETED',
        type: 'REFUND',
        notes: 'Refund for cancelled order',
      }
    });
  }

  private async sendOrderConfirmation(order: OrderWithDetails): Promise<void> {
    try {
      await fetch(`http://notification-service:3007/api/notifications/order-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: order.userId,
          orderId: order.id,
          orderTotal: order.totalAmount,
          type: 'order_confirmation'
        })
      });
    } catch (error) {
      logger.error('Error sending order confirmation:', error);
    }
  }

  private async sendStatusUpdateNotification(order: OrderWithDetails): Promise<void> {
    try {
      await fetch(`http://notification-service:3007/api/notifications/order-status-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: order.userId,
          orderId: order.id,
          status: order.status,
          trackingNumber: order.trackingNumber,
          type: 'order_status_update'
        })
      });
    } catch (error) {
      logger.error('Error sending status update notification:', error);
    }
  }

  private async sendCancellationNotification(order: OrderWithDetails, reason: string): Promise<void> {
    try {
      await fetch(`http://notification-service:3007/api/notifications/order-cancellation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: order.userId,
          orderId: order.id,
          reason: reason,
          type: 'order_cancellation'
        })
      });
    } catch (error) {
      logger.error('Error sending cancellation notification:', error);
    }
  }
}
