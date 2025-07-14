import { Request, Response } from 'express';
import { CartService, AddToCartData, UpdateCartItemData } from '../services/cart.service';
import { logger } from '../utils/logger';
import { CartNotFoundError, InvalidQuantityError, CartValidationError } from '../utils/errors';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
  sessionId?: string;
}

export class CartController {
  private cartService: CartService;

  constructor() {
    this.cartService = new CartService();
  }

  /**
   * Get user's cart
   */
  public getCart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const sessionId = req.sessionId || req.headers['x-session-id'] as string;

      if (!userId && !sessionId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_IDENTIFIER',
            message: 'User ID or session ID is required'
          }
        });
        return;
      }

      logger.info('Getting cart', { userId, sessionId });

      const cart = await this.cartService.getOrCreateCart(userId || '', sessionId);

      res.json({
        success: true,
        data: {
          cart: {
            id: cart.id,
            userId: cart.userId,
            sessionId: cart.sessionId,
            status: cart.status,
            currency: cart.currency,
            itemCount: cart.items.length,
            savedCount: cart.savedForLater.length,
            totals: {
              subtotal: cart.subtotal.toNumber(),
              taxAmount: cart.taxAmount.toNumber(),
              discountAmount: cart.discountAmount.toNumber(),
              shippingAmount: cart.shippingAmount.toNumber(),
              totalAmount: cart.totalAmount.toNumber()
            },
            appliedCoupons: cart.appliedCoupons,
            items: cart.items.map(item => ({
              id: item.id,
              productId: item.productId,
              variantId: item.variantId,
              name: item.name,
              sku: item.sku,
              price: item.price.toNumber(),
              comparePrice: item.comparePrice?.toNumber(),
              quantity: item.quantity,
              maxQuantity: item.maxQuantity,
              subtotal: item.price.toNumber() * item.quantity,
              weight: item.weight?.toNumber(),
              dimensions: item.dimensions,
              image: item.image,
              attributes: item.attributes,
              isAvailable: item.isAvailable,
              availabilityMessage: item.availabilityMessage,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt
            })),
            savedForLater: cart.savedForLater.map(item => ({
              id: item.id,
              productId: item.productId,
              variantId: item.variantId,
              name: item.name,
              sku: item.sku,
              price: item.price.toNumber(),
              comparePrice: item.comparePrice?.toNumber(),
              weight: item.weight?.toNumber(),
              dimensions: item.dimensions,
              image: item.image,
              attributes: item.attributes,
              isAvailable: item.isAvailable,
              availabilityMessage: item.availabilityMessage,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt
            })),
            expiresAt: cart.expiresAt,
            createdAt: cart.createdAt,
            updatedAt: cart.updatedAt
          }
        },
        message: 'Cart retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting cart:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CART_RETRIEVAL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retrieve cart'
        }
      });
    }
  };

  /**
   * Add item to cart
   */
  public addToCart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const sessionId = req.sessionId || req.headers['x-session-id'] as string;

      if (!userId && !sessionId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_IDENTIFIER',
            message: 'User ID or session ID is required'
          }
        });
        return;
      }

      const {
        productId,
        variantId,
        name,
        sku,
        price,
        comparePrice,
        quantity,
        maxQuantity,
        weight,
        dimensions,
        image,
        attributes,
        isAvailable,
        availabilityMessage
      } = req.body;

      // Validation
      if (!productId || !name || !sku || !price || !quantity) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Product ID, name, sku, price, and quantity are required'
          }
        });
        return;
      }

      if (typeof price !== 'number' || price <= 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PRICE',
            message: 'Price must be a positive number'
          }
        });
        return;
      }

      if (typeof quantity !== 'number' || quantity <= 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUANTITY',
            message: 'Quantity must be a positive number'
          }
        });
        return;
      }

      const addToCartData: AddToCartData = {
        userId: userId || '',
        sessionId,
        productId,
        variantId,
        name,
        sku,
        price,
        comparePrice,
        quantity,
        maxQuantity,
        weight,
        dimensions,
        image,
        attributes,
        isAvailable: isAvailable !== undefined ? isAvailable : true,
        availabilityMessage
      };

      logger.info('Adding item to cart', { userId, sessionId, productId, quantity });

      const cart = await this.cartService.addToCart(addToCartData);

      res.status(201).json({
        success: true,
        data: { cartId: cart.id },
        message: 'Item added to cart successfully'
      });
    } catch (error) {
      logger.error('Error adding item to cart:', error);
      
      if (error instanceof InvalidQuantityError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUANTITY',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'ADD_TO_CART_FAILED',
            message: error instanceof Error ? error.message : 'Failed to add item to cart'
          }
        });
      }
    }
  };

  /**
   * Update cart item quantity
   */
  public updateCartItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { cartId, itemId } = req.params;
      const { quantity, isAvailable, availabilityMessage } = req.body;

      if (!cartId || !itemId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Cart ID and item ID are required'
          }
        });
        return;
      }

      if (quantity === undefined || typeof quantity !== 'number' || quantity < 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUANTITY',
            message: 'Quantity must be a non-negative number'
          }
        });
        return;
      }

      const updateData: UpdateCartItemData = {
        quantity,
        isAvailable,
        availabilityMessage
      };

      logger.info('Updating cart item', { cartId, itemId, quantity });

      const cart = await this.cartService.updateCartItem(cartId, itemId, updateData);

      res.json({
        success: true,
        data: { cartId: cart.id },
        message: quantity === 0 ? 'Item removed from cart successfully' : 'Cart item updated successfully'
      });
    } catch (error) {
      logger.error('Error updating cart item:', error);
      
      if (error instanceof CartNotFoundError) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CART_ITEM_NOT_FOUND',
            message: error.message
          }
        });
      } else if (error instanceof InvalidQuantityError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUANTITY',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'UPDATE_CART_ITEM_FAILED',
            message: error instanceof Error ? error.message : 'Failed to update cart item'
          }
        });
      }
    }
  };

  /**
   * Remove item from cart
   */
  public removeFromCart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { cartId, itemId } = req.params;

      if (!cartId || !itemId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Cart ID and item ID are required'
          }
        });
        return;
      }

      logger.info('Removing item from cart', { cartId, itemId });

      const cart = await this.cartService.removeFromCart(cartId, itemId);

      res.json({
        success: true,
        data: { cartId: cart.id },
        message: 'Item removed from cart successfully'
      });
    } catch (error) {
      logger.error('Error removing item from cart:', error);
      
      if (error instanceof CartNotFoundError) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CART_ITEM_NOT_FOUND',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'REMOVE_FROM_CART_FAILED',
            message: error instanceof Error ? error.message : 'Failed to remove item from cart'
          }
        });
      }
    }
  };

  /**
   * Save item for later
   */
  public saveForLater = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { cartId, itemId } = req.params;

      if (!cartId || !itemId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Cart ID and item ID are required'
          }
        });
        return;
      }

      logger.info('Saving item for later', { cartId, itemId });

      const cart = await this.cartService.saveForLater(cartId, itemId);

      res.json({
        success: true,
        data: { cartId: cart.id },
        message: 'Item saved for later successfully'
      });
    } catch (error) {
      logger.error('Error saving item for later:', error);
      
      if (error instanceof CartNotFoundError) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CART_ITEM_NOT_FOUND',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'SAVE_FOR_LATER_FAILED',
            message: error instanceof Error ? error.message : 'Failed to save item for later'
          }
        });
      }
    }
  };

  /**
   * Move saved item to cart
   */
  public moveToCart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { cartId, savedItemId } = req.params;
      const { quantity = 1 } = req.body;

      if (!cartId || !savedItemId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Cart ID and saved item ID are required'
          }
        });
        return;
      }

      if (typeof quantity !== 'number' || quantity <= 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUANTITY',
            message: 'Quantity must be a positive number'
          }
        });
        return;
      }

      logger.info('Moving saved item to cart', { cartId, savedItemId, quantity });

      const cart = await this.cartService.moveToCart(cartId, savedItemId, quantity);

      res.json({
        success: true,
        data: { cartId: cart.id },
        message: 'Item moved to cart successfully'
      });
    } catch (error) {
      logger.error('Error moving saved item to cart:', error);
      
      if (error instanceof CartNotFoundError) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SAVED_ITEM_NOT_FOUND',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'MOVE_TO_CART_FAILED',
            message: error instanceof Error ? error.message : 'Failed to move item to cart'
          }
        });
      }
    }
  };

  /**
   * Clear entire cart
   */
  public clearCart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { cartId } = req.params;

      if (!cartId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Cart ID is required'
          }
        });
        return;
      }

      logger.info('Clearing cart', { cartId });

      const cart = await this.cartService.clearCart(cartId);

      res.json({
        success: true,
        data: { cartId: cart.id },
        message: 'Cart cleared successfully'
      });
    } catch (error) {
      logger.error('Error clearing cart:', error);
      
      if (error instanceof CartNotFoundError) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CART_NOT_FOUND',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'CLEAR_CART_FAILED',
            message: error instanceof Error ? error.message : 'Failed to clear cart'
          }
        });
      }
    }
  };

  /**
   * Apply coupon to cart
   */
  public applyCoupon = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { cartId } = req.params;
      const { couponCode } = req.body;

      if (!cartId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Cart ID is required'
          }
        });
        return;
      }

      if (!couponCode || typeof couponCode !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_COUPON_CODE',
            message: 'Valid coupon code is required'
          }
        });
        return;
      }

      logger.info('Applying coupon to cart', { cartId, couponCode });

      const cart = await this.cartService.applyCoupon(cartId, couponCode.toUpperCase());

      res.json({
        success: true,
        data: { 
          cartId: cart.id,
          appliedCoupons: cart.appliedCoupons,
          discountAmount: cart.discountAmount.toNumber()
        },
        message: 'Coupon applied successfully'
      });
    } catch (error) {
      logger.error('Error applying coupon:', error);
      
      if (error instanceof CartNotFoundError) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CART_NOT_FOUND',
            message: error.message
          }
        });
      } else if (error instanceof CartValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'COUPON_VALIDATION_FAILED',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'APPLY_COUPON_FAILED',
            message: error instanceof Error ? error.message : 'Failed to apply coupon'
          }
        });
      }
    }
  };

  /**
   * Merge guest cart with user cart
   */
  public mergeGuestCart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { sessionId } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SESSION_ID',
            message: 'Session ID is required'
          }
        });
        return;
      }

      logger.info('Merging guest cart with user cart', { userId, sessionId });

      const cart = await this.cartService.mergeGuestCart(sessionId, userId);

      res.json({
        success: true,
        data: { cartId: cart.id },
        message: 'Guest cart merged successfully'
      });
    } catch (error) {
      logger.error('Error merging guest cart:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'MERGE_CART_FAILED',
          message: error instanceof Error ? error.message : 'Failed to merge guest cart'
        }
      });
    }
  };

  /**
   * Get cart statistics (admin only)
   */
  public getCartStatistics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Check admin permission
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required'
          }
        });
        return;
      }

      logger.info('Getting cart statistics');

      const stats = await this.cartService.getCartStatistics();

      res.json({
        success: true,
        data: { statistics: stats },
        message: 'Cart statistics retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting cart statistics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'STATISTICS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get cart statistics'
        }
      });
    }
  };

  /**
   * Cleanup expired carts (admin only)
   */
  public cleanupExpiredCarts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Check admin permission
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required'
          }
        });
        return;
      }

      logger.info('Cleaning up expired carts');

      const count = await this.cartService.cleanupExpiredCarts();

      res.json({
        success: true,
        data: { deletedCarts: count },
        message: `${count} expired carts cleaned up successfully`
      });
    } catch (error) {
      logger.error('Error cleaning up expired carts:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CLEANUP_FAILED',
          message: error instanceof Error ? error.message : 'Failed to cleanup expired carts'
        }
      });
    }
  };
}
