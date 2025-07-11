import { Request, Response } from 'express';
import { Order } from '../models/Order';
import { logger } from '@ultramarket/shared/logging/logger';
import { ApiError } from '@ultramarket/shared/errors/ApiError';
import { validateOrderCreate, validateOrderUpdate, validateOrderStatus } from '../validators/orderValidator';
import { 
  generateOrderNumber, 
  calculateOrderTotals, 
  generateOrderSummary,
  validateOrderStatusTransition,
  canCancelOrder,
  calculateEstimatedDelivery,
  formatCurrency,
  generateTrackingUrl
} from '../utils/orderUtils';

export class OrderController {
  /**
   * Create a new order with comprehensive validation
   */
  static async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = validateOrderCreate(req.body);
      if (error) {
        throw new ApiError(400, 'Validation error', error.details);
      }

      const userId = (req as any).user?.userId;

      // Generate unique order number
      const orderNumber = generateOrderNumber();

      // Calculate order totals
      const totals = calculateOrderTotals(value.items, value.shipping, value.totals?.discount || 0);

      // Validate stock availability for each item
      for (const item of value.items) {
        // This would typically check against inventory service
        if (item.quantity <= 0) {
          throw new ApiError(400, `Invalid quantity for product ${item.productName}`);
        }
      }

      // Create order with comprehensive data
      const order = new Order({
        ...value,
        orderNumber,
        userId,
        totals,
        status: 'pending',
        statusHistory: [{
          status: 'pending',
          timestamp: new Date(),
          note: 'Order created successfully',
          updatedBy: userId
        }],
        metadata: {
          source: 'web',
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          createdAt: new Date()
        }
      });

      await order.save();

      // Emit order created event (for other services)
      // await emitOrderEvent('order.created', { orderId: order._id, orderNumber });

      logger.info('Order created successfully', { 
        orderId: order._id, 
        orderNumber: order.orderNumber,
        userId,
        total: order.totals.total
      });

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: { 
          order,
          summary: generateOrderSummary(order)
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Create order error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Get all orders with advanced filtering and search
   */
  static async getOrders(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { 
        page = 1, 
        limit = 20, 
        status, 
        sortBy = 'createdAt', 
        sortOrder = 'desc',
        startDate,
        endDate,
        minTotal,
        maxTotal,
        orderNumber,
        search
      } = req.query;

      // Build filter query
      const filter: any = { userId };

      if (status) filter.status = status;
      if (orderNumber) filter.orderNumber = { $regex: orderNumber, $options: 'i' };
      if (minTotal || maxTotal) {
        filter['totals.total'] = {};
        if (minTotal) filter['totals.total'].$gte = parseFloat(minTotal as string);
        if (maxTotal) filter['totals.total'].$lte = parseFloat(maxTotal as string);
      }
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate as string);
        if (endDate) filter.createdAt.$lte = new Date(endDate as string);
      }

      // Search functionality
      if (search) {
        filter.$or = [
          { orderNumber: { $regex: search, $options: 'i' } },
          { 'customer.firstName': { $regex: search, $options: 'i' } },
          { 'customer.lastName': { $regex: search, $options: 'i' } },
          { 'customer.email': { $regex: search, $options: 'i' } },
          { 'items.productName': { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort query
      const sort: any = {};
      sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const [orders, total] = await Promise.all([
        Order.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit as string))
          .select('-__v')
          .lean(),
        Order.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / parseInt(limit as string));

      // Calculate order statistics
      const stats = await calculateOrderStats(userId);

      logger.info('Orders retrieved successfully', { 
        count: orders.length, 
        total, 
        userId,
        filters: Object.keys(filter).length
      });

      res.status(200).json({
        success: true,
        data: {
          orders,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            totalPages
          },
          stats
        }
      });
    } catch (error) {
      logger.error('Get orders error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Get order by ID with detailed information
   */
  static async getOrderById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.userId;

      const order = await Order.findOne({ _id: id, userId }).select('-__v');
      
      if (!order) {
        throw new ApiError(404, 'Order not found');
      }

      // Calculate estimated delivery
      const estimatedDelivery = calculateEstimatedDelivery(order.createdAt, order.shipping?.method);

      // Generate tracking URL if available
      const trackingUrl = order.shipping?.trackingNumber 
        ? generateTrackingUrl(order.shipping.trackingNumber, order.shipping.method)
        : null;

      logger.info('Order retrieved successfully', { orderId: id, userId });

      res.status(200).json({
        success: true,
        data: { 
          order: {
            ...order,
            estimatedDelivery,
            trackingUrl,
            summary: generateOrderSummary(order)
          }
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Get order error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Get order by order number
   */
  static async getOrderByNumber(req: Request, res: Response): Promise<void> {
    try {
      const { orderNumber } = req.params;
      const userId = (req as any).user?.userId;

      const order = await Order.findOne({ orderNumber, userId }).select('-__v');
      
      if (!order) {
        throw new ApiError(404, 'Order not found');
      }

      // Calculate estimated delivery
      const estimatedDelivery = calculateEstimatedDelivery(order.createdAt, order.shipping?.method);

      // Generate tracking URL if available
      const trackingUrl = order.shipping?.trackingNumber 
        ? generateTrackingUrl(order.shipping.trackingNumber, order.shipping.method)
        : null;

      logger.info('Order retrieved by number', { orderNumber, userId });

      res.status(200).json({
        success: true,
        data: { 
          order: {
            ...order,
            estimatedDelivery,
            trackingUrl,
            summary: generateOrderSummary(order)
          }
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Get order by number error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Update order status with validation and history
   */
  static async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { error, value } = validateOrderStatus(req.body);
      
      if (error) {
        throw new ApiError(400, 'Validation error', error.details);
      }

      const { status, note } = value;
      const userId = (req as any).user?.userId;

      const order = await Order.findById(id);
      if (!order) {
        throw new ApiError(404, 'Order not found');
      }

      // Validate status transition
      if (!validateOrderStatusTransition(order.status, status)) {
        throw new ApiError(400, `Invalid status transition from ${order.status} to ${status}`);
      }

      // Update order status
      const statusUpdate: any = {
        status,
        updatedAt: new Date()
      };

      // Add status-specific timestamps
      if (status === 'confirmed') {
        statusUpdate.confirmedAt = new Date();
      } else if (status === 'shipped') {
        statusUpdate.shippedAt = new Date();
      } else if (status === 'delivered') {
        statusUpdate.deliveredAt = new Date();
      } else if (status === 'cancelled') {
        statusUpdate.cancelledAt = new Date();
      }

      // Add to status history
      order.statusHistory.push({
        status,
        timestamp: new Date(),
        note: note || `Order status updated to ${status}`,
        updatedBy: userId
      });

      await Order.findByIdAndUpdate(id, statusUpdate);

      // Emit status change event
      // await emitOrderEvent('order.status.updated', { orderId: id, status, previousStatus: order.status });

      logger.info('Order status updated', { 
        orderId: id, 
        previousStatus: order.status, 
        newStatus: status,
        updatedBy: userId
      });

      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: { 
          orderId: id,
          status,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Update order status error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Update order tracking information
   */
  static async updateOrderTracking(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { trackingNumber, carrier, estimatedDelivery } = req.body;

      const order = await Order.findById(id);
      if (!order) {
        throw new ApiError(404, 'Order not found');
      }

      // Update tracking information
      const trackingUpdate = {
        'shipping.trackingNumber': trackingNumber,
        'shipping.carrier': carrier,
        'shipping.estimatedDelivery': estimatedDelivery ? new Date(estimatedDelivery) : undefined,
        updatedAt: new Date()
      };

      await Order.findByIdAndUpdate(id, trackingUpdate);

      logger.info('Order tracking updated', { 
        orderId: id, 
        trackingNumber,
        carrier
      });

      res.status(200).json({
        success: true,
        message: 'Tracking information updated successfully',
        data: { 
          orderId: id,
          trackingNumber,
          carrier,
          estimatedDelivery
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Update order tracking error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Cancel order with validation
   */
  static async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = (req as any).user?.userId;

      const order = await Order.findById(id);
      if (!order) {
        throw new ApiError(404, 'Order not found');
      }

      // Check if order can be cancelled
      if (!canCancelOrder(order.status)) {
        throw new ApiError(400, `Order cannot be cancelled in current status: ${order.status}`);
      }

      // Update order status to cancelled
      await Order.findByIdAndUpdate(id, {
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date(),
        $push: {
          statusHistory: {
            status: 'cancelled',
            timestamp: new Date(),
            note: `Order cancelled${reason ? `: ${reason}` : ''}`,
            updatedBy: userId
          }
        }
      });

      // Emit cancellation event
      // await emitOrderEvent('order.cancelled', { orderId: id, reason });

      logger.info('Order cancelled', { 
        orderId: id, 
        reason,
        cancelledBy: userId
      });

      res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        data: { 
          orderId: id,
          status: 'cancelled',
          cancelledAt: new Date()
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Cancel order error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Get order analytics and insights
   */
  static async getOrderAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { period = '30d' } = req.query;

      const analytics = await calculateOrderAnalytics(userId, period as string);

      logger.info('Order analytics retrieved', { userId, period });

      res.status(200).json({
        success: true,
        data: { analytics }
      });
    } catch (error) {
      logger.error('Get order analytics error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Get order status history
   */
  static async getOrderStatusHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.userId;

      const order = await Order.findOne({ _id: id, userId }).select('statusHistory');
      
      if (!order) {
        throw new ApiError(404, 'Order not found');
      }

      logger.info('Order status history retrieved', { orderId: id, userId });

      res.status(200).json({
        success: true,
        data: { 
          orderId: id,
          statusHistory: order.statusHistory
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Get order status history error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Add note to order
   */
  static async addOrderNote(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { note, type = 'internal' } = req.body;
      const userId = (req as any).user?.userId;

      if (!note || note.trim().length === 0) {
        throw new ApiError(400, 'Note content is required');
      }

      const order = await Order.findById(id);
      if (!order) {
        throw new ApiError(404, 'Order not found');
      }

      // Add note to order
      const noteUpdate: any = {};
      if (type === 'customer') {
        noteUpdate['notes.customer'] = note;
      } else {
        noteUpdate['notes.internal'] = note;
      }

      await Order.findByIdAndUpdate(id, {
        ...noteUpdate,
        updatedAt: new Date()
      });

      logger.info('Order note added', { 
        orderId: id, 
        noteType: type,
        addedBy: userId
      });

      res.status(200).json({
        success: true,
        message: 'Note added successfully',
        data: { 
          orderId: id,
          note,
          type,
          addedAt: new Date()
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Add order note error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }
}

// Helper functions
async function calculateOrderStats(userId: string): Promise<any> {
  const stats = await Order.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$totals.total' },
        averageOrderValue: { $avg: '$totals.total' },
        statusCounts: {
          $push: '$status'
        }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0,
      statusBreakdown: {}
    };
  }

  const statusBreakdown = stats[0].statusCounts.reduce((acc: any, status: string) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return {
    totalOrders: stats[0].totalOrders,
    totalSpent: stats[0].totalSpent,
    averageOrderValue: Math.round(stats[0].averageOrderValue * 100) / 100,
    statusBreakdown
  };
}

async function calculateOrderAnalytics(userId: string, period: string): Promise<any> {
  const startDate = new Date();
  
  switch (period) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }

  const analytics = await Order.aggregate([
    {
      $match: {
        userId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        orders: { $sum: 1 },
        revenue: { $sum: '$totals.total' },
        items: { $sum: { $size: '$items' } }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return {
    period,
    startDate,
    endDate: new Date(),
    dailyStats: analytics,
    summary: {
             totalOrders: analytics.reduce((sum: number, day: any) => sum + day.orders, 0),
       totalRevenue: analytics.reduce((sum: number, day: any) => sum + day.revenue, 0),
       totalItems: analytics.reduce((sum: number, day: any) => sum + day.items, 0),
       averageOrderValue: analytics.length > 0 
         ? analytics.reduce((sum: number, day: any) => sum + day.revenue, 0) / analytics.reduce((sum: number, day: any) => sum + day.orders, 0)
         : 0
    }
  };
}