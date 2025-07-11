import { Request, Response, NextFunction } from 'express';
import { body, validationResult, query } from 'express-validator';
import { logger } from '@ultramarket/shared/logging/logger';
import { prisma } from '@ultramarket/shared/database';
import { 
  BadRequestError, 
  NotFoundError, 
  ValidationError,
  ForbiddenError 
} from '@ultramarket/shared/errors';
import { OrderStatus, PaymentStatus, UserRole } from '@ultramarket/shared/types';

export class OrderController {
  // Create new order
  static async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Invalid input data', errors.array());
      }

      const {
        items,
        shippingAddress,
        billingAddress,
        paymentMethod,
        couponCode,
        notes,
      } = req.body;

      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      // Validate items
      if (!items || items.length === 0) {
        throw new BadRequestError('Order must contain at least one item');
      }

      // Check product availability and get product details
      const productIds = items.map((item: any) => item.productId);
      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          price: true,
          stockQuantity: true,
          vendorId: true,
        },
      });

      if (products.length !== items.length) {
        throw new BadRequestError('Some products are not available');
      }

      // Check stock availability
      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (!product) {
          throw new BadRequestError(`Product ${item.productId} not found`);
        }
        if (product.stockQuantity < item.quantity) {
          throw new BadRequestError(`Insufficient stock for product ${product.name}`);
        }
      }

      // Calculate totals
      let subtotal = 0;
      let totalTax = 0;
      let totalShipping = 0;
      let discount = 0;

      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          subtotal += product.price * item.quantity;
        }
      }

      // Apply coupon if provided
      if (couponCode) {
        const coupon = await prisma.coupon.findFirst({
          where: {
            code: couponCode,
            isActive: true,
            expiresAt: { gt: new Date() },
          },
        });

        if (coupon) {
          if (coupon.type === 'PERCENTAGE') {
            discount = (subtotal * coupon.value) / 100;
          } else {
            discount = coupon.value;
          }
          discount = Math.min(discount, subtotal);
        }
      }

      // Calculate tax (simplified - in real app, use tax service)
      totalTax = subtotal * 0.1; // 10% tax

      // Calculate shipping (simplified - in real app, use shipping service)
      totalShipping = 10.0; // Fixed shipping cost

      const total = subtotal + totalTax + totalShipping - discount;

      // Create order with transaction
      const order = await prisma.$transaction(async (tx) => {
        // Create order
        const newOrder = await tx.order.create({
          data: {
            userId: req.user.id,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            subtotal,
            tax: totalTax,
            shipping: totalShipping,
            discount,
            total,
            shippingAddress,
            billingAddress,
            paymentMethod,
            notes,
            couponCode,
          },
        });

        // Create order items
        const orderItems = await Promise.all(
          items.map((item: any) => {
            const product = products.find(p => p.id === item.productId);
            return tx.orderItem.create({
              data: {
                orderId: newOrder.id,
                productId: item.productId,
                quantity: item.quantity,
                price: product!.price,
                total: product!.price * item.quantity,
              },
            });
          })
        );

        // Update product stock
        await Promise.all(
          items.map((item: any) =>
            tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: {
                  decrement: item.quantity,
                },
              },
            })
          )
        );

        return { ...newOrder, items: orderItems };
      });

      logger.info('Order created successfully', {
        orderId: order.id,
        userId: req.user.id,
        total: order.total,
        operation: 'create_order'
      });

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: { order },
      });

    } catch (error) {
      next(error);
    }
  }

  // Get user orders
  static async getUserOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Invalid query parameters', errors.array());
      }

      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const {
        page = 1,
        limit = 20,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {
        userId: req.user.id,
      };

      if (status) {
        where.status = status;
      }

      // Get orders with count
      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: true,
                  },
                },
              },
            },
          },
          orderBy: { [sortBy as string]: sortOrder },
          skip,
          take: limitNum,
        }),
        prisma.order.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limitNum);

      logger.info('User orders retrieved successfully', {
        userId: req.user.id,
        count: orders.length,
        total,
        operation: 'get_user_orders'
      });

      res.status(200).json({
        success: true,
        data: {
          orders,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1,
          },
        },
      });

    } catch (error) {
      next(error);
    }
  }

  // Get single order
  static async getOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                  vendor: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Check if user can access this order
      if (req.user.role !== UserRole.ADMIN && 
          req.user.role !== UserRole.SUPER_ADMIN && 
          order.userId !== req.user.id) {
        throw new ForbiddenError('You can only view your own orders');
      }

      logger.info('Order retrieved successfully', {
        orderId: id,
        userId: req.user.id,
        operation: 'get_order'
      });

      res.status(200).json({
        success: true,
        data: { order },
      });

    } catch (error) {
      next(error);
    }
  }

  // Update order status (Admin only)
  static async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Invalid input data', errors.array());
      }

      const { id } = req.params;
      const { status, paymentStatus, notes } = req.body;

      // Check if user has permission
      if (!req.user || ![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(req.user.role as UserRole)) {
        throw new ForbiddenError('Insufficient permissions to update order status');
      }

      // Check if order exists
      const existingOrder = await prisma.order.findUnique({
        where: { id },
      });

      if (!existingOrder) {
        throw new NotFoundError('Order not found');
      }

      // Update order
      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          status: status || existingOrder.status,
          paymentStatus: paymentStatus || existingOrder.paymentStatus,
          notes: notes || existingOrder.notes,
          updatedBy: req.user.id,
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      logger.info('Order status updated successfully', {
        orderId: id,
        updatedBy: req.user.id,
        newStatus: status,
        operation: 'update_order_status'
      });

      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: { order: updatedOrder },
      });

    } catch (error) {
      next(error);
    }
  }

  // Cancel order
  static async cancelOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      // Check if order exists
      const existingOrder = await prisma.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!existingOrder) {
        throw new NotFoundError('Order not found');
      }

      // Check if user can cancel this order
      if (req.user.role !== UserRole.ADMIN && 
          req.user.role !== UserRole.SUPER_ADMIN && 
          existingOrder.userId !== req.user.id) {
        throw new ForbiddenError('You can only cancel your own orders');
      }

      // Check if order can be cancelled
      if (existingOrder.status === OrderStatus.CANCELLED) {
        throw new BadRequestError('Order is already cancelled');
      }

      if (existingOrder.status === OrderStatus.DELIVERED) {
        throw new BadRequestError('Cannot cancel delivered order');
      }

      // Cancel order with transaction
      const cancelledOrder = await prisma.$transaction(async (tx) => {
        // Update order status
        const updatedOrder = await tx.order.update({
          where: { id },
          data: {
            status: OrderStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelledBy: req.user.id,
            cancellationReason: reason,
          },
        });

        // Restore product stock
        await Promise.all(
          existingOrder.items.map((item) =>
            tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: {
                  increment: item.quantity,
                },
              },
            })
          )
        );

        return updatedOrder;
      });

      logger.info('Order cancelled successfully', {
        orderId: id,
        cancelledBy: req.user.id,
        reason,
        operation: 'cancel_order'
      });

      res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        data: { order: cancelledOrder },
      });

    } catch (error) {
      next(error);
    }
  }

  // Get all orders (Admin only)
  static async getAllOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Invalid query parameters', errors.array());
      }

      // Check if user has permission
      if (!req.user || ![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(req.user.role as UserRole)) {
        throw new ForbiddenError('Insufficient permissions to view all orders');
      }

      const {
        page = 1,
        limit = 20,
        status,
        paymentStatus,
        userId,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {};

      if (status) where.status = status;
      if (paymentStatus) where.paymentStatus = paymentStatus;
      if (userId) where.userId = userId;

      // Get orders with count
      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { [sortBy as string]: sortOrder },
          skip,
          take: limitNum,
        }),
        prisma.order.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limitNum);

      logger.info('All orders retrieved successfully', {
        count: orders.length,
        total,
        operation: 'get_all_orders'
      });

      res.status(200).json({
        success: true,
        data: {
          orders,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1,
          },
        },
      });

    } catch (error) {
      next(error);
    }
  }

  // Get order statistics (Admin only)
  static async getOrderStats(req: Request, res: Response, next: NextFunction) {
    try {
      // Check if user has permission
      if (!req.user || ![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(req.user.role as UserRole)) {
        throw new ForbiddenError('Insufficient permissions to view order statistics');
      }

      const { period = '30' } = req.query;
      const days = parseInt(period as string);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get statistics
      const [
        totalOrders,
        totalRevenue,
        ordersByStatus,
        revenueByDay,
      ] = await Promise.all([
        // Total orders in period
        prisma.order.count({
          where: {
            createdAt: { gte: startDate },
          },
        }),

        // Total revenue in period
        prisma.order.aggregate({
          where: {
            createdAt: { gte: startDate },
            paymentStatus: PaymentStatus.PAID,
          },
          _sum: { total: true },
        }),

        // Orders by status
        prisma.order.groupBy({
          by: ['status'],
          where: {
            createdAt: { gte: startDate },
          },
          _count: { id: true },
        }),

        // Revenue by day
        prisma.order.groupBy({
          by: ['createdAt'],
          where: {
            createdAt: { gte: startDate },
            paymentStatus: PaymentStatus.PAID,
          },
          _sum: { total: true },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

      const stats = {
        period: `${days} days`,
        totalOrders: totalOrders,
        totalRevenue: totalRevenue._sum.total || 0,
        ordersByStatus,
        revenueByDay,
      };

      logger.info('Order statistics retrieved successfully', {
        period: days,
        operation: 'get_order_stats'
      });

      res.status(200).json({
        success: true,
        data: { stats },
      });

    } catch (error) {
      next(error);
    }
  }
}

// Validation middleware
export const createOrderValidation = [
  body('items').isArray({ min: 1 }),
  body('items.*.productId').isUUID(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('shippingAddress').isObject(),
  body('billingAddress').isObject(),
  body('paymentMethod').isString(),
  body('couponCode').optional().isString(),
  body('notes').optional().isString(),
];

export const updateOrderStatusValidation = [
  body('status').optional().isIn(Object.values(OrderStatus)),
  body('paymentStatus').optional().isIn(Object.values(PaymentStatus)),
  body('notes').optional().isString(),
];

export const cancelOrderValidation = [
  body('reason').optional().isString(),
];

export const getOrdersValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(Object.values(OrderStatus)),
  query('sortBy').optional().isIn(['createdAt', 'total', 'status']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

export const getAllOrdersValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(Object.values(OrderStatus)),
  query('paymentStatus').optional().isIn(Object.values(PaymentStatus)),
  query('userId').optional().isUUID(),
  query('sortBy').optional().isIn(['createdAt', 'total', 'status']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];