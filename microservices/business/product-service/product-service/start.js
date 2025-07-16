const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Home route
app.get('/', (req, res) => {
  res.json({
    service: 'product-service',
    version: '1.0.0',
    status: 'running',
    message: 'UltraMarket Product Service is running!'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'product-service',
    timestamp: new Date().toISOString()
  });
});

// Simple product routes
app.get('/api/products', (req, res) => {
  res.json({
    products: [
      {
        id: '1',
        name: 'MacBook Pro 16"',
        price: 2500,
        category: 'laptops',
        brand: 'Apple'
      },
      {
        id: '2',
        name: 'iPhone 15 Pro',
        price: 1200,
        category: 'smartphones',
        brand: 'Apple'
      }
    ],
    total: 2
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Product service running on port ${PORT}`);
  console.log(`📍 Visit http://localhost:${PORT}`);
});