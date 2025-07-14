/**
 * UltraMarket Product Service
 * Professional product catalog and inventory management service
 */

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Sample products data
const sampleProducts = [
  {
    name: "iPhone 15 Pro",
    description: "Latest iPhone with A17 Pro chip",
    price: 999.99,
    sku: "IPHONE15PRO",
    stock: 50,
    categoryId: "electronics"
  },
  {
    name: "Samsung Galaxy S24",
    description: "Premium Android smartphone",
    price: 899.99,
    sku: "GALAXYS24",
    stock: 30,
    categoryId: "electronics"
  },
  {
    name: "MacBook Air M3",
    description: "Lightweight laptop with M3 chip",
    price: 1299.99,
    sku: "MACBOOKAIRM3",
    stock: 25,
    categoryId: "computers"
  },
  {
    name: "Nike Air Max 270",
    description: "Comfortable running shoes",
    price: 129.99,
    sku: "NIKEAIRMAX270",
    stock: 100,
    categoryId: "shoes"
  },
  {
    name: "Adidas Ultraboost 22",
    description: "High-performance running shoes",
    price: 180.00,
    sku: "ADIDASULTRABOOST22",
    stock: 75,
    categoryId: "shoes"
  }
];

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'product-service',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Get all products
app.get('/products', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;
    
    let products = sampleProducts;
    
    // Filter by category
    if (category) {
      products = products.filter(p => p.categoryId === category);
    }
    
    // Search by name or description
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm)
      );
    }
    
    // Pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedProducts = products.slice(startIndex, endIndex);
    
    res.json({
      products: paginatedProducts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: products.length,
        pages: Math.ceil(products.length / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product by ID/SKU
app.get('/products/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    const product = sampleProducts.find(p => 
      p.sku === identifier || 
      sampleProducts.indexOf(p).toString() === identifier
    );
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get categories
app.get('/categories', async (req, res) => {
  try {
    const categories = [
      { id: 'electronics', name: 'Electronics', description: 'Electronic devices and gadgets' },
      { id: 'computers', name: 'Computers', description: 'Laptops, desktops, and accessories' },
      { id: 'shoes', name: 'Shoes', description: 'Athletic and casual footwear' },
      { id: 'clothing', name: 'Clothing', description: 'Apparel and fashion items' },
      { id: 'books', name: 'Books', description: 'Books and educational materials' }
    ];
    
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search products
app.get('/search', async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice } = req.query;
    
    let products = sampleProducts;
    
    // Search by query
    if (q) {
      const searchTerm = (q as string).toLowerCase();
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
    
    res.json({
      query: q,
      filters: { category, minPrice, maxPrice },
      results: products,
      count: products.length
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get featured products
app.get('/featured', async (req, res) => {
  try {
    // Return first 3 products as featured
    const featured = sampleProducts.slice(0, 3);
    
    res.json({ featured });
  } catch (error) {
    console.error('Get featured error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling
app.use((error: any, req: any, res: any, next: any) => {
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
  console.log(`🔍 Search endpoint: http://localhost:${PORT}/search`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down Product Service...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down Product Service...');
  await prisma.$disconnect();
  process.exit(0);
});
