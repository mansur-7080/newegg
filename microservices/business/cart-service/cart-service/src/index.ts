import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

// Redis Client Setup with Professional Configuration
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || 'redis123',
  db: 0,
  connectTimeout: 10000,
  lazyConnect: true,
});

// Redis connection events
redis.on('connect', () => {
  console.log('✅ Connected to Redis for Cart Service');
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

redis.on('ready', () => {
  console.log('🚀 Redis is ready for Cart Service operations');
});

// Middleware
app.use(cors());
app.use(express.json());

// Professional Cart Interfaces
interface CartItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  maxQuantity?: number;
  image?: string;
  sku?: string;
  variant?: string;
  addedAt: string;
  updatedAt: string;
}

interface Cart {
  userId: string;
  sessionId?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface CartSummary {
  itemCount: number;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
}

interface ProductValidation {
  productId: string;
  isValid: boolean;
  currentPrice?: number;
  inStock?: boolean;
  maxQuantity?: number;
  error?: string;
}

// Professional Configuration
const CART_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const SESSION_TTL = 30 * 60; // 30 minutes for guest sessions
const TAX_RATE = 0.08; // 8% tax rate
const FREE_SHIPPING_THRESHOLD = 75; // Free shipping over $75
const SHIPPING_COST = 9.99;

// Helper functions with performance optimization
const getCartKey = (userId: string) => `cart:${userId}`;
const getCartItemKey = (userId: string, productId: string) => `cart:${userId}:item:${productId}`;
const getSessionCartKey = (sessionId: string) => `session:cart:${sessionId}`;
const getSavedForLaterKey = (userId: string) => `saved:${userId}`;

// Professional cart calculation
const calculateCartTotals = (items: CartItem[]): CartSummary => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const discount = 0; // TODO: Implement discount calculation
  const total = subtotal + tax + shipping - discount;

  return {
    itemCount: items.length,
    subtotal: Number(subtotal.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    shipping: Number(shipping.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    total: Number(total.toFixed(2)),
    currency: 'USD',
  };
};

// Product validation service integration
const validateProduct = async (productId: string, quantity: number): Promise<ProductValidation> => {
  try {
    // Call Product Service to validate
    const response = await axios.get(`http://product-service:3002/api/products/${productId}`);
    const product = response.data.data;

    if (!product || !product.isActive) {
      return { productId, isValid: false, error: 'Product not found or inactive' };
    }

    if (product.quantity < quantity) {
      return {
        productId,
        isValid: false,
        error: 'Insufficient inventory',
        maxQuantity: product.quantity,
      };
    }

    return {
      productId,
      isValid: true,
      currentPrice: product.price,
      inStock: true,
      maxQuantity: product.quantity,
    };
  } catch (error) {
    console.error(`Product validation failed for ${productId}:`, error);
    return { productId, isValid: false, error: 'Product service unavailable' };
  }
};

// Professional Redis operations with error handling
const getCartFromRedis = async (userId: string): Promise<Cart | null> => {
  try {
    const cartKey = getCartKey(userId);
    const cartData = await redis.hgetall(cartKey);

    if (Object.keys(cartData).length === 0) {
      return null;
    }

    // Get all cart items efficiently
    const itemKeys = await redis.keys(`cart:${userId}:item:*`);
    const items: CartItem[] = [];

    if (itemKeys.length > 0) {
      const pipeline = redis.pipeline();
      itemKeys.forEach((key) => pipeline.hgetall(key));
      const results = await pipeline.exec();

      results?.forEach((result, index) => {
        if (result && result[1] && typeof result[1] === 'object') {
          const itemData = result[1] as any;
          if (Object.keys(itemData).length > 0) {
            items.push({
              id: itemData.id,
              productId: itemData.productId,
              productName: itemData.productName,
              price: parseFloat(itemData.price),
              originalPrice: itemData.originalPrice
                ? parseFloat(itemData.originalPrice)
                : undefined,
              quantity: parseInt(itemData.quantity),
              maxQuantity: itemData.maxQuantity ? parseInt(itemData.maxQuantity) : undefined,
              image: itemData.image,
              sku: itemData.sku,
              variant: itemData.variant,
              addedAt: itemData.addedAt,
              updatedAt: itemData.updatedAt,
            });
          }
        }
      });
    }

    const totals = calculateCartTotals(items);

    return {
      userId,
      sessionId: cartData.sessionId,
      items,
      subtotal: totals.subtotal,
      tax: totals.tax,
      shipping: totals.shipping,
      discount: totals.discount,
      total: totals.total,
      currency: totals.currency,
      expiresAt: cartData.expiresAt,
      createdAt: cartData.createdAt,
      updatedAt: cartData.updatedAt,
    };
  } catch (error) {
    console.error('Error getting cart from Redis:', error);
    return null;
  }
};

// Professional cart save with pipeline for performance
const saveCartToRedis = async (cart: Cart): Promise<boolean> => {
  try {
    const cartKey = getCartKey(cart.userId);
    const pipeline = redis.pipeline();

    // Save cart metadata
    pipeline.hset(cartKey, {
      userId: cart.userId,
      sessionId: cart.sessionId || '',
      subtotal: cart.subtotal,
      tax: cart.tax,
      shipping: cart.shipping,
      discount: cart.discount,
      total: cart.total,
      currency: cart.currency,
      expiresAt: cart.expiresAt || '',
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    });

    // Set TTL for cart
    pipeline.expire(cartKey, CART_TTL);

    // Save cart items
    for (const item of cart.items) {
      const itemKey = getCartItemKey(cart.userId, item.productId);
      pipeline.hset(itemKey, {
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        originalPrice: item.originalPrice || '',
        quantity: item.quantity,
        maxQuantity: item.maxQuantity || '',
        image: item.image || '',
        sku: item.sku || '',
        variant: item.variant || '',
        addedAt: item.addedAt,
        updatedAt: item.updatedAt,
      });
      pipeline.expire(itemKey, CART_TTL);
    }

    await pipeline.exec();
    return true;
  } catch (error) {
    console.error('Error saving cart to Redis:', error);
    return false;
  }
};

// Health check endpoint with Redis status
app.get('/health', async (req, res) => {
  try {
    // Test Redis connection
    await redis.ping();
    res.json({
      status: 'healthy',
      service: 'cart-service',
      timestamp: new Date().toISOString(),
      database: 'Redis',
      redis_status: 'connected',
      port: PORT,
      version: '2.0.0',
      features: [
        'session_management',
        'inventory_validation',
        'cart_persistence',
        'price_calculation',
        'guest_cart_sync',
      ],
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'cart-service',
      error: 'Redis connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// Professional get cart with validation
app.get('/api/cart/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || userId === 'undefined') {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
    }

    let cart = await getCartFromRedis(userId);

    if (!cart) {
      // Create empty cart
      cart = {
        userId,
        items: [],
        subtotal: 0,
        tax: 0,
        shipping: 0,
        discount: 0,
        total: 0,
        currency: 'USD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Validate items in background (async)
    if (cart.items.length > 0) {
      setImmediate(async () => {
        for (const item of cart.items) {
          const validation = await validateProduct(item.productId, item.quantity);
          if (!validation.isValid) {
            console.log(`Item ${item.productId} validation failed: ${validation.error}`);
            // Could implement auto-removal or notification here
          }
        }
      });
    }

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    console.error('Error getting cart:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Professional add item to cart with validation
app.post('/api/cart/:userId/items', async (req, res) => {
  try {
    const { userId } = req.params;
    const { productId, productName, price, quantity = 1, image, sku, variant } = req.body;

    if (!userId || !productId || !productName || !price) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, productId, productName, price',
      });
    }

    // Validate product first
    const validation = await validateProduct(productId, quantity);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
        maxQuantity: validation.maxQuantity,
      });
    }

    // Get existing cart
    let cart = await getCartFromRedis(userId);

    if (!cart) {
      cart = {
        userId,
        items: [],
        subtotal: 0,
        tax: 0,
        shipping: 0,
        discount: 0,
        total: 0,
        currency: 'USD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Check if item already exists
    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId === productId && item.variant === variant
    );

    const now = new Date().toISOString();

    if (existingItemIndex !== -1) {
      // Update existing item
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;

      // Validate new quantity
      const quantityValidation = await validateProduct(productId, newQuantity);
      if (!quantityValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: quantityValidation.error,
          maxQuantity: quantityValidation.maxQuantity,
        });
      }

      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].updatedAt = now;
      cart.items[existingItemIndex].price = validation.currentPrice || price; // Update to current price
    } else {
      // Add new item
      const newItem: CartItem = {
        id: uuidv4(),
        productId,
        productName,
        price: validation.currentPrice || price,
        originalPrice: price !== validation.currentPrice ? price : undefined,
        quantity,
        maxQuantity: validation.maxQuantity,
        image,
        sku,
        variant,
        addedAt: now,
        updatedAt: now,
      };
      cart.items.push(newItem);
    }

    // Recalculate totals
    const totals = calculateCartTotals(cart.items);
    cart.subtotal = totals.subtotal;
    cart.tax = totals.tax;
    cart.shipping = totals.shipping;
    cart.discount = totals.discount;
    cart.total = totals.total;
    cart.updatedAt = now;

    // Save to Redis
    const saved = await saveCartToRedis(cart);
    if (!saved) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save cart',
      });
    }

    res.json({
      success: true,
      data: cart,
      message: 'Item added to cart successfully',
    });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Update item quantity
app.patch('/api/cart/:userId/items/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid quantity is required',
      });
    }

    const itemKey = getCartItemKey(userId, productId);
    const cartKey = getCartKey(userId);

    // Check if item exists
    const existingItem = await redis.hgetall(itemKey);

    if (Object.keys(existingItem).length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in cart',
      });
    }

    if (quantity === 0) {
      // Remove item if quantity is 0
      await redis.del(itemKey);
      res.json({
        success: true,
        message: 'Item removed from cart',
      });
    } else {
      // Update quantity
      await redis.hset(itemKey, 'quantity', quantity.toString());
      await redis.hset(cartKey, 'updatedAt', new Date().toISOString());

      const updatedItem = await redis.hgetall(itemKey);
      res.json({
        success: true,
        data: {
          id: updatedItem.id,
          productId: updatedItem.productId,
          productName: updatedItem.productName,
          price: parseFloat(updatedItem.price),
          quantity: parseInt(updatedItem.quantity),
          image: updatedItem.image,
          addedAt: updatedItem.addedAt,
        },
        message: 'Item quantity updated',
      });
    }
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Remove item from cart
app.delete('/api/cart/:userId/items/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const itemKey = getCartItemKey(userId, productId);
    const cartKey = getCartKey(userId);

    // Check if item exists
    const existingItem = await redis.hgetall(itemKey);

    if (Object.keys(existingItem).length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in cart',
      });
    }

    // Remove item
    await redis.del(itemKey);
    await redis.hset(cartKey, 'updatedAt', new Date().toISOString());

    res.json({
      success: true,
      message: 'Item removed from cart',
    });
  } catch (error) {
    console.error('Error removing cart item:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Clear entire cart
app.delete('/api/cart/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const cartKey = getCartKey(userId);

    // Get all item keys for this user
    const itemKeys = await redis.keys(`cart:${userId}:item:*`);

    // Delete all items
    if (itemKeys.length > 0) {
      await redis.del(...itemKeys);
    }

    // Delete cart metadata
    await redis.del(cartKey);

    res.json({
      success: true,
      message: 'Cart cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get cart summary
app.get('/api/cart/:userId/summary', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get all cart items
    const itemKeys = await redis.keys(`cart:${userId}:item:*`);
    let totalItems = 0;
    let totalAmount = 0;

    for (const itemKey of itemKeys) {
      const itemData = await redis.hgetall(itemKey);
      if (Object.keys(itemData).length > 0) {
        const quantity = parseInt(itemData.quantity);
        const price = parseFloat(itemData.price);
        totalItems += quantity;
        totalAmount += price * quantity;
      }
    }

    res.json({
      success: true,
      data: {
        userId,
        totalItems,
        totalAmount: Math.round(totalAmount * 100) / 100,
        currency: 'USD',
      },
    });
  } catch (error) {
    console.error('Error getting cart summary:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get cart statistics (for analytics)
app.get('/api/cart/stats/overview', async (req, res) => {
  try {
    // Get all cart keys
    const cartKeys = await redis.keys('cart:*:item:*');
    const activeCartsKeys = await redis.keys('cart:*');

    // Filter out item keys to get unique user carts
    const userCartKeys = activeCartsKeys.filter((key) => !key.includes(':item:'));

    let totalItems = 0;
    let totalValue = 0;

    for (const itemKey of cartKeys) {
      const itemData = await redis.hgetall(itemKey);
      if (Object.keys(itemData).length > 0) {
        const quantity = parseInt(itemData.quantity || '0');
        const price = parseFloat(itemData.price || '0');
        totalItems += quantity;
        totalValue += price * quantity;
      }
    }

    res.json({
      success: true,
      data: {
        activeCarts: userCartKeys.length,
        totalItems,
        totalValue: Math.round(totalValue * 100) / 100,
        averageCartValue:
          userCartKeys.length > 0 ? Math.round((totalValue / userCartKeys.length) * 100) / 100 : 0,
      },
    });
  } catch (error) {
    console.error('Error getting cart statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🛒 Cart Service running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`💾 Database: Redis (Session-based storage)`);
  console.log(`📊 API: http://localhost:${PORT}/api/cart`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Cart Service shutting down...');
  await redis.quit();
  process.exit(0);
});
