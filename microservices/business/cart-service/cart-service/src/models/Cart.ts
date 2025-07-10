import Redis from 'ioredis';
import { logger } from '@ultramarket/common';
import { createError } from '@ultramarket/common';

export interface CartItem {
  productId: string;
  productName: string;
  sku: string;
  price: number;
  quantity: number;
  image: string;
  attributes?: Record<string, string>; // size, color, etc.
  addedAt: Date;
  updatedAt: Date;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  estimatedShipping: number;
  estimatedTax: number;
  estimatedTotal: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface CartSummary {
  totalItems: number;
  subtotal: number;
  estimatedShipping: number;
  estimatedTax: number;
  estimatedTotal: number;
  currency: string;
}

export class CartService {
  private redis: Redis;
  private defaultTTL = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });
  }

  /**
   * Get cart for user
   */
  async getCart(userId: string): Promise<Cart | null> {
    try {
      const cartKey = this.getCartKey(userId);
      const cartData = await this.redis.get(cartKey);
      
      if (!cartData) {
        return null;
      }

      const cart = JSON.parse(cartData) as Cart;
      
      // Convert date strings back to Date objects
      cart.createdAt = new Date(cart.createdAt);
      cart.updatedAt = new Date(cart.updatedAt);
      cart.expiresAt = cart.expiresAt ? new Date(cart.expiresAt) : undefined;
      
      cart.items.forEach(item => {
        item.addedAt = new Date(item.addedAt);
        item.updatedAt = new Date(item.updatedAt);
      });

      return cart;
    } catch (error) {
      logger.error('Failed to get cart:', error);
      throw createError(500, 'Failed to retrieve cart');
    }
  }

  /**
   * Create or update cart
   */
  async saveCart(cart: Cart): Promise<void> {
    try {
      const cartKey = this.getCartKey(cart.userId);
      cart.updatedAt = new Date();
      
      await this.redis.setex(
        cartKey, 
        this.defaultTTL, 
        JSON.stringify(cart)
      );

      logger.debug('Cart saved successfully', { userId: cart.userId });
    } catch (error) {
      logger.error('Failed to save cart:', error);
      throw createError(500, 'Failed to save cart');
    }
  }

  /**
   * Add item to cart
   */
  async addItem(userId: string, item: Omit<CartItem, 'addedAt' | 'updatedAt'>): Promise<Cart> {
    try {
      let cart = await this.getCart(userId);
      
      if (!cart) {
        cart = this.createEmptyCart(userId);
      }

      // Check if item already exists
      const existingItemIndex = cart.items.findIndex(
        cartItem => cartItem.productId === item.productId && 
        JSON.stringify(cartItem.attributes || {}) === JSON.stringify(item.attributes || {})
      );

      const now = new Date();

      if (existingItemIndex >= 0) {
        // Update existing item quantity
        cart.items[existingItemIndex].quantity += item.quantity;
        cart.items[existingItemIndex].updatedAt = now;
      } else {
        // Add new item
        cart.items.push({
          ...item,
          addedAt: now,
          updatedAt: now
        });
      }

      // Recalculate totals
      cart = this.recalculateCart(cart);
      
      await this.saveCart(cart);
      
      // Emit cart updated event
      this.emitCartEvent('cart.item.added', userId, {
        productId: item.productId,
        quantity: item.quantity
      });

      return cart;
    } catch (error) {
      logger.error('Failed to add item to cart:', error);
      throw error;
    }
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(
    userId: string, 
    productId: string, 
    quantity: number,
    attributes?: Record<string, string>
  ): Promise<Cart> {
    try {
      const cart = await this.getCart(userId);
      
      if (!cart) {
        throw createError(404, 'Cart not found');
      }

      const itemIndex = cart.items.findIndex(
        item => item.productId === productId && 
        JSON.stringify(item.attributes || {}) === JSON.stringify(attributes || {})
      );

      if (itemIndex === -1) {
        throw createError(404, 'Item not found in cart');
      }

      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        cart.items.splice(itemIndex, 1);
      } else {
        // Update quantity
        cart.items[itemIndex].quantity = quantity;
        cart.items[itemIndex].updatedAt = new Date();
      }

      // Recalculate totals
      const updatedCart = this.recalculateCart(cart);
      await this.saveCart(updatedCart);

      this.emitCartEvent('cart.item.updated', userId, {
        productId,
        quantity
      });

      return updatedCart;
    } catch (error) {
      logger.error('Failed to update item quantity:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeItem(
    userId: string, 
    productId: string,
    attributes?: Record<string, string>
  ): Promise<Cart> {
    try {
      const cart = await this.getCart(userId);
      
      if (!cart) {
        throw createError(404, 'Cart not found');
      }

      const initialLength = cart.items.length;
      cart.items = cart.items.filter(
        item => !(item.productId === productId && 
        JSON.stringify(item.attributes || {}) === JSON.stringify(attributes || {}))
      );

      if (cart.items.length === initialLength) {
        throw createError(404, 'Item not found in cart');
      }

      // Recalculate totals
      const updatedCart = this.recalculateCart(cart);
      await this.saveCart(updatedCart);

      this.emitCartEvent('cart.item.removed', userId, {
        productId
      });

      return updatedCart;
    } catch (error) {
      logger.error('Failed to remove item from cart:', error);
      throw error;
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart(userId: string): Promise<void> {
    try {
      const cartKey = this.getCartKey(userId);
      await this.redis.del(cartKey);

      this.emitCartEvent('cart.cleared', userId, {});

      logger.debug('Cart cleared successfully', { userId });
    } catch (error) {
      logger.error('Failed to clear cart:', error);
      throw createError(500, 'Failed to clear cart');
    }
  }

  /**
   * Get cart summary
   */
  async getCartSummary(userId: string): Promise<CartSummary | null> {
    try {
      const cart = await this.getCart(userId);
      
      if (!cart) {
        return null;
      }

      return {
        totalItems: cart.totalItems,
        subtotal: cart.subtotal,
        estimatedShipping: cart.estimatedShipping,
        estimatedTax: cart.estimatedTax,
        estimatedTotal: cart.estimatedTotal,
        currency: cart.currency
      };
    } catch (error) {
      logger.error('Failed to get cart summary:', error);
      throw createError(500, 'Failed to get cart summary');
    }
  }

  /**
   * Merge guest cart with user cart
   */
  async mergeGuestCart(userId: string, guestCartItems: CartItem[]): Promise<Cart> {
    try {
      let userCart = await this.getCart(userId);
      
      if (!userCart) {
        userCart = this.createEmptyCart(userId);
      }

      // Merge items
      for (const guestItem of guestCartItems) {
        const existingItemIndex = userCart.items.findIndex(
          item => item.productId === guestItem.productId &&
          JSON.stringify(item.attributes || {}) === JSON.stringify(guestItem.attributes || {})
        );

        if (existingItemIndex >= 0) {
          // Combine quantities
          userCart.items[existingItemIndex].quantity += guestItem.quantity;
          userCart.items[existingItemIndex].updatedAt = new Date();
        } else {
          // Add guest item
          userCart.items.push({
            ...guestItem,
            addedAt: new Date(),
            updatedAt: new Date()
          });
        }
      }

      // Recalculate and save
      const mergedCart = this.recalculateCart(userCart);
      await this.saveCart(mergedCart);

      this.emitCartEvent('cart.merged', userId, {
        guestItemsCount: guestCartItems.length
      });

      return mergedCart;
    } catch (error) {
      logger.error('Failed to merge guest cart:', error);
      throw error;
    }
  }

  /**
   * Validate cart items (check availability, prices)
   */
  async validateCart(userId: string): Promise<{ isValid: boolean; issues: string[] }> {
    try {
      const cart = await this.getCart(userId);
      
      if (!cart || cart.items.length === 0) {
        return { isValid: true, issues: [] };
      }

      const issues: string[] = [];
      
      // This would typically call product service to validate
      // For now, we'll do basic validation
      for (const item of cart.items) {
        if (item.quantity <= 0) {
          issues.push(`Invalid quantity for ${item.productName}`);
        }
        
        if (item.price <= 0) {
          issues.push(`Invalid price for ${item.productName}`);
        }
      }

      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      logger.error('Failed to validate cart:', error);
      throw createError(500, 'Failed to validate cart');
    }
  }

  /**
   * Apply coupon to cart
   */
  async applyCoupon(userId: string, couponCode: string): Promise<Cart> {
    try {
      const cart = await this.getCart(userId);
      
      if (!cart) {
        throw createError(404, 'Cart not found');
      }

      // This would typically call a coupon service
      // For now, we'll simulate a 10% discount
      const discount = cart.subtotal * 0.1;
      
      // Store coupon info in cart metadata
      (cart as any).appliedCoupon = {
        code: couponCode,
        discount,
        appliedAt: new Date()
      };

      const updatedCart = this.recalculateCart(cart, discount);
      await this.saveCart(updatedCart);

      this.emitCartEvent('cart.coupon.applied', userId, {
        couponCode,
        discount
      });

      return updatedCart;
    } catch (error) {
      logger.error('Failed to apply coupon:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private getCartKey(userId: string): string {
    return `cart:${userId}`;
  }

  private createEmptyCart(userId: string): Cart {
    const now = new Date();
    return {
      userId,
      items: [],
      totalItems: 0,
      subtotal: 0,
      estimatedShipping: 0,
      estimatedTax: 0,
      estimatedTotal: 0,
      currency: 'USD',
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + this.defaultTTL * 1000)
    };
  }

  private recalculateCart(cart: Cart, discount: number = 0): Cart {
    // Calculate subtotal and total items
    cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    // Calculate estimated shipping (simplified logic)
    cart.estimatedShipping = cart.subtotal > 50 ? 0 : 9.99;

    // Calculate estimated tax (simplified 8.5% tax rate)
    cart.estimatedTax = cart.subtotal * 0.085;

    // Calculate total
    cart.estimatedTotal = cart.subtotal + cart.estimatedShipping + cart.estimatedTax - discount;

    cart.updatedAt = new Date();

    return cart;
  }

  private emitCartEvent(event: string, userId: string, data: any): void {
    // This would typically publish to message queue (Kafka, RabbitMQ)
    logger.info('Cart event emitted', { event, userId, data });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      logger.error('Cart service health check failed:', error);
      return false;
    }
  }

  /**
   * Cleanup expired carts
   */
  async cleanupExpiredCarts(): Promise<number> {
    try {
      const pattern = 'cart:*';
      const keys = await this.redis.keys(pattern);
      let cleanedCount = 0;

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl <= 0) {
          await this.redis.del(key);
          cleanedCount++;
        }
      }

      logger.info('Expired carts cleaned up', { count: cleanedCount });
      return cleanedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired carts:', error);
      return 0;
    }
  }
}

export const cartService = new CartService();