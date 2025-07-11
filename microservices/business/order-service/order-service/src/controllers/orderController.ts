import { Request, Response } from 'express';
import { logger } from '@ultramarket/shared';
import { prisma } from '../config/database';
import { OrderService } from '../services/orderService';
import { PaymentService } from '../services/paymentService';
import { NotificationService } from '../services/notificationService';
import { OrderStatus, PaymentStatus } from '@prisma/client';

const orderService = new OrderService();
const paymentService = new PaymentService();
const notificationService = new NotificationService();

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { userId } = req.user as { userId: string };
    const orderData = req.body;

    const order = await orderService.createOrder({
      ...orderData,
      userId,
    });

    // Send notification
    await notificationService.sendOrderConfirmation(order);

    logger.info(`Order created successfully: ${order.id}`);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    });
  } catch (error) {
    logger.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
    });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user as { userId: string; role: string };

    const order = await orderService.getOrderById(id, userId, role);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    logger.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
    });
  }
};

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status, userId } = req.query;
    const { role } = req.user as { role: string };

    const orders = await orderService.getAllOrders({
      page: Number(page),
      limit: Number(limit),
      status: status as OrderStatus,
      userId: userId as string,
      role,
    });

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    logger.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
    });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const { userId } = req.user as { userId: string };

    const order = await orderService.updateOrderStatus(id, status, notes, userId);

    // Send notification
    await notificationService.sendOrderStatusUpdate(order);

    logger.info(`Order status updated: ${id} -> ${status}`);

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: order,
    });
  } catch (error) {
    logger.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
    });
  }
};

export const cancelOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { userId } = req.user as { userId: string };

    const order = await orderService.cancelOrder(id, reason, userId);

    // Send notification
    await notificationService.sendOrderCancellation(order);

    logger.info(`Order cancelled: ${id}`);

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: order,
    });
  } catch (error) {
    logger.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
    });
  }
};

export const getOrdersByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const orders = await orderService.getOrdersByUser(userId, {
      page: Number(page),
      limit: Number(limit),
    });

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    logger.error('Error fetching user orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user orders',
    });
  }
};

export const getOrderHistory = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const history = await orderService.getOrderHistory(userId, {
      page: Number(page),
      limit: Number(limit),
    });

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    logger.error('Error fetching order history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order history',
    });
  }
};

export const processOrderPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentMethod, paymentDetails } = req.body;

    const payment = await paymentService.processPayment(id, paymentMethod, paymentDetails);

    // Update order status
    await orderService.updateOrderStatus(id, OrderStatus.PAID, 'Payment processed successfully');

    logger.info(`Payment processed for order: ${id}`);

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: payment,
    });
  } catch (error) {
    logger.error('Error processing payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment',
    });
  }
};

export const refundOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, amount } = req.body;
    const { userId } = req.user as { userId: string };

    const refund = await paymentService.processRefund(id, amount, reason, userId);

    // Update order status
    await orderService.updateOrderStatus(id, OrderStatus.REFUNDED, `Refund processed: ${reason}`);

    logger.info(`Refund processed for order: ${id}`);

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: refund,
    });
  } catch (error) {
    logger.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
    });
  }
};

export const exportOrders = async (req: Request, res: Response) => {
  try {
    const { format = 'csv', dateFrom, dateTo } = req.query;

    const exportData = await orderService.exportOrders({
      format: format as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=orders-${Date.now()}.csv`);
    res.status(200).send(exportData);
  } catch (error) {
    logger.error('Error exporting orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export orders',
    });
  }
};