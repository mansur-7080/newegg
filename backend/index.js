const express = require('express');
const cors = require('cors');
const { dbOperations } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'UltraMarket API ishlayapti (SQLite Database)',
    timestamp: new Date().toISOString(),
    service: 'ultramarket-backend',
    database: 'SQLite'
  });
});

// Products
app.get('/api/products', async (req, res) => {
  try {
    const products = await dbOperations.getProducts(req.query);
    
    res.json({
      success: true,
      data: products,
      total: products.length,
      limit: req.query.limit ? parseInt(req.query.limit) : null
    });
  } catch (error) {
    console.error('Products error:', error);
    res.status(500).json({
      success: false,
      message: 'Ma\'lumotlarni olishda xatolik',
      error: error.message
    });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await dbOperations.getProduct(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Mahsulot topilmadi'
      });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Product error:', error);
    res.status(500).json({
      success: false,
      message: 'Ma\'lumotni olishda xatolik',
      error: error.message
    });
  }
});

// Categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await dbOperations.getCategories();
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriyalarni olishda xatolik',
      error: error.message
    });
  }
});

// Stores
app.get('/api/stores', async (req, res) => {
  try {
    const stores = await dbOperations.getStores();
    
    res.json({
      success: true,
      data: stores
    });
  } catch (error) {
    console.error('Stores error:', error);
    res.status(500).json({
      success: false,
      message: 'Do\'konlarni olishda xatolik',
      error: error.message
    });
  }
});

app.get('/api/stores/:id', async (req, res) => {
  try {
    const store = await dbOperations.getStore(req.params.id);
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Do\'kon topilmadi'
      });
    }
    
    res.json({
      success: true,
      data: store
    });
  } catch (error) {
    console.error('Store error:', error);
    res.status(500).json({
      success: false,
      message: 'Do\'kon ma\'lumotini olishda xatolik',
      error: error.message
    });
  }
});

// Search
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({
      success: false,
      message: 'Qidiruv so\'zi kiritilmagan'
    });
  }
  
  try {
    const results = await dbOperations.search(q);
    
    res.json({
      success: true,
      data: results,
      query: q,
      total: results.length
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Qidiruvda xatolik',
      error: error.message
    });
  }
});

// Cart
app.get('/api/cart', async (req, res) => {
  try {
    const cart = await dbOperations.getCart();
    
    // Hisoblash
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    res.json({
      success: true,
      data: cart,
      total: total,
      itemCount: itemCount
    });
  } catch (error) {
    console.error('Cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Savat ma\'lumotlarini olishda xatolik',
      error: error.message
    });
  }
});

app.post('/api/cart', async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  
  if (!productId) {
    return res.status(400).json({
      success: false,
      message: 'Mahsulot ID kiritilmagan'
    });
  }
  
  try {
    const result = await dbOperations.addToCart(productId, quantity);
    
    res.json({
      success: true,
      message: result.message,
      productId: productId,
      quantity: quantity
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Stats
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await dbOperations.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Statistikani olishda xatolik',
      error: error.message
    });
  }
});

// Analytics (mock for now)
app.get('/api/analytics', async (req, res) => {
  try {
    // Bu yerda real analytics bo'lishi kerak
    const analytics = {
      dailyVisitors: 15430,
      totalOrders: 2847,
      revenue: 45000000,
      topCategories: [
        { name: 'Elektronika', sales: 12500000 },
        { name: 'Kiyim-kechak', sales: 8900000 },
        { name: 'Uy-ro\'zg\'or', sales: 6200000 }
      ],
      recentOrders: [
        {
          id: 'ORD-001',
          customer: 'Aziza K.',
          amount: 2450000,
          status: 'Tasdiqlangan',
          date: new Date().toISOString()
        }
      ]
    };
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Analitikani olishda xatolik',
      error: error.message
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint topilmadi',
    path: req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Server xatosi',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Ichki server xatosi'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 UltraMarket Backend API ishga tushdi! (SQLite Database)`);
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`📦 Products: http://localhost:${PORT}/api/products`);
  console.log(`🏪 Stores: http://localhost:${PORT}/api/stores`);
  console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
  console.log(`🛒 Cart: http://localhost:${PORT}/api/cart`);
  console.log(`🔍 Search: http://localhost:${PORT}/api/search?q=iphone`);
  console.log(`⏰ Started at: ${new Date().toLocaleString('uz-UZ')}`);
});