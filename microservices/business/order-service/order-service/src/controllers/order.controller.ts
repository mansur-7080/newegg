import { Request, Response } from 'express';
import { OrderService, CreateOrderData, UpdateOrderStatusData } from '../services/order.service';
import { logger } from '../utils/logger';
import { 
  OrderNotFoundError, 
  InvalidOrderStatusError, 
  InsufficientStockError,
  PaymentValidationError,
  OrderValidationError 
} from '../utils/errors';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  sessionId?: string;
}

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  /**
   * Create new order from cart
   */
  public createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User authentication required to create order'
          }
        });
        return;
      }

      const {
        cartId,
        shippingAddress,
        billingAddress,
        paymentMethod,
        notes,
        couponCode
      } = req.body;

      // Validation
      if (!cartId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_CART_ID',
            message: 'Cart ID is required'
          }
        });
        return;
      }

      if (!shippingAddress) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SHIPPING_ADDRESS',
            message: 'Shipping address is required'
          }
        });
        return;
      }

      // Validate shipping address fields
      const requiredAddressFields = ['firstName', 'lastName', 'phone', 'address', 'city', 'region', 'country'];
      for (const field of requiredAddressFields) {
        if (!shippingAddress[field]) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_SHIPPING_ADDRESS',
              message: `Shipping address field '${field}' is required`
            }
          });
          return;
        }
      }

      if (!paymentMethod) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PAYMENT_METHOD',
            message: 'Payment method is required'
          }
        });
        return;
      }

      const validPaymentMethods = ['CLICK', 'PAYME', 'UZCARD', 'CASH_ON_DELIVERY', 'BANK_TRANSFER'];
      if (!validPaymentMethods.includes(paymentMethod)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PAYMENT_METHOD',
            message: `Payment method must be one of: ${validPaymentMethods.join(', ')}`
          }
        });
        return;
      }

      const orderData: CreateOrderData = {
        userId,
        cartId,
        shippingAddress,
        billingAddress,
        paymentMethod,
        notes,
        couponCode
      };

      logger.info('Creating order', { userId, cartId, paymentMethod });

      const order = await this.orderService.createOrder(orderData);

      res.status(201).json({
        success: true,
        data: {
          order: {
            id: order.id,
            status: order.status,
            paymentStatus: order.paymentStatus,
            totals: {
              subtotal: order.subtotal.toNumber(),
              taxAmount: order.taxAmount.toNumber(),
              shippingAmount: order.shippingAmount.toNumber(),
              discountAmount: order.discountAmount.toNumber(),
              totalAmount: order.totalAmount.toNumber()
            },
            currency: order.currency,
            paymentMethod: order.paymentMethod,
            trackingNumber: order.trackingNumber,
            createdAt: order.createdAt,
            estimatedDelivery: this.calculateEstimatedDelivery(order.shippingAddress)
          }
        },
        message: 'Order created successfully'
      });
    } catch (error) {
      logger.error('Error creating order:', error);

      if (error instanceof OrderValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'ORDER_VALIDATION_ERROR',
            message: error.message
          }
        });
      } else if (error instanceof InsufficientStockError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'ORDER_CREATION_FAILED',
            message: error instanceof Error ? error.message : 'Failed to create order'
          }
        });
      }
    }
  };

  /**
   * Get order by ID
   */
  public getOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;

      if (!orderId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_ORDER_ID',
            message: 'Order ID is required'
          }
        });
        return;
      }

      logger.info('Getting order', { orderId, userId });

      // For regular users, only allow access to their own orders
      // For admin users, allow access to any order
      const order = await this.orderService.getOrderById(
        orderId, 
        req.user?.role === 'admin' ? undefined : userId
      );

      res.json({
        success: true,
        data: {
          order: {
            id: order.id,
            userId: order.userId,
            status: order.status,
            paymentStatus: order.paymentStatus,
            totals: {
              subtotal: order.subtotal.toNumber(),
              taxAmount: order.taxAmount.toNumber(),
              shippingAmount: order.shippingAmount.toNumber(),
              discountAmount: order.discountAmount.toNumber(),
              totalAmount: order.totalAmount.toNumber()
            },
            currency: order.currency,
            paymentMethod: order.paymentMethod,
            shippingAddress: order.shippingAddress,
            billingAddress: order.billingAddress,
            notes: order.notes,
            trackingNumber: order.trackingNumber,
            items: order.orderItems.map(item => ({
              id: item.id,
              productId: item.productId,
              variantId: item.variantId,
              name: item.name,
              sku: item.sku,
              price: item.price.toNumber(),
              quantity: item.quantity,
              subtotal: item.subtotal.toNumber(),
              weight: item.weight?.toNumber(),
              dimensions: item.dimensions,
              image: item.image,
              attributes: item.attributes
            })),
            history: order.orderHistory.map(history => ({
              id: history.id,
              status: history.status,
              previousStatus: history.previousStatus,
              notes: history.notes,
              trackingNumber: history.trackingNumber,
              createdBy: history.createdBy,
              createdAt: history.createdAt
            })),
            payments: order.payments.map(payment => ({
              id: payment.id,
              amount: payment.amount.toNumber(),
              currency: payment.currency,
              method: payment.method,
              status: payment.status,
              transactionId: payment.transactionId,
              createdAt: payment.createdAt
            })),
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            estimatedDelivery: this.calculateEstimatedDelivery(order.shippingAddress)
          }
        },
        message: 'Order retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting order:', error);

      if (error instanceof OrderNotFoundError) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'ORDER_RETRIEVAL_FAILED',
            message: error instanceof Error ? error.message : 'Failed to retrieve order'
          }
        });
      }
    }
  };

  /**
   * Get user orders with pagination
   */
  public getUserOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User authentication required'
          }
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50); // Max 50 orders per page
      const status = req.query.status as string;

      if (page < 1 || limit < 1) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PAGINATION',
            message: 'Page and limit must be positive numbers'
          }
        });
        return;
      }

      logger.info('Getting user orders', { userId, page, limit, status });

      const result = await this.orderService.getUserOrders(userId, page, limit, status as any);

      res.json({
        success: true,
        data: {
          orders: result.orders.map(order => ({
            id: order.id,
            status: order.status,
            paymentStatus: order.paymentStatus,
            totalAmount: order.totalAmount.toNumber(),
            currency: order.currency,
            itemCount: order.orderItems.length,
            paymentMethod: order.paymentMethod,
            trackingNumber: order.trackingNumber,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            latestStatus: order.orderHistory[0] || null,
            estimatedDelivery: this.calculateEstimatedDelivery(order.shippingAddress)
          })),
          pagination: {
            page: result.page,
            limit: limit,
            total: result.total,
            totalPages: result.totalPages,
            hasNext: result.page < result.totalPages,
            hasPrev: result.page > 1
          }
        },
        message: 'User orders retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting user orders:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'USER_ORDERS_RETRIEVAL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retrieve user orders'
        }
      });
    }
  };

  /**
   * Update order status (admin only)
   */
  public updateOrderStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Check admin permission
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required to update order status'
          }
        });
        return;
      }

      const { orderId } = req.params;
      const { status, notes, trackingNumber } = req.body;

      if (!orderId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_ORDER_ID',
            message: 'Order ID is required'
          }
        });
        return;
      }

      if (!status) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_STATUS',
            message: 'Status is required'
          }
        });
        return;
      }

      const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Status must be one of: ${validStatuses.join(', ')}`
          }
        });
        return;
      }

      const updateData: UpdateOrderStatusData = {
        status,
        notes,
        trackingNumber
      };

      logger.info('Updating order status', { orderId, status, updatedBy: req.user.id });

      const order = await this.orderService.updateOrderStatus(orderId, updateData, req.user.id);

      res.json({
        success: true,
        data: {
          orderId: order.id,
          status: order.status,
          trackingNumber: order.trackingNumber,
          updatedAt: order.updatedAt
        },
        message: 'Order status updated successfully'
      });
    } catch (error) {
      logger.error('Error updating order status:', error);

      if (error instanceof OrderNotFoundError) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: error.message
          }
        });
      } else if (error instanceof InvalidOrderStatusError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'ORDER_STATUS_UPDATE_FAILED',
            message: error instanceof Error ? error.message : 'Failed to update order status'
          }
        });
      }
    }
  };

  /**
   * Cancel order
   */
  public cancelOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User authentication required'
          }
        });
        return;
      }

      if (!orderId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_ORDER_ID',
            message: 'Order ID is required'
          }
        });
        return;
      }

      if (!reason) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REASON',
            message: 'Cancellation reason is required'
          }
        });
        return;
      }

      // Verify order belongs to user (unless admin)
      if (req.user.role !== 'admin') {
        const order = await this.orderService.getOrderById(orderId, userId);
        if (!order) {
          res.status(404).json({
            success: false,
            error: {
              code: 'ORDER_NOT_FOUND',
              message: 'Order not found or access denied'
            }
          });
          return;
        }
      }

      logger.info('Cancelling order', { orderId, reason, cancelledBy: userId });

      const order = await this.orderService.cancelOrder(orderId, reason, userId);

      res.json({
        success: true,
        data: {
          orderId: order.id,
          status: order.status,
          updatedAt: order.updatedAt
        },
        message: 'Order cancelled successfully'
      });
    } catch (error) {
      logger.error('Error cancelling order:', error);

      if (error instanceof OrderNotFoundError) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: error.message
          }
        });
      } else if (error instanceof InvalidOrderStatusError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'CANNOT_CANCEL_ORDER',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'ORDER_CANCELLATION_FAILED',
            message: error instanceof Error ? error.message : 'Failed to cancel order'
          }
        });
      }
    }
  };

  /**
   * Process payment for order
   */
  public processPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;
      const paymentData = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User authentication required'
          }
        });
        return;
      }

      if (!orderId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_ORDER_ID',
            message: 'Order ID is required'
          }
        });
        return;
      }

      // Verify order belongs to user (unless admin)
      if (req.user.role !== 'admin') {
        const order = await this.orderService.getOrderById(orderId, userId);
        if (!order) {
          res.status(404).json({
            success: false,
            error: {
              code: 'ORDER_NOT_FOUND',
              message: 'Order not found or access denied'
            }
          });
          return;
        }
      }

      logger.info('Processing payment', { orderId, userId });

      const result = await this.orderService.processPayment(orderId, paymentData);

      if (result.success) {
        res.json({
          success: true,
          data: {
            orderId: orderId,
            paymentId: result.payment.id,
            transactionId: result.transactionId,
            status: 'completed'
          },
          message: result.message || 'Payment processed successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'PAYMENT_FAILED',
            message: result.message || 'Payment processing failed'
          }
        });
      }
    } catch (error) {
      logger.error('Error processing payment:', error);

      if (error instanceof OrderNotFoundError) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: error.message
          }
        });
      } else if (error instanceof PaymentValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PAYMENT_VALIDATION_ERROR',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'PAYMENT_PROCESSING_FAILED',
            message: error instanceof Error ? error.message : 'Failed to process payment'
          }
        });
      }
    }
  };

  /**
   * Get order statistics (admin only)
   */
  public getOrderStatistics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Check admin permission
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required'
          }
        });
        return;
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const userId = req.query.userId as string;

      // Validate dates
      if (startDate && isNaN(startDate.getTime())) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_START_DATE',
            message: 'Invalid start date format'
          }
        });
        return;
      }

      if (endDate && isNaN(endDate.getTime())) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_END_DATE',
            message: 'Invalid end date format'
          }
        });
        return;
      }

      logger.info('Getting order statistics', { startDate, endDate, userId });

      const stats = await this.orderService.getOrderStatistics(startDate, endDate, userId);

      res.json({
        success: true,
        data: {
          statistics: {
            totalOrders: stats.totalOrders,
            totalRevenue: stats.totalRevenue,
            averageOrderValue: Math.round(stats.averageOrderValue * 100) / 100, // Round to 2 decimal places
            statusBreakdown: stats.statusBreakdown,
            paymentMethodBreakdown: stats.paymentMethodBreakdown,
            period: {
              startDate: startDate?.toISOString(),
              endDate: endDate?.toISOString()
            }
          }
        },
        message: 'Order statistics retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting order statistics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'STATISTICS_RETRIEVAL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retrieve order statistics'
        }
      });
    }
  };

  /**
   * Get order tracking information
   */
  public getOrderTracking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;

      if (!orderId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_ORDER_ID',
            message: 'Order ID is required'
          }
        });
        return;
      }

      logger.info('Getting order tracking', { orderId, userId });

      // Allow tracking by order ID without strict user verification (for guest access)
      const order = await this.orderService.getOrderById(orderId);

      const trackingInfo = {
        orderId: order.id,
        status: order.status,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: this.calculateEstimatedDelivery(order.shippingAddress),
        history: order.orderHistory.map(history => ({
          status: history.status,
          notes: history.notes,
          date: history.createdAt,
          location: this.getStatusLocation(history.status)
        })).reverse(), // Show chronological order
        shippingAddress: {
          city: order.shippingAddress.city,
          region: order.shippingAddress.region,
          country: order.shippingAddress.country
        }
      };

      res.json({
        success: true,
        data: { tracking: trackingInfo },
        message: 'Order tracking information retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting order tracking:', error);

      if (error instanceof OrderNotFoundError) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'TRACKING_RETRIEVAL_FAILED',
            message: error instanceof Error ? error.message : 'Failed to retrieve tracking information'
          }
        });
      }
    }
  };

  /**
   * Private helper methods
   */

  private calculateEstimatedDelivery(shippingAddress: any): string {
    const now = new Date();
    let deliveryDays = 3; // Default 3 days

    // Adjust delivery time based on region (Uzbekistan specific)
    switch (shippingAddress.region?.toLowerCase()) {
      case 'toshkent':
      case 'tashkent':
        deliveryDays = 1; // Same day or next day for Tashkent
        break;
      case 'samarqand':
      case 'samarkand':
      case 'buxoro':
      case 'bukhara':
      case 'andijon':
      case 'andijan':
        deliveryDays = 2; // 2 days for major cities
        break;
      case 'qashqadaryo':
      case 'surxondaryo':
      case 'xorazm':
        deliveryDays = 4; // 4 days for remote regions
        break;
      default:
        deliveryDays = 3; // 3 days for other regions
    }

    const deliveryDate = new Date(now);
    deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);

    return deliveryDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  }

  private getStatusLocation(status: string): string {
    const statusLocations: Record<string, string> = {
      'PENDING': 'Order Processing Center',
      'CONFIRMED': 'Warehouse - Tashkent',
      'PROCESSING': 'Packaging Department',
      'SHIPPED': 'In Transit',
      'DELIVERED': 'Customer Location',
      'CANCELLED': 'Order Cancelled',
      'REFUNDED': 'Refund Processed'
    };

    return statusLocations[status] || 'Unknown Location';
  }
}
