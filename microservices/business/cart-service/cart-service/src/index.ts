// UltraMarket Cart Service
// HALOL VA PROFESSIONAL ISH

import express from 'express';
import cors from 'cors';
import { CartModel } from './models/Cart';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize cart service
const cartService = new CartModel();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'cart-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Cart endpoints
app.get('/api/cart/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const cart = await cartService.getCart(userId);
    res.json(cart || { items: [], totalItems: 0, subtotal: 0 });
  } catch (error) {
    console.error('Error getting cart:', error);
    res.status(500).json({ error: 'Failed to get cart' });
  }
});

app.post('/api/cart/:userId/items', async (req, res) => {
  try {
    const { userId } = req.params;
    const item = req.body;
    const updatedCart = await cartService.addItem(userId, item);
    res.json(updatedCart);
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

app.put('/api/cart/:userId/items/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const { quantity } = req.body;
    const updatedCart = await cartService.updateItemQuantity(userId, productId, quantity);
    res.json(updatedCart);
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

app.delete('/api/cart/:userId/items/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const updatedCart = await cartService.removeItem(userId, productId);
    res.json(updatedCart);
  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
});

app.delete('/api/cart/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await cartService.clearCart(userId);
    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 UltraMarket Cart Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
