const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
const products = [
  {
    id: '1',
    name: 'iPhone 15 Pro Max',
    nameUz: 'iPhone 15 Pro Max',
    price: 14500000,
    originalPrice: 16000000,
    image: '/products/iphone-15.jpg',
    rating: 4.8,
    reviewCount: 234,
    discount: 9,
    category: 'Smartfonlar',
    store: {
      id: 'techstore',
      name: 'TechStore UZ',
      location: 'Toshkent'
    },
    isInStock: true
  },
  {
    id: '2',
    name: 'Samsung Galaxy S24',
    nameUz: 'Samsung Galaxy S24',
    price: 12000000,
    image: '/products/samsung-s24.jpg',
    rating: 4.7,
    reviewCount: 189,
    category: 'Smartfonlar',
    store: {
      id: 'samsung-store',
      name: 'Samsung Official',
      location: 'Toshkent'
    },
    isInStock: true
  }
];

const categories = [
  { id: 'electronics', name: 'Elektronika', nameUz: 'Elektronika', productCount: 25000 },
  { id: 'fashion', name: 'Kiyim-kechak', nameUz: 'Kiyim-kechak', productCount: 18000 },
  { id: 'home', name: 'Uy-rozgor', nameUz: 'Uy-ro\'zg\'or', productCount: 9500 },
  { id: 'automotive', name: 'Avtomobil', nameUz: 'Avtomobil', productCount: 4500 }
];

const stores = [
  {
    id: 'techstore',
    name: 'TechStore UZ',
    description: 'Eng yangi texnologiyalar',
    location: 'Toshkent',
    rating: 4.9,
    productCount: 1250,
    isVerified: true
  },
  {
    id: 'samsung-store',
    name: 'Samsung Official',
    description: 'Rasmiy Samsung do\'koni',
    location: 'Toshkent',
    rating: 4.8,
    productCount: 890,
    isVerified: true
  }
];

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'UltraMarket API ishlayapti',
    timestamp: new Date().toISOString(),
    service: 'ultramarket-backend'
  });
});

// Products
app.get('/api/products', (req, res) => {
  const { category, search, limit = 10 } = req.query;
  
  let filteredProducts = [...products];
  
  if (category) {
    filteredProducts = filteredProducts.filter(p => 
      p.category.toLowerCase().includes(category.toLowerCase())
    );
  }
  
  if (search) {
    filteredProducts = filteredProducts.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.nameUz.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  const limitedProducts = filteredProducts.slice(0, parseInt(limit));
  
  res.json({
    success: true,
    data: limitedProducts,
    total: filteredProducts.length,
    limit: parseInt(limit)
  });
});

app.get('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const product = products.find(p => p.id === id);
  
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
});

// Categories
app.get('/api/categories', (req, res) => {
  res.json({
    success: true,
    data: categories
  });
});

// Stores
app.get('/api/stores', (req, res) => {
  res.json({
    success: true,
    data: stores
  });
});

app.get('/api/stores/:id', (req, res) => {
  const { id } = req.params;
  const store = stores.find(s => s.id === id);
  
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
});

// Search
app.get('/api/search', (req, res) => {
  const { q, type = 'products' } = req.query;
  
  if (!q) {
    return res.status(400).json({
      success: false,
      message: 'Qidiruv so\'zi kiritilmagan'
    });
  }
  
  let results = [];
  
  if (type === 'products' || type === 'all') {
    const productResults = products.filter(p => 
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.nameUz.toLowerCase().includes(q.toLowerCase()) ||
      p.category.toLowerCase().includes(q.toLowerCase())
    );
    results = [...results, ...productResults];
  }
  
  res.json({
    success: true,
    data: results,
    query: q,
    type: type,
    total: results.length
  });
});

// Cart simulation
let cart = [];

app.get('/api/cart', (req, res) => {
  res.json({
    success: true,
    data: cart,
    total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    itemCount: cart.reduce((sum, item) => sum + item.quantity, 0)
  });
});

app.post('/api/cart', (req, res) => {
  const { productId, quantity = 1 } = req.body;
  
  const product = products.find(p => p.id === productId);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Mahsulot topilmadi'
    });
  }
  
  const existingItem = cart.find(item => item.productId === productId);
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({
      id: Date.now().toString(),
      productId,
      product,
      quantity,
      price: product.price,
      addedAt: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    message: 'Mahsulot savatga qo\'shildi',
    data: cart
  });
});

// Stats
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalProducts: products.length,
      totalStores: stores.length,
      totalCategories: categories.length,
      platform: 'UltraMarket',
      region: 'O\'zbekiston',
      currency: 'UZS',
      features: [
        'Bepul yetkazib berish',
        'Xavfsiz to\'lov',
        '24/7 yordam',
        'Click, Payme, Apelsin'
      ]
    }
  });
});

// Analytics
app.get('/api/analytics', (req, res) => {
  res.json({
    success: true,
    data: {
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
    }
  });
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
  console.log(`🚀 UltraMarket Backend API ishga tushdi!`);
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`📦 Products: http://localhost:${PORT}/api/products`);
  console.log(`🏪 Stores: http://localhost:${PORT}/api/stores`);
  console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
  console.log(`⏰ Started at: ${new Date().toLocaleString('uz-UZ')}`);
});