import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { CartController } from '../controllers/cart.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authenticateUser } from '../middleware/auth.middleware';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware';

const router = Router();
const cartController = new CartController();

// Apply rate limiting to all cart routes
router.use(rateLimitMiddleware);

/**
 * @route GET /api/cart
 * @desc Get user's cart
 * @access Private
 */
router.get(
  '/',
  authenticateUser,
  cartController.getCart
);

/**
 * @route POST /api/cart/items
 * @desc Add item to cart
 * @access Private
 */
router.post(
  '/items',
  authenticateUser,
  [
    body('productId')
      .notEmpty()
      .withMessage('Product ID is required')
      .isString()
      .withMessage('Product ID must be a string'),
    body('variantId')
      .optional()
      .isString()
      .withMessage('Variant ID must be a string'),
    body('name')
      .notEmpty()
      .withMessage('Product name is required')
      .isString()
      .withMessage('Product name must be a string')
      .isLength({ min: 1, max: 255 })
      .withMessage('Product name must be between 1 and 255 characters'),
    body('sku')
      .notEmpty()
      .withMessage('SKU is required')
      .isString()
      .withMessage('SKU must be a string')
      .matches(/^[A-Z0-9-_]+$/)
      .withMessage('SKU must contain only uppercase letters, numbers, hyphens, and underscores'),
    body('price')
      .isFloat({ gt: 0 })
      .withMessage('Price must be a positive number'),
    body('comparePrice')
      .optional()
      .isFloat({ gt: 0 })
      .withMessage('Compare price must be a positive number'),
    body('quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be a positive integer'),
    body('maxQuantity')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Max quantity must be a positive integer'),
    body('weight')
      .optional()
      .isFloat({ gt: 0 })
      .withMessage('Weight must be a positive number'),
    body('dimensions')
      .optional()
      .isObject()
      .withMessage('Dimensions must be an object'),
    body('image')
      .optional()
      .isURL()
      .withMessage('Image must be a valid URL'),
    body('attributes')
      .optional()
      .isObject()
      .withMessage('Attributes must be an object'),
    body('isAvailable')
      .optional()
      .isBoolean()
      .withMessage('isAvailable must be a boolean'),
    body('availabilityMessage')
      .optional()
      .isString()
      .withMessage('Availability message must be a string')
  ],
  validateRequest,
  cartController.addToCart
);

/**
 * @route PUT /api/cart/:cartId/items/:itemId
 * @desc Update cart item quantity
 * @access Private
 */
router.put(
  '/:cartId/items/:itemId',
  authenticateUser,
  [
    param('cartId')
      .notEmpty()
      .withMessage('Cart ID is required')
      .isString()
      .withMessage('Cart ID must be a string'),
    param('itemId')
      .notEmpty()
      .withMessage('Item ID is required')
      .isString()
      .withMessage('Item ID must be a string'),
    body('quantity')
      .isInt({ min: 0 })
      .withMessage('Quantity must be a non-negative integer'),
    body('isAvailable')
      .optional()
      .isBoolean()
      .withMessage('isAvailable must be a boolean'),
    body('availabilityMessage')
      .optional()
      .isString()
      .withMessage('Availability message must be a string')
  ],
  validateRequest,
  cartController.updateCartItem
);

/**
 * @route DELETE /api/cart/:cartId/items/:itemId
 * @desc Remove item from cart
 * @access Private
 */
router.delete(
  '/:cartId/items/:itemId',
  authenticateUser,
  [
    param('cartId')
      .notEmpty()
      .withMessage('Cart ID is required')
      .isString()
      .withMessage('Cart ID must be a string'),
    param('itemId')
      .notEmpty()
      .withMessage('Item ID is required')
      .isString()
      .withMessage('Item ID must be a string')
  ],
  validateRequest,
  cartController.removeFromCart
);

/**
 * @route POST /api/cart/:cartId/items/:itemId/save-for-later
 * @desc Save item for later
 * @access Private
 */
router.post(
  '/:cartId/items/:itemId/save-for-later',
  authenticateUser,
  [
    param('cartId')
      .notEmpty()
      .withMessage('Cart ID is required')
      .isString()
      .withMessage('Cart ID must be a string'),
    param('itemId')
      .notEmpty()
      .withMessage('Item ID is required')
      .isString()
      .withMessage('Item ID must be a string')
  ],
  validateRequest,
  cartController.saveForLater
);

/**
 * @route POST /api/cart/:cartId/saved-items/:savedItemId/move-to-cart
 * @desc Move saved item to cart
 * @access Private
 */
router.post(
  '/:cartId/saved-items/:savedItemId/move-to-cart',
  authenticateUser,
  [
    param('cartId')
      .notEmpty()
      .withMessage('Cart ID is required')
      .isString()
      .withMessage('Cart ID must be a string'),
    param('savedItemId')
      .notEmpty()
      .withMessage('Saved item ID is required')
      .isString()
      .withMessage('Saved item ID must be a string'),
    body('quantity')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Quantity must be a positive integer')
  ],
  validateRequest,
  cartController.moveToCart
);

/**
 * @route DELETE /api/cart/:cartId/clear
 * @desc Clear entire cart
 * @access Private
 */
router.delete(
  '/:cartId/clear',
  authenticateUser,
  [
    param('cartId')
      .notEmpty()
      .withMessage('Cart ID is required')
      .isString()
      .withMessage('Cart ID must be a string')
  ],
  validateRequest,
  cartController.clearCart
);

/**
 * @route POST /api/cart/:cartId/coupons
 * @desc Apply coupon to cart
 * @access Private
 */
router.post(
  '/:cartId/coupons',
  authenticateUser,
  [
    param('cartId')
      .notEmpty()
      .withMessage('Cart ID is required')
      .isString()
      .withMessage('Cart ID must be a string'),
    body('couponCode')
      .notEmpty()
      .withMessage('Coupon code is required')
      .isString()
      .withMessage('Coupon code must be a string')
      .isLength({ min: 3, max: 20 })
      .withMessage('Coupon code must be between 3 and 20 characters')
      .matches(/^[A-Z0-9]+$/)
      .withMessage('Coupon code must contain only uppercase letters and numbers')
  ],
  validateRequest,
  cartController.applyCoupon
);

/**
 * @route POST /api/cart/merge-guest-cart
 * @desc Merge guest cart with user cart
 * @access Private
 */
router.post(
  '/merge-guest-cart',
  authenticateUser,
  [
    body('sessionId')
      .notEmpty()
      .withMessage('Session ID is required')
      .isString()
      .withMessage('Session ID must be a string')
  ],
  validateRequest,
  cartController.mergeGuestCart
);

/**
 * @route GET /api/cart/statistics
 * @desc Get cart statistics (admin only)
 * @access Private/Admin
 */
router.get(
  '/statistics',
  authenticateUser,
  cartController.getCartStatistics
);

/**
 * @route POST /api/cart/cleanup-expired
 * @desc Clean up expired carts (admin only)
 * @access Private/Admin
 */
router.post(
  '/cleanup-expired',
  authenticateUser,
  cartController.cleanupExpiredCarts
);

export default router;
