import { Cart, ICart, ICartItem } from '../models/Cart';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';

export class CartService {
  private redisClient = getRedisClient();
  private readonly CACHE_TTL = 3600; // 1 hour

  private getCacheKey(userId: string): string {
    return `cart:${userId}`;
  }

  async getCart(userId: string): Promise<ICart | null> {
    try {
      // Try cache first
      const cached = await this.redisClient.get(this.getCacheKey(userId));
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database
      let cart = await Cart.findOne({ userId });
      
      if (!cart) {
        // Create new cart if doesn't exist
        cart = new Cart({ userId, items: [], totalAmount: 0, itemCount: 0 });
        await cart.save();
      }

      // Cache the result
      await this.redisClient.setEx(
        this.getCacheKey(userId),
        this.CACHE_TTL,
        JSON.stringify(cart)
      );

      return cart;
    } catch (error) {
      logger.error('Error getting cart:', error);
      throw error;
    }
  }

  async addItem(userId: string, item: ICartItem): Promise<ICart> {
    try {
      let cart = await this.getCart(userId);
      if (!cart) {
        cart = new Cart({ userId, items: [], totalAmount: 0, itemCount: 0 });
      }

      // Check if item already exists
      const existingItemIndex = cart.items.findIndex(
        cartItem => cartItem.productId === item.productId
      );

      if (existingItemIndex >= 0) {
        // Update quantity
        cart.items[existingItemIndex].quantity += item.quantity;
      } else {
        // Add new item
        cart.items.push(item);
      }

      await cart.save();
      
      // Update cache
      await this.redisClient.setEx(
        this.getCacheKey(userId),
        this.CACHE_TTL,
        JSON.stringify(cart)
      );

      logger.info(`Item added to cart for user ${userId}: ${item.productId}`);
      return cart;
    } catch (error) {
      logger.error('Error adding item to cart:', error);
      throw error;
    }
  }

  async updateItemQuantity(userId: string, productId: string, quantity: number): Promise<ICart> {
    try {
      const cart = await this.getCart(userId);
      if (!cart) {
        throw new Error('Cart not found');
      }

      const itemIndex = cart.items.findIndex(item => item.productId === productId);
      if (itemIndex === -1) {
        throw new Error('Item not found in cart');
      }

      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = quantity;
      }

      await cart.save();
      
      // Update cache
      await this.redisClient.setEx(
        this.getCacheKey(userId),
        this.CACHE_TTL,
        JSON.stringify(cart)
      );

      logger.info(`Cart item quantity updated for user ${userId}: ${productId} -> ${quantity}`);
      return cart;
    } catch (error) {
      logger.error('Error updating item quantity:', error);
      throw error;
    }
  }

  async removeItem(userId: string, productId: string): Promise<ICart> {
    try {
      const cart = await this.getCart(userId);
      if (!cart) {
        throw new Error('Cart not found');
      }

      const itemIndex = cart.items.findIndex(item => item.productId === productId);
      if (itemIndex === -1) {
        throw new Error('Item not found in cart');
      }

      cart.items.splice(itemIndex, 1);
      await cart.save();
      
      // Update cache
      await this.redisClient.setEx(
        this.getCacheKey(userId),
        this.CACHE_TTL,
        JSON.stringify(cart)
      );

      logger.info(`Item removed from cart for user ${userId}: ${productId}`);
      return cart;
    } catch (error) {
      logger.error('Error removing item from cart:', error);
      throw error;
    }
  }

  async clearCart(userId: string): Promise<ICart> {
    try {
      const cart = await this.getCart(userId);
      if (!cart) {
        throw new Error('Cart not found');
      }

      cart.items = [];
      await cart.save();
      
      // Update cache
      await this.redisClient.setEx(
        this.getCacheKey(userId),
        this.CACHE_TTL,
        JSON.stringify(cart)
      );

      logger.info(`Cart cleared for user ${userId}`);
      return cart;
    } catch (error) {
      logger.error('Error clearing cart:', error);
      throw error;
    }
  }

  async invalidateCache(userId: string): Promise<void> {
    try {
      await this.redisClient.del(this.getCacheKey(userId));
      logger.info(`Cache invalidated for user ${userId}`);
    } catch (error) {
      logger.error('Error invalidating cache:', error);
    }
  }
}