const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3004;

// Middleware
app.use(cors());
app.use(express.json());

// Service URLs
const services = {
  cart: 'http://localhost:3000',
  auth: 'http://localhost:3001',
  products: 'http://localhost:3002', 
  orders: 'http://localhost:3003',
  payments: 'http://localhost:3005',
  search: 'http://localhost:3006',
  notifications: 'http://localhost:3007',
  files: 'http://localhost:3008'
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    routes: Object.keys(services)
  });
});

// Proxy middleware for each service
app.use('/api/auth', createProxyMiddleware({
  target: services.auth,
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '/api/auth'
  },
  onError: (err, req, res) => {
    console.error('Auth service proxy error:', err.message);
    res.status(503).json({ error: 'Auth service unavailable' });
  }
}));

app.use('/api/products', createProxyMiddleware({
  target: services.products,
  changeOrigin: true,
  pathRewrite: {
    '^/api/products': '/api/products'
  },
  onError: (err, req, res) => {
    console.error('Product service proxy error:', err.message);
    res.status(503).json({ error: 'Product service unavailable' });
  }
}));

app.use('/api/orders', createProxyMiddleware({
  target: services.orders,
  changeOrigin: true,
  pathRewrite: {
    '^/api/orders': '/api/orders'
  },
  onError: (err, req, res) => {
    console.error('Order service proxy error:', err.message);
    res.status(503).json({ error: 'Order service unavailable' });
  }
}));

app.use('/api/cart', createProxyMiddleware({
  target: services.cart,
  changeOrigin: true,
  pathRewrite: {
    '^/api/cart': ''
  },
  onError: (err, req, res) => {
    console.error('Cart service proxy error:', err.message);
    res.status(503).json({ error: 'Cart service unavailable' });
  }
}));

app.use('/api/payments', createProxyMiddleware({
  target: services.payments,
  changeOrigin: true,
  pathRewrite: {
    '^/api/payments': '/api/payments'
  },
  onError: (err, req, res) => {
    console.error('Payment service proxy error:', err.message);
    res.status(503).json({ error: 'Payment service unavailable' });
  }
}));

app.use('/api/search', createProxyMiddleware({
  target: services.search,
  changeOrigin: true,
  pathRewrite: {
    '^/api/search': '/api/search'
  },
  onError: (err, req, res) => {
    console.error('Search service proxy error:', err.message);
    res.status(503).json({ error: 'Search service unavailable' });
  }
}));

app.use('/api/notifications', createProxyMiddleware({
  target: services.notifications,
  changeOrigin: true,
  pathRewrite: {
    '^/api/notifications': '/api/notifications'
  },
  onError: (err, req, res) => {
    console.error('Notification service proxy error:', err.message);
    res.status(503).json({ error: 'Notification service unavailable' });
  }
}));

app.use('/api/files', createProxyMiddleware({
  target: services.files,
  changeOrigin: true,
  pathRewrite: {
    '^/api/files': '/api/files'
  },
  onError: (err, req, res) => {
    console.error('File service proxy error:', err.message);
    res.status(503).json({ error: 'File service unavailable' });
  }
}));

// Default route
app.get('/', (req, res) => {
  res.json({
    name: 'UltraMarket API Gateway',
    version: '1.0.0',
    services: services,
    endpoints: [
      'GET /health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/products',
      'POST /api/orders',
      'GET /api/cart',
      'POST /api/payments/create',
      'GET /api/search',
      'POST /api/notifications/send',
      'POST /api/files/upload'
    ]
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(500).json({ error: 'Internal gateway error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    available_routes: ['/health', '/api/auth', '/api/products', '/api/orders', '/api/cart', '/api/payments', '/api/search', '/api/notifications', '/api/files']
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📍 Gateway URL: http://localhost:${PORT}`);
  console.log(`🔗 Services:`, services);
});

module.exports = app;