const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const winston = require('winston');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Winston logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request processed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'product-service',
    version: process.env.APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// In-memory data store (in production, use real database)
let products = [
  {
    id: '1',
    name: 'MacBook Pro 16"',
    slug: 'macbook-pro-16',
    price: 2499.99,
    comparePrice: 2799.99,
    category: 'laptops',
    categoryName: 'Laptops',
    brand: 'Apple',
    sku: 'MBPRO16-2023',
    description: 'Powerful laptop for professionals',
    shortDescription: '16" Liquid Retina XDR display',
    stock: 15,
    images: [
      'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mbp16-spacegray-select-202110?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1632788124000'
    ],
    specifications: {
      processor: 'Apple M3 Pro',
      memory: '16GB',
      storage: '512GB SSD',
      display: '16.2-inch Liquid Retina XDR',
      graphics: 'Integrated'
    },
    isActive: true,
    isFeatured: true,
    rating: { average: 4.8, count: 234 },
    createdAt: new Date('2023-01-01').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Dell XPS 15',
    slug: 'dell-xps-15',
    price: 1899.99,
    comparePrice: 2199.99,
    category: 'laptops',
    categoryName: 'Laptops',
    brand: 'Dell',
    sku: 'DXPS15-2023',
    description: 'Premium Windows laptop with stunning display',
    shortDescription: '15.6" OLED touchscreen',
    stock: 8,
    images: [
      'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-15-9520/media-gallery/black/notebook-xps-15-9520-black-gallery-1.psd?fmt=png-alpha&pscan=auto&scl=1&hei=402&wid=554&qlt=100,1&resMode=sharp2&size=554,402&chrss=full'
    ],
    specifications: {
      processor: 'Intel Core i7-13700H',
      memory: '16GB DDR5',
      storage: '512GB NVMe SSD',
      display: '15.6" 3.5K OLED',
      graphics: 'NVIDIA RTX 4050'
    },
    isActive: true,
    isFeatured: true,
    rating: { average: 4.6, count: 189 },
    createdAt: new Date('2023-02-15').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Samsung Galaxy Book3 Pro',
    slug: 'samsung-galaxy-book3-pro',
    price: 1449.99,
    category: 'laptops',
    categoryName: 'Laptops',
    brand: 'Samsung',
    sku: 'SGB3PRO-2023',
    description: 'Ultra-thin and light laptop with AMOLED display',
    shortDescription: '14" 3K AMOLED touchscreen',
    stock: 12,
    images: [
      'https://images.samsung.com/is/image/samsung/p6pim/us/np940xfg-kc1us/gallery/us-galaxy-book3-pro-14-np940-np940xfg-kc1us-536334701?$650_519_PNG$'
    ],
    specifications: {
      processor: 'Intel Core i7-1360P',
      memory: '16GB LPDDR5',
      storage: '512GB SSD',
      display: '14" 3K AMOLED',
      graphics: 'Intel Iris Xe'
    },
    isActive: true,
    isFeatured: false,
    rating: { average: 4.4, count: 67 },
    createdAt: new Date('2023-03-20').toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let categories = [
  { id: '1', name: 'Laptops', slug: 'laptops', description: 'High-performance laptops', isActive: true },
  { id: '2', name: 'Desktops', slug: 'desktops', description: 'Powerful desktop computers', isActive: true },
  { id: '3', name: 'Accessories', slug: 'accessories', description: 'Computer accessories', isActive: true },
  { id: '4', name: 'Monitors', slug: 'monitors', description: 'Display monitors', isActive: true }
];

// Products endpoints
app.get('/api/v1/products', (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      search, 
      minPrice, 
      maxPrice, 
      brand,
      sortBy = 'createdAt',
      sortOrder = 'desc' 
    } = req.query;
    
    let filteredProducts = products.filter(p => p.isActive);
    
    // Filter by category
    if (category) {
      filteredProducts = filteredProducts.filter(p => 
        p.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    // Filter by brand
    if (brand) {
      filteredProducts = filteredProducts.filter(p => 
        p.brand.toLowerCase() === brand.toLowerCase()
      );
    }
    
    // Filter by price range
    if (minPrice) {
      filteredProducts = filteredProducts.filter(p => p.price >= parseFloat(minPrice));
    }
    if (maxPrice) {
      filteredProducts = filteredProducts.filter(p => p.price <= parseFloat(maxPrice));
    }
    
    // Search
    if (search) {
      const searchLower = search.toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.brand.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort
    filteredProducts.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortBy === 'price') {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredProducts.length,
        pages: Math.ceil(filteredProducts.length / limit),
        hasNext: endIndex < filteredProducts.length,
        hasPrev: page > 1
      },
      filters: {
        category,
        brand,
        priceRange: { min: minPrice, max: maxPrice },
        search
      }
    });
  } catch (error) {
    logger.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get product by ID
app.get('/api/v1/products/:id', (req, res) => {
  try {
    const product = products.find(p => p.id === req.params.id && p.isActive);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product'
    });
  }
});

// Get product by slug
app.get('/api/v1/products/slug/:slug', (req, res) => {
  try {
    const product = products.find(p => p.slug === req.params.slug && p.isActive);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error('Error fetching product by slug:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product'
    });
  }
});

// Create product
app.post('/api/v1/products', (req, res) => {
  try {
    const { name, price, category, description, stock, brand, sku } = req.body;
    
    // Basic validation
    if (!name || !price || !category || !sku) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: name, price, category, sku'
      });
    }
    
    // Check for duplicate SKU
    if (products.find(p => p.sku === sku)) {
      return res.status(409).json({
        success: false,
        message: 'Product with this SKU already exists'
      });
    }
    
    const newProduct = {
      id: Date.now().toString(),
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      ...req.body,
      categoryName: categories.find(c => c.slug === category)?.name || category,
      isActive: true,
      isFeatured: false,
      rating: { average: 0, count: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    products.push(newProduct);
    
    logger.info('Product created:', { id: newProduct.id, name: newProduct.name });
    
    res.status(201).json({
      success: true,
      data: newProduct,
      message: 'Product created successfully'
    });
  } catch (error) {
    logger.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product'
    });
  }
});

// Update product
app.put('/api/v1/products/:id', (req, res) => {
  try {
    const index = products.findIndex(p => p.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check for duplicate SKU if updating
    if (req.body.sku && req.body.sku !== products[index].sku) {
      if (products.find(p => p.sku === req.body.sku)) {
        return res.status(409).json({
          success: false,
          message: 'Product with this SKU already exists'
        });
      }
    }
    
    products[index] = {
      ...products[index],
      ...req.body,
      id: req.params.id,
      updatedAt: new Date().toISOString()
    };
    
    if (req.body.name && !req.body.slug) {
      products[index].slug = req.body.name.toLowerCase().replace(/\s+/g, '-');
    }
    
    logger.info('Product updated:', { id: req.params.id });
    
    res.json({
      success: true,
      data: products[index],
      message: 'Product updated successfully'
    });
  } catch (error) {
    logger.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product'
    });
  }
});

// Delete product (soft delete)
app.delete('/api/v1/products/:id', (req, res) => {
  try {
    const index = products.findIndex(p => p.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Soft delete
    products[index].isActive = false;
    products[index].updatedAt = new Date().toISOString();
    
    logger.info('Product deleted:', { id: req.params.id });
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product'
    });
  }
});

// Categories endpoints
app.get('/api/v1/categories', (req, res) => {
  try {
    const activeCategories = categories.filter(c => c.isActive);
    
    res.json({
      success: true,
      data: activeCategories,
      total: activeCategories.length
    });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories'
    });
  }
});

// Featured products
app.get('/api/v1/products/featured', (req, res) => {
  try {
    const featuredProducts = products.filter(p => p.isFeatured && p.isActive);
    
    res.json({
      success: true,
      data: featuredProducts,
      total: featuredProducts.length
    });
  } catch (error) {
    logger.error('Error fetching featured products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured products'
    });
  }
});

// Product statistics
app.get('/api/v1/products/stats', (req, res) => {
  try {
    const activeProducts = products.filter(p => p.isActive);
    const stats = {
      totalProducts: activeProducts.length,
      totalCategories: categories.filter(c => c.isActive).length,
      totalBrands: [...new Set(activeProducts.map(p => p.brand))].length,
      averagePrice: activeProducts.reduce((sum, p) => sum + p.price, 0) / activeProducts.length || 0,
      totalStock: activeProducts.reduce((sum, p) => sum + (p.stock || 0), 0),
      featuredProducts: activeProducts.filter(p => p.isFeatured).length
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching product stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product statistics'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Product Service is running on port ${PORT}`);
  logger.info(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
  logger.info(`📦 Products API: http://localhost:${PORT}/api/v1/products`);
  logger.info(`📊 API Stats: http://localhost:${PORT}/api/v1/products/stats`);
});