// Simple test server for Product Service
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Test endpoints
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'product-service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1/products', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        name: 'Gaming Laptop',
        price: 1299.99,
        description: 'High-performance gaming laptop',
        category: 'Electronics',
        stock: 15
      },
      {
        id: '2', 
        name: 'Wireless Mouse',
        price: 49.99,
        description: 'Ergonomic wireless mouse',
        category: 'Accessories',
        stock: 50
      },
      {
        id: '3',
        name: 'USB-C Hub',
        price: 79.99,
        description: '7-in-1 USB-C hub with HDMI',
        category: 'Accessories',
        stock: 30
      }
    ],
    total: 3,
    page: 1,
    limit: 10
  });
});

app.get('/api/v1/products/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    success: true,
    data: {
      id,
      name: 'Gaming Laptop',
      price: 1299.99,
      description: 'High-performance gaming laptop with RTX 4060',
      category: 'Electronics',
      brand: 'TechPro',
      stock: 15,
      images: [
        'https://example.com/laptop1.jpg',
        'https://example.com/laptop2.jpg'
      ],
      specifications: {
        processor: 'Intel i7-13700H',
        ram: '16GB DDR5',
        storage: '512GB NVMe SSD',
        graphics: 'NVIDIA RTX 4060',
        display: '15.6" FHD 144Hz'
      }
    }
  });
});

app.post('/api/v1/products', (req, res) => {
  const newProduct = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  
  res.status(201).json({
    success: true,
    data: newProduct,
    message: 'Product created successfully'
  });
});

app.put('/api/v1/products/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    success: true,
    data: {
      id,
      ...req.body,
      updatedAt: new Date().toISOString()
    },
    message: 'Product updated successfully'
  });
});

app.delete('/api/v1/products/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    success: true,
    message: `Product ${id} deleted successfully`
  });
});

// Categories endpoint
app.get('/api/v1/categories', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: '1', name: 'Electronics', slug: 'electronics', productCount: 150 },
      { id: '2', name: 'Accessories', slug: 'accessories', productCount: 89 },
      { id: '3', name: 'Gaming', slug: 'gaming', productCount: 45 },
      { id: '4', name: 'Computers', slug: 'computers', productCount: 67 }
    ]
  });
});

// Search endpoint
app.get('/api/v1/search', (req, res) => {
  const { q } = req.query;
  res.json({
    success: true,
    query: q,
    results: [
      {
        id: '1',
        name: 'Gaming Laptop',
        price: 1299.99,
        category: 'Electronics',
        relevance: 0.95
      }
    ],
    total: 1
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Product Service is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
  console.log(`Products API: http://localhost:${PORT}/api/v1/products`);
});