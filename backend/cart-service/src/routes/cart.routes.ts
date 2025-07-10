import { Router } from 'express';
import { CartController } from '../controllers/cart.controller';

const router = Router();
const cartController = new CartController();

// Get user's cart
router.get('/', cartController.getCart.bind(cartController));

// Add item to cart
router.post('/items', cartController.addItem.bind(cartController));

// Update item quantity
router.put('/items/:productId', cartController.updateItemQuantity.bind(cartController));

// Remove item from cart
router.delete('/items/:productId', cartController.removeItem.bind(cartController));

// Clear entire cart
router.delete('/', cartController.clearCart.bind(cartController));

export default router;