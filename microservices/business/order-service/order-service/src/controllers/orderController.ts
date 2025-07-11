import { Request, Response } from 'express';
import { OrderService } from '../services/orderService';
import { logger } from '@ultramarket/shared';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  /**
   * Create new order
   * POST /api/v1/orders
   */
  async createOrder(req: Request, res: Response) {
    try {
      const orderData = req.body;
      const order = await this.orderService.createOrder(orderData);

      logger.info('Order created successfully', { orderId: order.id });

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: order
      });
    } catch (error) {
      logger.error('Failed to create order', { error });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get order by ID
   * GET /api/v1/orders/:id
   */
  async getOrderById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const order = await this.orderService.getOrderById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      logger.info('Order retrieved successfully', { orderId: id });

      res.status(200).json({
        success: true,
        data: order
      });
    } catch (error) {
      logger.error('Failed to get order', { error, orderId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get orders by user ID
   * GET /api/v1/orders/user/:userId
   */
  async getOrdersByUserId(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10, status } = req.query;

      const result = await this.orderService.getOrdersByUserId(
        userId,
        parseInt(page as string),
        parseInt(limit as string),
        status as string
      );

      logger.info('User orders retrieved successfully', { 
        userId,
        count: result.orders.length
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to get user orders', { error, userId: req.params.userId });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get all orders with pagination and filtering
   * GET /api/v1/orders
   */
  async getOrders(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const filters = {
        status: status as string,
        startDate: startDate as string,
        endDate: endDate as string,
        minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
        maxAmount: maxAmount ? parseFloat(maxAmount as string) : undefined
      };

      const result = await this.orderService.getOrders({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        filters,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      logger.info('Orders retrieved successfully', { 
        count: result.orders.length,
        total: result.total
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to get orders', { error });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update order status
   * PATCH /api/v1/orders/:id/status
   */
  async updateOrderStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const order = await this.orderService.updateOrderStatus(id, status, notes);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      logger.info('Order status updated successfully', { 
        orderId: id,
        status
      });

      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: order
      });
    } catch (error) {
      logger.error('Failed to update order status', { error, orderId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Cancel order
   * POST /api/v1/orders/:id/cancel
   */
  async cancelOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const order = await this.orderService.cancelOrder(id, reason);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      logger.info('Order cancelled successfully', { orderId: id });

      res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        data: order
      });
    } catch (error) {
      logger.error('Failed to cancel order', { error, orderId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Add order item
   * POST /api/v1/orders/:id/items
   */
  async addOrderItem(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const itemData = req.body;

      const order = await this.orderService.addOrderItem(id, itemData);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      logger.info('Order item added successfully', { orderId: id });

      res.status(200).json({
        success: true,
        message: 'Order item added successfully',
        data: order
      });
    } catch (error) {
      logger.error('Failed to add order item', { error, orderId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Remove order item
   * DELETE /api/v1/orders/:id/items/:itemId
   */
  async removeOrderItem(req: Request, res: Response) {
    try {
      const { id, itemId } = req.params;

      const order = await this.orderService.removeOrderItem(id, itemId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order or item not found'
        });
      }

      logger.info('Order item removed successfully', { orderId: id, itemId });

      res.status(200).json({
        success: true,
        message: 'Order item removed successfully',
        data: order
      });
    } catch (error) {
      logger.error('Failed to remove order item', { error, orderId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update order item quantity
   * PATCH /api/v1/orders/:id/items/:itemId
   */
  async updateOrderItemQuantity(req: Request, res: Response) {
    try {
      const { id, itemId } = req.params;
      const { quantity } = req.body;

      const order = await this.orderService.updateOrderItemQuantity(id, itemId, quantity);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order or item not found'
        });
      }

      logger.info('Order item quantity updated successfully', { 
        orderId: id, 
        itemId,
        quantity
      });

      res.status(200).json({
        success: true,
        message: 'Order item quantity updated successfully',
        data: order
      });
    } catch (error) {
      logger.error('Failed to update order item quantity', { error, orderId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get order statistics
   * GET /api/v1/orders/stats
   */
  async getOrderStats(req: Request, res: Response) {
    try {
      const { period = '30d' } = req.query;
      const stats = await this.orderService.getOrderStats(period as string);

      logger.info('Order statistics retrieved successfully');

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Failed to get order statistics', { error });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get order by tracking number
   * GET /api/v1/orders/tracking/:trackingNumber
   */
  async getOrderByTrackingNumber(req: Request, res: Response) {
    try {
      const { trackingNumber } = req.params;
      const order = await this.orderService.getOrderByTrackingNumber(trackingNumber);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      logger.info('Order retrieved by tracking number', { trackingNumber });

      res.status(200).json({
        success: true,
        data: order
      });
    } catch (error) {
      logger.error('Failed to get order by tracking number', { error, trackingNumber: req.params.trackingNumber });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get order history
   * GET /api/v1/orders/:id/history
   */
  async getOrderHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const history = await this.orderService.getOrderHistory(id);

      if (!history) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      logger.info('Order history retrieved successfully', { orderId: id });

      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Failed to get order history', { error, orderId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Process order payment
   * POST /api/v1/orders/:id/payment
   */
  async processOrderPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const paymentData = req.body;

      const result = await this.orderService.processPayment(id, paymentData);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      logger.info('Order payment processed successfully', { orderId: id });

      res.status(200).json({
        success: true,
        message: 'Payment processed successfully',
        data: result.order
      });
    } catch (error) {
      logger.error('Failed to process order payment', { error, orderId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Refund order
   * POST /api/v1/orders/:id/refund
   */
  async refundOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;

      const result = await this.orderService.refundOrder(id, amount, reason);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      logger.info('Order refunded successfully', { orderId: id, amount });

      res.status(200).json({
        success: true,
        message: 'Order refunded successfully',
        data: result.order
      });
    } catch (error) {
      logger.error('Failed to refund order', { error, orderId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}