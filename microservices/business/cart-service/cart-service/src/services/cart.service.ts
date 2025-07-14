import { PrismaClient, Cart, CartItem, SavedItem, CartStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../utils/logger';
import { CartNotFoundError, InvalidQuantityError, ProductNotAvailableError, CartValidationError } from '../utils/errors';

const prisma = new PrismaClient();

export interface AddToCartData {
  userId: string;
  sessionId?: string;
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  price: number;
  comparePrice?: number;
  quantity: number;
  maxQuantity?: number;
  weight?: number;
  dimensions?: Record<string, any>;
  image?: string;
  attributes?: Record<string, any>;
  isAvailable?: boolean;
  availabilityMessage?: string;
}

export interface UpdateCartItemData {
  quantity: number;
  isAvailable?: boolean;
  availabilityMessage?: string;
}

export interface CartCalculation {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  shippingAmount: number;
  totalAmount: number;
}

export interface CartWithItems extends Cart {
  items: CartItem[];
  savedForLater: SavedItem[];
}

export class CartService {
  
  /**
   * Get or create cart for user/session
   */
  async getOrCreateCart(userId: string, sessionId?: string): Promise<CartWithItems> {
    try {
      logger.info('Getting or creating cart', { userId, sessionId });

      // First try to find existing cart
      let cart = await prisma.cart.findFirst({
        where: userId ? { userId } : { sessionId },
        include: {
          items: {
            orderBy: { createdAt: 'desc' }
          },
          savedForLater: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      // Create new cart if not found
      if (!cart) {
        cart = await prisma.cart.create({
          data: {
            userId: userId,
            sessionId: sessionId,
            status: 'ACTIVE',
            currency: 'UZS',
            subtotal: new Decimal(0),
            taxAmount: new Decimal(0),
            discountAmount: new Decimal(0),
            shippingAmount: new Decimal(0),
            totalAmount: new Decimal(0),
            expiresAt: sessionId ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null, // 7 days for session carts
          },
          include: {
            items: true,
            savedForLater: true
          }
        });

        logger.info('New cart created', { cartId: cart.id, userId, sessionId });
      }

      return cart;
    } catch (error) {
      logger.error('Error getting or creating cart:', error);
      throw error;
    }
  }

  /**
   * Add item to cart
   */
  async addToCart(data: AddToCartData): Promise<CartWithItems> {
    try {
      logger.info('Adding item to cart', { 
        userId: data.userId, 
        productId: data.productId, 
        quantity: data.quantity 
      });

      // Validate quantity
      if (data.quantity <= 0) {
        throw new InvalidQuantityError('Quantity must be greater than 0');
      }

      if (data.maxQuantity && data.quantity > data.maxQuantity) {
        throw new InvalidQuantityError(`Quantity cannot exceed ${data.maxQuantity}`);
      }

      // Get or create cart
      const cart = await this.getOrCreateCart(data.userId, data.sessionId);

      // Check if item already exists in cart
      const existingItem = await prisma.cartItem.findUnique({
        where: {
          cartId_productId_variantId: {
            cartId: cart.id,
            productId: data.productId,
            variantId: data.variantId || ''
          }
        }
      });

      let cartItem: CartItem;

      if (existingItem) {
        // Update existing item quantity
        const newQuantity = existingItem.quantity + data.quantity;
        
        if (data.maxQuantity && newQuantity > data.maxQuantity) {
          throw new InvalidQuantityError(`Total quantity cannot exceed ${data.maxQuantity}`);
        }

        cartItem = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { 
            quantity: newQuantity,
            price: new Decimal(data.price),
            comparePrice: data.comparePrice ? new Decimal(data.comparePrice) : null,
            isAvailable: data.isAvailable ?? true,
            availabilityMessage: data.availabilityMessage,
            updatedAt: new Date()
          }
        });

        logger.info('Cart item updated', { itemId: cartItem.id, newQuantity });
      } else {
        // Create new cart item
        cartItem = await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: data.productId,
            variantId: data.variantId,
            name: data.name,
            sku: data.sku,
            price: new Decimal(data.price),
            comparePrice: data.comparePrice ? new Decimal(data.comparePrice) : null,
            quantity: data.quantity,
            maxQuantity: data.maxQuantity,
            weight: data.weight ? new Decimal(data.weight) : null,
            dimensions: data.dimensions,
            image: data.image,
            attributes: data.attributes,
            isAvailable: data.isAvailable ?? true,
            availabilityMessage: data.availabilityMessage
          }
        });

        logger.info('New cart item created', { itemId: cartItem.id, productId: data.productId });
      }

      // Recalculate cart totals
      await this.recalculateCart(cart.id);

      // Return updated cart
      return await this.getCartById(cart.id);
    } catch (error) {
      logger.error('Error adding item to cart:', error);
      throw error;
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(cartId: string, itemId: string, data: UpdateCartItemData): Promise<CartWithItems> {
    try {
      logger.info('Updating cart item', { cartId, itemId, quantity: data.quantity });

      // Validate quantity
      if (data.quantity < 0) {
        throw new InvalidQuantityError('Quantity cannot be negative');
      }

      // Find cart item
      const cartItem = await prisma.cartItem.findFirst({
        where: { id: itemId, cartId }
      });

      if (!cartItem) {
        throw new CartNotFoundError('Cart item not found');
      }

      if (data.quantity === 0) {
        // Remove item if quantity is 0
        await prisma.cartItem.delete({
          where: { id: itemId }
        });

        logger.info('Cart item removed', { itemId });
      } else {
        // Check max quantity
        if (cartItem.maxQuantity && data.quantity > cartItem.maxQuantity) {
          throw new InvalidQuantityError(`Quantity cannot exceed ${cartItem.maxQuantity}`);
        }

        // Update item
        await prisma.cartItem.update({
          where: { id: itemId },
          data: {
            quantity: data.quantity,
            isAvailable: data.isAvailable,
            availabilityMessage: data.availabilityMessage,
            updatedAt: new Date()
          }
        });

        logger.info('Cart item updated', { itemId, quantity: data.quantity });
      }

      // Recalculate cart totals
      await this.recalculateCart(cartId);

      // Return updated cart
      return await this.getCartById(cartId);
    } catch (error) {
      logger.error('Error updating cart item:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(cartId: string, itemId: string): Promise<CartWithItems> {
    try {
      logger.info('Removing item from cart', { cartId, itemId });

      // Check if item exists
      const cartItem = await prisma.cartItem.findFirst({
        where: { id: itemId, cartId }
      });

      if (!cartItem) {
        throw new CartNotFoundError('Cart item not found');
      }

      // Remove item
      await prisma.cartItem.delete({
        where: { id: itemId }
      });

      logger.info('Cart item removed', { itemId });

      // Recalculate cart totals
      await this.recalculateCart(cartId);

      // Return updated cart
      return await this.getCartById(cartId);
    } catch (error) {
      logger.error('Error removing item from cart:', error);
      throw error;
    }
  }

  /**
   * Save item for later
   */
  async saveForLater(cartId: string, itemId: string): Promise<CartWithItems> {
    try {
      logger.info('Saving item for later', { cartId, itemId });

      // Find cart item
      const cartItem = await prisma.cartItem.findFirst({
        where: { id: itemId, cartId }
      });

      if (!cartItem) {
        throw new CartNotFoundError('Cart item not found');
      }

      // Create saved item
      await prisma.savedItem.create({
        data: {
          cartId: cartItem.cartId,
          productId: cartItem.productId,
          variantId: cartItem.variantId,
          name: cartItem.name,
          sku: cartItem.sku,
          price: cartItem.price,
          comparePrice: cartItem.comparePrice,
          weight: cartItem.weight,
          dimensions: cartItem.dimensions,
          image: cartItem.image,
          attributes: cartItem.attributes,
          isAvailable: cartItem.isAvailable,
          availabilityMessage: cartItem.availabilityMessage
        }
      });

      // Remove from cart
      await prisma.cartItem.delete({
        where: { id: itemId }
      });

      logger.info('Item saved for later', { itemId });

      // Recalculate cart totals
      await this.recalculateCart(cartId);

      // Return updated cart
      return await this.getCartById(cartId);
    } catch (error) {
      logger.error('Error saving item for later:', error);
      throw error;
    }
  }

  /**
   * Move item from saved to cart
   */
  async moveToCart(cartId: string, savedItemId: string, quantity: number = 1): Promise<CartWithItems> {
    try {
      logger.info('Moving saved item to cart', { cartId, savedItemId, quantity });

      // Find saved item
      const savedItem = await prisma.savedItem.findFirst({
        where: { id: savedItemId, cartId }
      });

      if (!savedItem) {
        throw new CartNotFoundError('Saved item not found');
      }

      // Add to cart
      await this.addToCart({
        userId: '', // Will be determined by cart
        productId: savedItem.productId,
        variantId: savedItem.variantId || undefined,
        name: savedItem.name,
        sku: savedItem.sku,
        price: savedItem.price.toNumber(),
        comparePrice: savedItem.comparePrice?.toNumber(),
        quantity: quantity,
        weight: savedItem.weight?.toNumber(),
        dimensions: savedItem.dimensions as Record<string, any>,
        image: savedItem.image || undefined,
        attributes: savedItem.attributes as Record<string, any>,
        isAvailable: savedItem.isAvailable,
        availabilityMessage: savedItem.availabilityMessage || undefined
      });

      // Remove from saved items
      await prisma.savedItem.delete({
        where: { id: savedItemId }
      });

      logger.info('Saved item moved to cart', { savedItemId });

      // Return updated cart
      return await this.getCartById(cartId);
    } catch (error) {
      logger.error('Error moving saved item to cart:', error);
      throw error;
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart(cartId: string): Promise<CartWithItems> {
    try {
      logger.info('Clearing cart', { cartId });

      // Remove all cart items
      await prisma.cartItem.deleteMany({
        where: { cartId }
      });

      // Reset cart totals
      await prisma.cart.update({
        where: { id: cartId },
        data: {
          subtotal: new Decimal(0),
          taxAmount: new Decimal(0),
          discountAmount: new Decimal(0),
          shippingAmount: new Decimal(0),
          totalAmount: new Decimal(0),
          appliedCoupons: [],
          updatedAt: new Date()
        }
      });

      logger.info('Cart cleared', { cartId });

      return await this.getCartById(cartId);
    } catch (error) {
      logger.error('Error clearing cart:', error);
      throw error;
    }
  }

  /**
   * Apply coupon to cart
   */
  async applyCoupon(cartId: string, couponCode: string): Promise<CartWithItems> {
    try {
      logger.info('Applying coupon to cart', { cartId, couponCode });

      // Get cart
      const cart = await this.getCartById(cartId);
      
      if (!cart) {
        throw new CartNotFoundError('Cart not found');
      }

      // Check if coupon already applied
      if (cart.appliedCoupons.includes(couponCode)) {
        throw new CartValidationError('Coupon already applied');
      }

      // TODO: Validate coupon with coupon service
      // For now, we'll just add it to the list
      const updatedCoupons = [...cart.appliedCoupons, couponCode];

      await prisma.cart.update({
        where: { id: cartId },
        data: {
          appliedCoupons: updatedCoupons,
          updatedAt: new Date()
        }
      });

      // Recalculate cart with coupon
      await this.recalculateCart(cartId);

      logger.info('Coupon applied', { cartId, couponCode });

      return await this.getCartById(cartId);
    } catch (error) {
      logger.error('Error applying coupon:', error);
      throw error;
    }
  }

  /**
   * Get cart by ID
   */
  async getCartById(cartId: string): Promise<CartWithItems> {
    try {
      const cart = await prisma.cart.findUnique({
        where: { id: cartId },
        include: {
          items: {
            orderBy: { createdAt: 'desc' }
          },
          savedForLater: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!cart) {
        throw new CartNotFoundError('Cart not found');
      }

      return cart;
    } catch (error) {
      logger.error('Error getting cart by ID:', error);
      throw error;
    }
  }

  /**
   * Get cart by user ID
   */
  async getCartByUserId(userId: string): Promise<CartWithItems | null> {
    try {
      const cart = await prisma.cart.findFirst({
        where: { userId },
        include: {
          items: {
            orderBy: { createdAt: 'desc' }
          },
          savedForLater: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      return cart;
    } catch (error) {
      logger.error('Error getting cart by user ID:', error);
      throw error;
    }
  }

  /**
   * Recalculate cart totals
   */
  private async recalculateCart(cartId: string): Promise<void> {
    try {
      const cart = await prisma.cart.findUnique({
        where: { id: cartId },
        include: { items: true }
      });

      if (!cart) {
        throw new CartNotFoundError('Cart not found');
      }

      // Calculate subtotal
      const subtotal = cart.items.reduce((sum, item) => {
        return sum + (item.price.toNumber() * item.quantity);
      }, 0);

      // Calculate tax (15% VAT for Uzbekistan)
      const taxRate = 0.15;
      const taxAmount = subtotal * taxRate;

      // Calculate discount (based on coupons)
      let discountAmount = 0;
      // TODO: Implement real coupon calculations

      // Calculate shipping
      const freeShippingThreshold = 200000; // 200,000 UZS
      const shippingAmount = subtotal >= freeShippingThreshold ? 0 : 20000; // 20,000 UZS

      // Calculate total
      const totalAmount = subtotal + taxAmount - discountAmount + shippingAmount;

      // Update cart
      await prisma.cart.update({
        where: { id: cartId },
        data: {
          subtotal: new Decimal(subtotal),
          taxAmount: new Decimal(taxAmount),
          discountAmount: new Decimal(discountAmount),
          shippingAmount: new Decimal(shippingAmount),
          totalAmount: new Decimal(totalAmount),
          updatedAt: new Date()
        }
      });

      logger.info('Cart totals recalculated', {
        cartId,
        subtotal,
        taxAmount,
        discountAmount,
        shippingAmount,
        totalAmount
      });
    } catch (error) {
      logger.error('Error recalculating cart:', error);
      throw error;
    }
  }

  /**
   * Merge guest cart with user cart on login
   */
  async mergeGuestCart(sessionId: string, userId: string): Promise<CartWithItems> {
    try {
      logger.info('Merging guest cart with user cart', { sessionId, userId });

      // Find guest cart
      const guestCart = await prisma.cart.findFirst({
        where: { sessionId },
        include: { items: true, savedForLater: true }
      });

      if (!guestCart || guestCart.items.length === 0) {
        // No guest cart or empty, just return user cart
        return await this.getOrCreateCart(userId);
      }

      // Get or create user cart
      const userCart = await this.getOrCreateCart(userId);

      // Move items from guest cart to user cart
      for (const item of guestCart.items) {
        await this.addToCart({
          userId: userId,
          productId: item.productId,
          variantId: item.variantId || undefined,
          name: item.name,
          sku: item.sku,
          price: item.price.toNumber(),
          comparePrice: item.comparePrice?.toNumber(),
          quantity: item.quantity,
          maxQuantity: item.maxQuantity || undefined,
          weight: item.weight?.toNumber(),
          dimensions: item.dimensions as Record<string, any>,
          image: item.image || undefined,
          attributes: item.attributes as Record<string, any>,
          isAvailable: item.isAvailable,
          availabilityMessage: item.availabilityMessage || undefined
        });
      }

      // Delete guest cart
      await prisma.cart.delete({
        where: { id: guestCart.id }
      });

      logger.info('Guest cart merged successfully', { 
        guestCartId: guestCart.id, 
        userCartId: userCart.id,
        itemsMerged: guestCart.items.length
      });

      return await this.getCartById(userCart.id);
    } catch (error) {
      logger.error('Error merging guest cart:', error);
      throw error;
    }
  }

  /**
   * Clean up expired carts
   */
  async cleanupExpiredCarts(): Promise<number> {
    try {
      const result = await prisma.cart.deleteMany({
        where: {
          expiresAt: {
            lte: new Date()
          }
        }
      });

      logger.info('Expired carts cleaned up', { count: result.count });
      return result.count;
    } catch (error) {
      logger.error('Error cleaning up expired carts:', error);
      throw error;
    }
  }

  /**
   * Get cart statistics
   */
  async getCartStatistics(): Promise<{
    totalCarts: number;
    activeCarts: number;
    averageItemsPerCart: number;
    averageCartValue: number;
  }> {
    try {
      const totalCarts = await prisma.cart.count();
      const activeCarts = await prisma.cart.count({
        where: { status: 'ACTIVE' }
      });

      const cartItems = await prisma.cartItem.aggregate({
        _count: { id: true },
        _avg: { quantity: true }
      });

      const cartValues = await prisma.cart.aggregate({
        _avg: { totalAmount: true }
      });

      return {
        totalCarts,
        activeCarts,
        averageItemsPerCart: cartItems._count.id / Math.max(totalCarts, 1),
        averageCartValue: cartValues._avg.totalAmount?.toNumber() || 0
      };
    } catch (error) {
      logger.error('Error getting cart statistics:', error);
      throw error;
    }
  }
}
