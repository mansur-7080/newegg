import { Request, Response, NextFunction } from 'express';
import { CartService } from '../services/cart.service';
import { logger } from '../utils/logger';

export class CartController {
  private cartService: CartService;

  constructor() {
    this.cartService = new CartService();
  }

  /**
   * Get user's cart
   */
  getCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      const cart = await this.cartService.getCart(userId);

      res.json({
        success: true,
        data: { cart },
        message: 'Cart retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting cart', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  };

  /**
   * Add item to cart
   */
  addToCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { productId, quantity = 1 } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      const cart = await this.cartService.addToCart(userId, productId, quantity);

      res.json({
        success: true,
        data: { cart },
        message: 'Item added to cart successfully',
      });
    } catch (error) {
      logger.error('Error adding item to cart', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  };

  /**
   * Update cart item quantity
   */
  updateCartItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { productId } = req.params;
      const { quantity } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      const cart = await this.cartService.updateCartItem(userId, productId, quantity);

      res.json({
        success: true,
        data: { cart },
        message: 'Cart item updated successfully',
      });
    } catch (error) {
      logger.error('Error updating cart item', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  };

  /**
   * Remove item from cart
   */
  removeFromCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { productId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      const cart = await this.cartService.removeFromCart(userId, productId);

      res.json({
        success: true,
        data: { cart },
        message: 'Item removed from cart successfully',
      });
    } catch (error) {
      logger.error('Error removing item from cart', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  };

  /**
   * Clear entire cart
   */
  clearCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      await this.cartService.clearCart(userId);

      res.json({
        success: true,
        message: 'Cart cleared successfully',
      });
    } catch (error) {
      logger.error('Error clearing cart', { error: error instanceof Error ? error.message : 'Unknown error' });
      next(error);
    }
  };
}
