import { Router } from 'express';
import { CartController } from '../controllers/cart.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  addToCartSchema,
  updateCartItemSchema,
  removeFromCartSchema,
} from '../validators/cart.validators';

const router = Router();
const cartController = new CartController();

/**
 * @route GET /api/v1/cart
 * @desc Get user's cart
 * @access Private
 */
router.get('/', authMiddleware, cartController.getCart);

/**
 * @route POST /api/v1/cart/items
 * @desc Add item to cart
 * @access Private
 */
router.post('/items', authMiddleware, validateRequest(addToCartSchema), cartController.addToCart);

/**
 * @route PUT /api/v1/cart/items/:productId
 * @desc Update cart item quantity
 * @access Private
 */
router.put('/items/:productId', authMiddleware, validateRequest(updateCartItemSchema), cartController.updateCartItem);

/**
 * @route DELETE /api/v1/cart/items/:productId
 * @desc Remove item from cart
 * @access Private
 */
router.delete('/items/:productId', authMiddleware, validateRequest(removeFromCartSchema), cartController.removeFromCart);

/**
 * @route DELETE /api/v1/cart
 * @desc Clear entire cart
 * @access Private
 */
router.delete('/', authMiddleware, cartController.clearCart);

export default router;
