import { PrismaClient } from '@prisma/client';
import { logger } from '../../../../libs/shared/src/logging/logger';

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  product?: {
    name: string;
    image: string;
    sku: string;
  };
}

interface ShippingAddress {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  region: string;
  district: string;
  address: string;
  postalCode?: string;
  deliveryInstructions?: string;
}

interface CreateOrderRequest {
  userId: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: 'PAYME' | 'CLICK' | 'CASH' | 'BANK_TRANSFER';
  couponCode?: string;
  notes?: string;
}

interface Order {
  id: string;
  userId: string;
  orderNumber: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  createdAt: Date;
  updatedAt: Date;
}

enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export class RealOrderService {
  private db: PrismaClient;

  constructor() {
    this.db = new PrismaClient();
  }

  /**
   * Create a new order from cart
   */
  async createOrder(request: CreateOrderRequest): Promise<Order> {
    try {
      const { userId, items, shippingAddress, paymentMethod, couponCode, notes } = request;

      // Validate request
      if (!userId || !items || items.length === 0) {
        throw new Error('User ID and items are required');
      }

      if (!shippingAddress || !shippingAddress.firstName || !shippingAddress.phone) {
        throw new Error('Complete shipping address is required');
      }

      // Use database transaction for consistency
      const order = await this.db.$transaction(async (prisma) => {
        // Verify all products exist and are in stock
        const productIds = items.map(item => item.productId);
        const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            name: true,
            price: true,
            stockQuantity: true,
            inStock: true,
            image: true,
            sku: true,
          },
        });

        if (products.length !== items.length) {
          throw new Error('Some products not found');
        }

        // Validate stock and prices
        const validatedItems: OrderItem[] = [];
        let subtotal = 0;

        for (const item of items) {
          const product = products.find(p => p.id === item.productId);
          if (!product) {
            throw new Error(`Product ${item.productId} not found`);
          }

          if (!product.inStock || product.stockQuantity < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stockQuantity}`);
          }

          // Use current product price (not cart price for security)
          const currentPrice = product.price.toNumber();
          const itemTotal = currentPrice * item.quantity;
          subtotal += itemTotal;

          validatedItems.push({
            productId: item.productId,
            quantity: item.quantity,
            price: currentPrice,
            product: {
              name: product.name,
              image: product.image || '',
              sku: product.sku || '',
            },
          });

          // Reserve stock
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                decrement: item.quantity,
              },
            },
          });
        }

        // Calculate costs
        let discount = 0;
        
        // Apply coupon if provided
        if (couponCode) {
          const coupon = await prisma.coupon.findFirst({
            where: {
              code: couponCode,
              isActive: true,
              validFrom: { lte: new Date() },
              validTo: { gte: new Date() },
            },
          });

          if (coupon) {
            if (coupon.type === 'PERCENTAGE') {
              discount = (subtotal * coupon.value.toNumber()) / 100;
            } else if (coupon.type === 'FIXED_AMOUNT') {
              discount = coupon.value.toNumber();
            }

            // Ensure discount doesn't exceed subtotal
            discount = Math.min(discount, subtotal);

            // Update coupon usage
            await prisma.coupon.update({
              where: { id: coupon.id },
              data: {
                usedCount: { increment: 1 },
              },
            });
          }
        }

        const discountedSubtotal = subtotal - discount;
        const tax = discountedSubtotal * 0.12; // 12% VAT
        const shipping = this.calculateShipping(discountedSubtotal, shippingAddress.region);
        const total = discountedSubtotal + tax + shipping;

        // Generate order number
        const orderNumber = await this.generateOrderNumber();

        // Create order
        const createdOrder = await prisma.order.create({
          data: {
            userId,
            orderNumber,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            subtotal,
            tax,
            shipping,
            discount,
            total,
            paymentMethod,
            shippingAddress: shippingAddress as any,
            notes,
            items: {
              createMany: {
                data: validatedItems.map(item => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  price: item.price,
                })),
              },
            },
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    image: true,
                    sku: true,
                  },
                },
              },
            },
          },
        });

        // Clear user's cart after successful order creation
        await prisma.cartItem.deleteMany({
          where: { userId },
        });

        // Create order history entry
        await prisma.orderStatusHistory.create({
          data: {
            orderId: createdOrder.id,
            status: OrderStatus.PENDING,
            notes: 'Order created',
            createdBy: userId,
          },
        });

        // Send order confirmation notification
        await this.createOrderNotification(
          createdOrder.id,
          userId,
          'ORDER_CREATED',
          `Buyurtma #${orderNumber} yaratildi`
        );

        logger.info('Order created successfully', {
          orderId: createdOrder.id,
          orderNumber,
          userId,
          total,
          itemsCount: validatedItems.length,
        });

        return this.mapPrismaOrderToOrder(createdOrder);
      });

      return order;
    } catch (error) {
      logger.error('Failed to create order', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId,
        itemsCount: request.items.length,
      });
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string, userId?: string): Promise<Order | null> {
    try {
      const whereClause: any = { id: orderId };
      if (userId) {
        whereClause.userId = userId;
      }

      const order = await this.db.order.findUnique({
        where: whereClause,
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  image: true,
                  sku: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        return null;
      }

      return this.mapPrismaOrderToOrder(order);
    } catch (error) {
      logger.error('Failed to get order', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get user's orders with pagination
   */
  async getUserOrders(
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: OrderStatus
  ): Promise<{
    orders: Order[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const whereClause: any = { userId };
      
      if (status) {
        whereClause.status = status;
      }

      const [orders, total] = await Promise.all([
        this.db.order.findMany({
          where: whereClause,
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    image: true,
                    sku: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.db.order.count({ where: whereClause }),
      ]);

      const mappedOrders = orders.map(order => this.mapPrismaOrderToOrder(order));

      return {
        orders: mappedOrders,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error) {
      logger.error('Failed to get user orders', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        page,
        limit,
        status,
      });
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    notes?: string,
    updatedBy?: string
  ): Promise<Order> {
    try {
      const order = await this.db.$transaction(async (prisma) => {
        // Get current order
        const currentOrder = await prisma.order.findUnique({
          where: { id: orderId },
        });

        if (!currentOrder) {
          throw new Error('Order not found');
        }

        // Validate status transition
        if (!this.isValidStatusTransition(currentOrder.status as OrderStatus, newStatus)) {
          throw new Error(`Invalid status transition from ${currentOrder.status} to ${newStatus}`);
        }

        // Update order status
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: newStatus,
            updatedAt: new Date(),
            ...(newStatus === OrderStatus.SHIPPED && {
              shippedAt: new Date(),
              trackingNumber: await this.generateTrackingNumber(),
            }),
            ...(newStatus === OrderStatus.DELIVERED && {
              deliveredAt: new Date(),
            }),
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    image: true,
                    sku: true,
                  },
                },
              },
            },
          },
        });

        // Create status history entry
        await prisma.orderStatusHistory.create({
          data: {
            orderId,
            status: newStatus,
            notes: notes || `Status updated to ${newStatus}`,
            createdBy: updatedBy,
          },
        });

        // Handle stock return for cancelled orders
        if (newStatus === OrderStatus.CANCELLED) {
          for (const item of updatedOrder.items) {
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: {
                  increment: item.quantity,
                },
              },
            });
          }
        }

        // Send status update notification
        await this.createOrderNotification(
          orderId,
          updatedOrder.userId,
          'ORDER_STATUS_UPDATED',
          `Buyurtma #${updatedOrder.orderNumber} holati o'zgartirildi: ${this.getStatusText(newStatus)}`
        );

        return updatedOrder;
      });

      logger.info('Order status updated', {
        orderId,
        newStatus,
        notes,
        updatedBy,
      });

      return this.mapPrismaOrderToOrder(order);
    } catch (error) {
      logger.error('Failed to update order status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
        newStatus,
      });
      throw error;
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
    transactionId?: string
  ): Promise<void> {
    try {
      await this.db.order.update({
        where: { id: orderId },
        data: {
          paymentStatus,
          paidAt: paymentStatus === PaymentStatus.PAID ? new Date() : undefined,
          paymentTransactionId: transactionId,
          updatedAt: new Date(),
        },
      });

      // Auto-confirm order if payment is successful
      if (paymentStatus === PaymentStatus.PAID) {
        await this.updateOrderStatus(orderId, OrderStatus.CONFIRMED, 'Payment confirmed', 'system');
      }

      logger.info('Payment status updated', {
        orderId,
        paymentStatus,
        transactionId,
      });
    } catch (error) {
      logger.error('Failed to update payment status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
        paymentStatus,
      });
      throw error;
    }
  }

  /**
   * Calculate shipping cost based on subtotal and region
   */
  private calculateShipping(subtotal: number, region: string): number {
    // Free shipping for orders over 500,000 som
    if (subtotal >= 500000) {
      return 0;
    }

    // Regional shipping rates
    const shippingRates: { [key: string]: number } = {
      'Toshkent shahri': 25000,
      'Toshkent viloyati': 35000,
      'Samarqand': 45000,
      'Buxoro': 50000,
      'Andijon': 55000,
      'Farg\'ona': 55000,
      'Namangan': 55000,
      'Qashqadaryo': 60000,
      'Surxondaryo': 65000,
      'Jizzax': 40000,
      'Sirdaryo': 35000,
      'Navoiy': 50000,
      'Xorazm': 70000,
      'Qoraqalpog\'iston': 75000,
    };

    return shippingRates[region] || 50000; // Default shipping rate
  }

  /**
   * Generate unique order number
   */
  private async generateOrderNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    
    // Get today's order count
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    const todayOrderCount = await this.db.order.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    const orderSequence = (todayOrderCount + 1).toString().padStart(4, '0');
    
    return `UM${year}${month}${day}${orderSequence}`;
  }

  /**
   * Generate tracking number
   */
  private async generateTrackingNumber(): Promise<string> {
    const prefix = 'UMT';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Validate status transition
   */
  private isValidStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    const validTransitions: { [key in OrderStatus]: OrderStatus[] } = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
      [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.RETURNED]: [],
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Get localized status text
   */
  private getStatusText(status: OrderStatus): string {
    const statusTexts: { [key in OrderStatus]: string } = {
      [OrderStatus.PENDING]: 'Kutilmoqda',
      [OrderStatus.CONFIRMED]: 'Tasdiqlangan',
      [OrderStatus.PROCESSING]: 'Tayyorlanmoqda',
      [OrderStatus.SHIPPED]: 'Jo\'natilgan',
      [OrderStatus.DELIVERED]: 'Yetkazilgan',
      [OrderStatus.CANCELLED]: 'Bekor qilingan',
      [OrderStatus.RETURNED]: 'Qaytarilgan',
    };

    return statusTexts[status] || status;
  }

  /**
   * Create order notification
   */
  private async createOrderNotification(
    orderId: string,
    userId: string,
    type: string,
    message: string
  ): Promise<void> {
    try {
      await this.db.notification.create({
        data: {
          userId,
          title: 'Buyurtma yangiligi',
          message,
          type,
          relatedId: orderId,
          isRead: false,
        },
      });
    } catch (error) {
      logger.warn('Failed to create order notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
        userId,
        type,
      });
    }
  }

  /**
   * Map Prisma order to Order interface
   */
  private mapPrismaOrderToOrder(prismaOrder: any): Order {
    return {
      id: prismaOrder.id,
      userId: prismaOrder.userId,
      orderNumber: prismaOrder.orderNumber,
      status: prismaOrder.status,
      items: prismaOrder.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price.toNumber(),
        product: item.product,
      })),
      subtotal: prismaOrder.subtotal.toNumber(),
      tax: prismaOrder.tax.toNumber(),
      shipping: prismaOrder.shipping.toNumber(),
      discount: prismaOrder.discount.toNumber(),
      total: prismaOrder.total.toNumber(),
      shippingAddress: prismaOrder.shippingAddress,
      paymentMethod: prismaOrder.paymentMethod,
      paymentStatus: prismaOrder.paymentStatus,
      trackingNumber: prismaOrder.trackingNumber,
      estimatedDelivery: prismaOrder.estimatedDelivery,
      createdAt: prismaOrder.createdAt,
      updatedAt: prismaOrder.updatedAt,
    };
  }
}