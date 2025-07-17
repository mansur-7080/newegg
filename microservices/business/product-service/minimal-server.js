const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'product-service',
    timestamp: new Date().toISOString(),
    message: 'Product service is running successfully!'
  });
});

// Product endpoints
const products = [
  {
    id: '1',
    name: 'Gaming Laptop',
    price: 1299.99,
    category: 'Electronics',
    description: 'High-performance gaming laptop',
    stock: 10,
    brand: 'TechPro',
    image: 'https://example.com/laptop.jpg'
  },
  {
    id: '2',
    name: 'Wireless Mouse',
    price: 49.99,
    category: 'Accessories',
    description: 'Ergonomic wireless mouse',
    stock: 50,
    brand: 'ProGear',
    image: 'https://example.com/mouse.jpg'
  },
  {
    id: '3',
    name: 'USB-C Hub',
    price: 79.99,
    category: 'Accessories',
    description: '7-in-1 USB-C hub',
    stock: 25,
    brand: 'ConnectPro',
    image: 'https://example.com/hub.jpg'
  }
];

// Get all products
app.get('/api/v1/products', (req, res) => {
  const { page = 1, limit = 10, category, search } = req.query;
  
  let filteredProducts = [...products];
  
  // Filter by category
  if (category) {
    filteredProducts = filteredProducts.filter(p => 
      p.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  // Search
  if (search) {
    filteredProducts = filteredProducts.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
    );
  }
  
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
      pages: Math.ceil(filteredProducts.length / limit)
    }
  });
});

// Get product by ID
app.get('/api/v1/products/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  
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
});

// Create product
app.post('/api/v1/products', (req, res) => {
  const newProduct = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  
  products.push(newProduct);
  
  res.status(201).json({
    success: true,
    data: newProduct,
    message: 'Product created successfully'
  });
});

// Update product
app.put('/api/v1/products/:id', (req, res) => {
  const index = products.findIndex(p => p.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }
  
  products[index] = {
    ...products[index],
    ...req.body,
    id: req.params.id,
    updatedAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: products[index],
    message: 'Product updated successfully'
  });
});

// Delete product
app.delete('/api/v1/products/:id', (req, res) => {
  const index = products.findIndex(p => p.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }
  
  products.splice(index, 1);
  
  res.json({
    success: true,
    message: 'Product deleted successfully'
  });
});

// Categories endpoint
app.get('/api/v1/categories', (req, res) => {
  const categories = [
    { id: '1', name: 'Electronics', slug: 'electronics' },
    { id: '2', name: 'Accessories', slug: 'accessories' },
    { id: '3', name: 'Computers', slug: 'computers' }
  ];
  
  res.json({
    success: true,
    data: categories
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Product Service is running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📦 Products API: http://localhost:${PORT}/api/v1/products`);
});