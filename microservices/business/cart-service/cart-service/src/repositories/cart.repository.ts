import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Define the types for Cart and CartItem since they're not exported directly from @prisma/client
export interface PrismaCart {
  id: string;
  userId: string;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  items?: PrismaCartItem[];
}

export interface PrismaCartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartRepository {
  findByUserId(userId: string): Promise<PrismaCart | null>;
  create(userId: string): Promise<PrismaCart>;
  addItem(cartId: string, item: Omit<PrismaCartItem, 'id' | 'cartId'>): Promise<PrismaCartItem>;
  updateItemQuantity(cartItemId: string, quantity: number): Promise<PrismaCartItem>;
  removeItem(cartItemId: string): Promise<void>;
  clearCart(cartId: string): Promise<void>;
  getCartWithItems(userId: string): Promise<(PrismaCart & { items: PrismaCartItem[] }) | null>;
}

export class PrismaCartRepository implements CartRepository {
  constructor(private prisma: PrismaClient) {}

  async findByUserId(userId: string): Promise<PrismaCart | null> {
    try {
      return await this.prisma.cart.findUnique({
        where: { userId },
      });
    } catch (error) {
      logger.error('Error finding cart by userId:', error);
      throw error;
    }
  }

  async create(userId: string): Promise<PrismaCart> {
    try {
      return await this.prisma.cart.create({
        data: {
          userId,
          totalAmount: 0,
        },
      });
    } catch (error) {
      logger.error('Error creating cart:', error);
      throw error;
    }
  }

  async addItem(
    cartId: string,
    item: Omit<PrismaCartItem, 'id' | 'cartId'>
  ): Promise<PrismaCartItem> {
    try {
      const { productId, quantity, price } = item;

      return await this.prisma.cartItem.create({
        data: {
          cartId,
          productId,
          quantity,
          price,
        },
      });
    } catch (error) {
      logger.error('Error adding item to cart:', error);
      throw error;
    }
  }

  async updateItemQuantity(cartItemId: string, quantity: number): Promise<PrismaCartItem> {
    try {
      return await this.prisma.cartItem.update({
        where: { id: cartItemId },
        data: { quantity },
      });
    } catch (error) {
      logger.error('Error updating cart item quantity:', error);
      throw error;
    }
  }

  async removeItem(cartItemId: string): Promise<void> {
    try {
      await this.prisma.cartItem.delete({
        where: { id: cartItemId },
      });
    } catch (error) {
      logger.error('Error removing cart item:', error);
      throw error;
    }
  }

  async clearCart(cartId: string): Promise<void> {
    try {
      await this.prisma.cartItem.deleteMany({
        where: { cartId },
      });
    } catch (error) {
      logger.error('Error clearing cart:', error);
      throw error;
    }
  }

  async getCartWithItems(
    userId: string
  ): Promise<(PrismaCart & { items: PrismaCartItem[] }) | null> {
    try {
      return await this.prisma.cart.findUnique({
        where: { userId },
        include: { items: true },
      });
    } catch (error) {
      logger.error('Error getting cart with items:', error);
      throw error;
    }
  }
}

export const createCartRepository = (prisma: PrismaClient): CartRepository => {
  return new PrismaCartRepository(prisma);
};

export default createCartRepository;
