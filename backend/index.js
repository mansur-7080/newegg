const express = require('express');
const cors = require('cors');
const { dbOperations } = require('./database');
const { 
  hashPassword, 
  comparePassword, 
  generateToken, 
  authenticateToken, 
  requireAdmin, 
  validateUserInput 
} = require('./auth');

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
    message: 'UltraMarket API ishlayapti (SQLite Database + Auth)',
    timestamp: new Date().toISOString(),
    service: 'ultramarket-backend',
    database: 'SQLite',
    features: ['Authentication', 'JWT', 'BCrypt']
  });
});

// AUTH ROUTES - YANGI

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, address, city } = req.body;
    
    // Validation
    const validationErrors = validateUserInput({ email, password, firstName, lastName });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ma\'lumotlar noto\'g\'ri',
        errors: validationErrors
      });
    }

    // Email mavjudligini tekshirish
    const existingUser = await dbOperations.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Bu email allaqachon ro\'yxatdan o\'tgan'
      });
    }

    // Parolni hash qilish
    const hashedPassword = await hashPassword(password);

    // User yaratish
    const newUser = await dbOperations.createUser({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone: phone || null,
      address: address || null,
      city: city || 'Toshkent'
    });

    // JWT token yaratish
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: 'customer'
    });

    res.status(201).json({
      success: true,
      message: 'Ro\'yxatdan o\'tish muvaffaqiyatli',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName,
          lastName
        },
        token
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Ro\'yxatdan o\'tishda xatolik',
      error: error.message
    });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email va parol kiritilishi shart'
      });
    }

    // User topish
    const user = await dbOperations.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email yoki parol noto\'g\'ri'
      });
    }

    // Parolni tekshirish
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email yoki parol noto\'g\'ri'
      });
    }

    // JWT token yaratish
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    res.json({
      success: true,
      message: 'Kirish muvaffaqiyatli',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Kirishda xatolik',
      error: error.message
    });
  }
});

// Get user profile (protected route)
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const user = await dbOperations.getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Foydalanuvchi topilmadi'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Profil ma\'lumotlarini olishda xatolik',
      error: error.message
    });
  }
});

// Verify token
app.post('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token to\'g\'ri',
    data: {
      user: req.user
    }
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

// Protected admin route example
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Bu yerda admin faqat ko'rishi mumkin bo'lgan ma'lumotlar
    res.json({
      success: true,
      message: 'Admin panel - foydalanuvchilar ro\'yxati',
      data: { adminOnly: true }
    });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin ma\'lumotlarini olishda xatolik',
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
  console.log(`🚀 UltraMarket Backend API ishga tushdi! (SQLite Database + Authentication)`);
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`🔐 Register: POST http://localhost:${PORT}/api/auth/register`);
  console.log(`🔑 Login: POST http://localhost:${PORT}/api/auth/login`);
  console.log(`👤 Profile: GET http://localhost:${PORT}/api/auth/profile`);
  console.log(`📦 Products: http://localhost:${PORT}/api/products`);
  console.log(`🏪 Stores: http://localhost:${PORT}/api/stores`);
  console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
  console.log(`🛒 Cart: http://localhost:${PORT}/api/cart`);
  console.log(`🔍 Search: http://localhost:${PORT}/api/search?q=iphone`);
  console.log(`⏰ Started at: ${new Date().toLocaleString('uz-UZ')}`);
});