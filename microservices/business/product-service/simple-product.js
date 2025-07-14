const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Sample products data
const sampleProducts = [
  {
    id: "1",
    name: "iPhone 15 Pro",
    description: "Latest iPhone with A17 Pro chip",
    price: 999.99,
    discountPrice: 899.99,
    sku: "IPHONE15PRO",
    stock: 50,
    images: JSON.stringify(["iphone15pro-1.jpg", "iphone15pro-2.jpg"]),
    categoryId: "electronics",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "2",
    name: "Samsung Galaxy S24",
    description: "Premium Android smartphone with advanced camera",
    price: 899.99,
    discountPrice: 799.99,
    sku: "GALAXYS24",
    stock: 30,
    images: JSON.stringify(["galaxy-s24-1.jpg", "galaxy-s24-2.jpg"]),
    categoryId: "electronics",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "3",
    name: "MacBook Air M3",
    description: "Lightweight laptop with M3 chip, perfect for professionals",
    price: 1299.99,
    discountPrice: 1199.99,
    sku: "MACBOOKAIRM3",
    stock: 25,
    images: JSON.stringify(["macbook-air-m3-1.jpg", "macbook-air-m3-2.jpg"]),
    categoryId: "computers",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "4",
    name: "Nike Air Max 270",
    description: "Comfortable running shoes with Air Max technology",
    price: 129.99,
    discountPrice: 99.99,
    sku: "NIKEAIRMAX270",
    stock: 100,
    images: JSON.stringify(["nike-air-max-270-1.jpg", "nike-air-max-270-2.jpg"]),
    categoryId: "shoes",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "5",
    name: "Adidas Ultraboost 22",
    description: "High-performance running shoes with Boost technology",
    price: 180.00,
    discountPrice: 149.99,
    sku: "ADIDASULTRABOOST22",
    stock: 75,
    images: JSON.stringify(["adidas-ultraboost-22-1.jpg", "adidas-ultraboost-22-2.jpg"]),
    categoryId: "shoes",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "6",
    name: "Sony WH-1000XM5",
    description: "Premium noise-canceling wireless headphones",
    price: 399.99,
    discountPrice: 349.99,
    sku: "SONYWH1000XM5",
    stock: 40,
    images: JSON.stringify(["sony-wh-1000xm5-1.jpg", "sony-wh-1000xm5-2.jpg"]),
    categoryId: "electronics",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "7",
    name: "Levi's 501 Jeans",
    description: "Classic straight fit jeans, timeless style",
    price: 89.99,
    discountPrice: 69.99,
    sku: "LEVIS501JEANS",
    stock: 200,
    images: JSON.stringify(["levis-501-jeans-1.jpg", "levis-501-jeans-2.jpg"]),
    categoryId: "clothing",
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "8",
    name: "The Clean Code Book",
    description: "A Handbook of Agile Software Craftsmanship by Robert Martin",
    price: 45.99,
    discountPrice: 35.99,
    sku: "CLEANCODEBOOK",
    stock: 80,
    images: JSON.stringify(["clean-code-book-1.jpg"]),
    categoryId: "books",
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

const categories = [
  { 
    id: 'electronics', 
    name: 'Electronics', 
    description: 'Electronic devices and gadgets',
    image: 'electronics-category.jpg',
    isActive: true
  },
  { 
    id: 'computers', 
    name: 'Computers', 
    description: 'Laptops, desktops, and accessories',
    image: 'computers-category.jpg',
    isActive: true
  },
  { 
    id: 'shoes', 
    name: 'Shoes', 
    description: 'Athletic and casual footwear',
    image: 'shoes-category.jpg',
    isActive: true
  },
  { 
    id: 'clothing', 
    name: 'Clothing', 
    description: 'Apparel and fashion items',
    image: 'clothing-category.jpg',
    isActive: true
  },
  { 
    id: 'books', 
    name: 'Books', 
    description: 'Books and educational materials',
    image: 'books-category.jpg',
    isActive: true
  }
];

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'product-service',
    timestamp: new Date().toISOString(),
    products: sampleProducts.length,
    categories: categories.length
  });
});

// Get all products
app.get('/products', (req, res) => {
  try {
    const { category, search, page = 1, limit = 10, minPrice, maxPrice } = req.query;
    
    let products = [...sampleProducts];
    
    // Filter by category
    if (category) {
      products = products.filter(p => p.categoryId === category);
    }
    
    // Search by name or description
    if (search) {
      const searchTerm = search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm) ||
        p.sku.toLowerCase().includes(searchTerm)
      );
    }
    
    // Filter by price range
    if (minPrice) {
      products = products.filter(p => p.price >= Number(minPrice));
    }
    
    if (maxPrice) {
      products = products.filter(p => p.price <= Number(maxPrice));
    }
    
    // Pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedProducts = products.slice(startIndex, endIndex);
    
    // Parse images JSON for response
    const responseProducts = paginatedProducts.map(p => ({
      ...p,
      images: JSON.parse(p.images)
    }));
    
    res.json({
      products: responseProducts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: products.length,
        pages: Math.ceil(products.length / Number(limit))
      },
      filters: {
        category,
        search,
        minPrice,
        maxPrice
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product by ID/SKU
app.get('/products/:identifier', (req, res) => {
  try {
    const { identifier } = req.params;
    
    const product = sampleProducts.find(p => 
      p.id === identifier || p.sku === identifier
    );
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Parse images JSON
    const responseProduct = {
      ...product,
      images: JSON.parse(product.images)
    };
    
    res.json({ product: responseProduct });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get categories
app.get('/categories', (req, res) => {
  try {
    res.json({ 
      categories: categories.filter(c => c.isActive),
      count: categories.filter(c => c.isActive).length
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search products
app.get('/search', (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, sort = 'name' } = req.query;
    
    let products = [...sampleProducts];
    
    // Search by query
    if (q) {
      const searchTerm = q.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm) ||
        p.sku.toLowerCase().includes(searchTerm)
      );
    }
    
    // Filter by category
    if (category) {
      products = products.filter(p => p.categoryId === category);
    }
    
    // Filter by price range
    if (minPrice) {
      products = products.filter(p => p.price >= Number(minPrice));
    }
    
    if (maxPrice) {
      products = products.filter(p => p.price <= Number(maxPrice));
    }
    
    // Sort products
    switch (sort) {
      case 'price_low':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        products.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        products.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
        products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      default:
        // Keep original order
        break;
    }
    
    // Parse images JSON
    const responseProducts = products.map(p => ({
      ...p,
      images: JSON.parse(p.images)
    }));
    
    res.json({
      query: q,
      filters: { category, minPrice, maxPrice, sort },
      results: responseProducts,
      count: responseProducts.length
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get featured products
app.get('/featured', (req, res) => {
  try {
    // Return products with discounts as featured
    const featured = sampleProducts
      .filter(p => p.discountPrice && p.discountPrice < p.price)
      .slice(0, 4)
      .map(p => ({
        ...p,
        images: JSON.parse(p.images),
        discount: Math.round(((p.price - p.discountPrice) / p.price) * 100)
      }));
    
    res.json({ 
      featured,
      count: featured.length
    });
  } catch (error) {
    console.error('Get featured error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get products by category
app.get('/categories/:categoryId/products', (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const category = categories.find(c => c.id === categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    let products = sampleProducts.filter(p => p.categoryId === categoryId);
    
    // Pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedProducts = products.slice(startIndex, endIndex);
    
    // Parse images JSON
    const responseProducts = paginatedProducts.map(p => ({
      ...p,
      images: JSON.parse(p.images)
    }));
    
    res.json({
      category,
      products: responseProducts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: products.length,
        pages: Math.ceil(products.length / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get category products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product stats
app.get('/stats', (req, res) => {
  try {
    const totalProducts = sampleProducts.length;
    const activeProducts = sampleProducts.filter(p => p.isActive).length;
    const totalCategories = categories.length;
    const averagePrice = sampleProducts.reduce((sum, p) => sum + p.price, 0) / totalProducts;
    const productsWithDiscount = sampleProducts.filter(p => p.discountPrice && p.discountPrice < p.price).length;
    
    res.json({
      totalProducts,
      activeProducts,
      totalCategories,
      averagePrice: Math.round(averagePrice * 100) / 100,
      productsWithDiscount,
      categoryBreakdown: categories.map(cat => ({
        category: cat.name,
        count: sampleProducts.filter(p => p.categoryId === cat.id).length
      }))
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Product Service running on port ${PORT}`);
  console.log(`📦 Sample products loaded: ${sampleProducts.length}`);
  console.log(`🏷️ Categories available: ${categories.length}`);
  console.log(`🔍 Search endpoint: http://localhost:${PORT}/search`);
  console.log(`⭐ Featured endpoint: http://localhost:${PORT}/featured`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down Product Service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down Product Service...');
  process.exit(0);
});