import { PrismaClient } from '@prisma/client';
import { logger } from '../../../../libs/shared/src/logging/logger';

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    price: number;
    stockQuantity: number;
    image: string;
    inStock: boolean;
  };
}

interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AddToCartRequest {
  userId: string;
  productId: string;
  quantity: number;
}

interface UpdateCartItemRequest {
  userId: string;
  productId: string;
  quantity: number;
}

export class RealCartService {
  private db: PrismaClient;

  constructor() {
    this.db = new PrismaClient();
  }

  /**
   * Add item to cart with real validation
   */
  async addToCart(request: AddToCartRequest): Promise<Cart> {
    try {
      const { userId, productId, quantity } = request;

      // Validate input
      if (!userId || !productId || quantity <= 0) {
        throw new Error('Invalid input: userId, productId and positive quantity required');
      }

      if (quantity > 50) {
        throw new Error('Cannot add more than 50 items at once');
      }

      // Verify product exists and is in stock
      const product = await this.db.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          price: true,
          stockQuantity: true,
          inStock: true,
          image: true,
        },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      if (!product.inStock || product.stockQuantity < quantity) {
        throw new Error(`Insufficient stock. Available: ${product.stockQuantity}`);
      }

      // Use database transaction for consistency
      const result = await this.db.$transaction(async (prisma) => {
        // Check if item already exists in cart
        const existingCartItem = await prisma.cartItem.findFirst({
          where: {
            userId,
            productId,
          },
        });

        if (existingCartItem) {
          // Update existing item
          const newQuantity = existingCartItem.quantity + quantity;
          
          // Check total quantity doesn't exceed stock
          if (newQuantity > product.stockQuantity) {
            throw new Error(`Cannot add ${quantity} more items. Stock limit: ${product.stockQuantity}, current in cart: ${existingCartItem.quantity}`);
          }

          if (newQuantity > 50) {
            throw new Error('Cannot have more than 50 of the same item in cart');
          }

          await prisma.cartItem.update({
            where: { id: existingCartItem.id },
            data: {
              quantity: newQuantity,
              price: product.price,
              updatedAt: new Date(),
            },
          });
        } else {
          // Create new cart item
          await prisma.cartItem.create({
            data: {
              userId,
              productId,
              quantity,
              price: product.price,
            },
          });
        }

        // Return updated cart
        return this.getCartByUserId(userId);
      });

      logger.info('Item added to cart successfully', {
        userId,
        productId,
        quantity,
        productName: product.name,
      });

      return result;
    } catch (error) {
      logger.error('Failed to add item to cart', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId,
        productId: request.productId,
        quantity: request.quantity,
      });
      throw error;
    }
  }

  /**
   * Get user's cart with all items
   */
  async getCartByUserId(userId: string): Promise<Cart> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const cartItems = await this.db.cartItem.findMany({
        where: { userId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              stockQuantity: true,
              image: true,
              inStock: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Calculate totals
      let totalItems = 0;
      let totalAmount = 0;

      const items: CartItem[] = cartItems.map((item) => {
        totalItems += item.quantity;
        totalAmount += item.quantity * item.price.toNumber();

        return {
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price.toNumber(),
          product: {
            id: item.product.id,
            name: item.product.name,
            price: item.product.price.toNumber(),
            stockQuantity: item.product.stockQuantity,
            image: item.product.image || '',
            inStock: item.product.inStock,
          },
        };
      });

      const cart: Cart = {
        id: `cart_${userId}`,
        userId,
        items,
        totalItems,
        totalAmount,
        createdAt: cartItems[0]?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      return cart;
    } catch (error) {
      logger.error('Failed to get cart', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(request: UpdateCartItemRequest): Promise<Cart> {
    try {
      const { userId, productId, quantity } = request;

      if (!userId || !productId) {
        throw new Error('User ID and Product ID are required');
      }

      if (quantity < 0) {
        throw new Error('Quantity cannot be negative');
      }

      if (quantity > 50) {
        throw new Error('Cannot have more than 50 of the same item');
      }

      // Find cart item
      const cartItem = await this.db.cartItem.findFirst({
        where: { userId, productId },
        include: {
          product: {
            select: {
              stockQuantity: true,
              inStock: true,
              name: true,
            },
          },
        },
      });

      if (!cartItem) {
        throw new Error('Cart item not found');
      }

      if (quantity === 0) {
        // Remove item from cart
        await this.db.cartItem.delete({
          where: { id: cartItem.id },
        });

        logger.info('Item removed from cart', {
          userId,
          productId,
          productName: cartItem.product.name,
        });
      } else {
        // Validate stock
        if (!cartItem.product.inStock || quantity > cartItem.product.stockQuantity) {
          throw new Error(`Insufficient stock. Available: ${cartItem.product.stockQuantity}`);
        }

        // Update quantity
        await this.db.cartItem.update({
          where: { id: cartItem.id },
          data: {
            quantity,
            updatedAt: new Date(),
          },
        });

        logger.info('Cart item updated', {
          userId,
          productId,
          newQuantity: quantity,
          productName: cartItem.product.name,
        });
      }

      return this.getCartByUserId(userId);
    } catch (error) {
      logger.error('Failed to update cart item', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId,
        productId: request.productId,
        quantity: request.quantity,
      });
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(userId: string, productId: string): Promise<Cart> {
    try {
      if (!userId || !productId) {
        throw new Error('User ID and Product ID are required');
      }

      const cartItem = await this.db.cartItem.findFirst({
        where: { userId, productId },
        include: {
          product: { select: { name: true } },
        },
      });

      if (!cartItem) {
        throw new Error('Cart item not found');
      }

      await this.db.cartItem.delete({
        where: { id: cartItem.id },
      });

      logger.info('Item removed from cart', {
        userId,
        productId,
        productName: cartItem.product.name,
      });

      return this.getCartByUserId(userId);
    } catch (error) {
      logger.error('Failed to remove item from cart', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        productId,
      });
      throw error;
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart(userId: string): Promise<void> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const deleteResult = await this.db.cartItem.deleteMany({
        where: { userId },
      });

      logger.info('Cart cleared', {
        userId,
        itemsRemoved: deleteResult.count,
      });
    } catch (error) {
      logger.error('Failed to clear cart', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * Validate cart before checkout
   */
  async validateCartForCheckout(userId: string): Promise<{
    valid: boolean;
    errors: string[];
    cart: Cart;
  }> {
    try {
      const cart = await this.getCartByUserId(userId);
      const errors: string[] = [];

      if (cart.items.length === 0) {
        errors.push('Cart is empty');
        return { valid: false, errors, cart };
      }

      // Check each item for stock availability
      for (const item of cart.items) {
        if (!item.product.inStock) {
          errors.push(`${item.product.name} is out of stock`);
        } else if (item.quantity > item.product.stockQuantity) {
          errors.push(`${item.product.name}: only ${item.product.stockQuantity} available, but ${item.quantity} in cart`);
        }

        // Check if price has changed
        if (item.price !== item.product.price) {
          errors.push(`${item.product.name}: price has changed from ${item.price} to ${item.product.price}`);
        }
      }

      const valid = errors.length === 0;

      logger.info('Cart validation completed', {
        userId,
        valid,
        errorsCount: errors.length,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
      });

      return { valid, errors, cart };
    } catch (error) {
      logger.error('Cart validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * Get cart summary for quick view
   */
  async getCartSummary(userId: string): Promise<{
    itemCount: number;
    totalAmount: number;
    hasUnavailableItems: boolean;
  }> {
    try {
      const cart = await this.getCartByUserId(userId);
      
      const hasUnavailableItems = cart.items.some(
        (item) => !item.product.inStock || item.quantity > item.product.stockQuantity
      );

      return {
        itemCount: cart.totalItems,
        totalAmount: cart.totalAmount,
        hasUnavailableItems,
      };
    } catch (error) {
      logger.error('Failed to get cart summary', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * Merge carts when user logs in (merge session cart with user cart)
   */
  async mergeCarts(userId: string, sessionCartItems: Array<{
    productId: string;
    quantity: number;
  }>): Promise<Cart> {
    try {
      if (!sessionCartItems || sessionCartItems.length === 0) {
        return this.getCartByUserId(userId);
      }

      // Add each session cart item to user cart
      for (const sessionItem of sessionCartItems) {
        try {
          await this.addToCart({
            userId,
            productId: sessionItem.productId,
            quantity: sessionItem.quantity,
          });
        } catch (error) {
          // Log error but continue with other items
          logger.warn('Failed to merge cart item', {
            userId,
            productId: sessionItem.productId,
            quantity: sessionItem.quantity,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      logger.info('Carts merged successfully', {
        userId,
        sessionItemsCount: sessionCartItems.length,
      });

      return this.getCartByUserId(userId);
    } catch (error) {
      logger.error('Failed to merge carts', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        sessionItemsCount: sessionCartItems.length,
      });
      throw error;
    }
  }
}