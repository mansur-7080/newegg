const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3003;

// In-memory order storage
const orders = new Map();
let orderCounter = 1000;

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to generate order number
const generateOrderNumber = () => {
  return `UM${Date.now()}-${orderCounter++}`;
};

// Helper function to verify user token
const verifyUserToken = async (token) => {
  try {
    const response = await axios.post('http://localhost:3001/auth/verify', { token });
    return response.data.valid ? response.data.user : null;
  } catch (error) {
    return null;
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'order-service',
    timestamp: new Date().toISOString(),
    orders: orders.size
  });
});

// Create order
app.post('/orders', async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, notes } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    
    const token = authHeader.substring(7);
    const user = await verifyUserToken(token);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order items are required' });
    }
    
    if (!shippingAddress) {
      return res.status(400).json({ error: 'Shipping address is required' });
    }
    
    // Calculate totals
    let subtotal = 0;
    const orderItems = items.map(item => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      return {
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        total: itemTotal
      };
    });
    
    const taxRate = 0.12; // 12% tax
    const taxAmount = subtotal * taxRate;
    const shippingCost = subtotal > 100 ? 0 : 15; // Free shipping over $100
    const totalAmount = subtotal + taxAmount + shippingCost;
    
    // Create order
    const orderId = Date.now().toString();
    const order = {
      id: orderId,
      orderNumber: generateOrderNumber(),
      userId: user.id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      status: 'PENDING',
      items: orderItems,
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      shippingCost,
      totalAmount: Math.round(totalAmount * 100) / 100,
      shippingAddress,
      paymentMethod: paymentMethod || 'CASH_ON_DELIVERY',
      paymentStatus: 'PENDING',
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    orders.set(orderId, order);
    
    res.status(201).json({
      message: 'Order created successfully',
      order
    });
    
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user orders
app.get('/orders', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { status, page = 1, limit = 10 } = req.query;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    
    const token = authHeader.substring(7);
    const user = await verifyUserToken(token);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Filter user orders
    let userOrders = Array.from(orders.values()).filter(order => order.userId === user.id);
    
    // Filter by status if provided
    if (status) {
      userOrders = userOrders.filter(order => order.status === status.toUpperCase());
    }
    
    // Sort by creation date (newest first)
    userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedOrders = userOrders.slice(startIndex, endIndex);
    
    res.json({
      orders: paginatedOrders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: userOrders.length,
        pages: Math.ceil(userOrders.length / Number(limit))
      }
    });
    
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get order by ID
app.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    
    const token = authHeader.substring(7);
    const user = await verifyUserToken(token);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const order = orders.get(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Check if user owns this order
    if (order.userId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ order });
    
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status
app.patch('/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    
    const token = authHeader.substring(7);
    const user = await verifyUserToken(token);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const order = orders.get(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Check if user owns this order
    if (order.userId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Validate status
    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }
    
    // Update order
    order.status = status;
    order.updatedAt = new Date().toISOString();
    
    orders.set(orderId, order);
    
    res.json({
      message: 'Order status updated successfully',
      order
    });
    
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel order
app.delete('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    
    const token = authHeader.substring(7);
    const user = await verifyUserToken(token);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const order = orders.get(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Check if user owns this order
    if (order.userId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if order can be cancelled
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      return res.status(400).json({ error: 'Order cannot be cancelled' });
    }
    
    // Update order status to cancelled
    order.status = 'CANCELLED';
    order.updatedAt = new Date().toISOString();
    
    orders.set(orderId, order);
    
    res.json({
      message: 'Order cancelled successfully',
      order
    });
    
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get order statistics
app.get('/orders/stats/summary', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    
    const token = authHeader.substring(7);
    const user = await verifyUserToken(token);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const userOrders = Array.from(orders.values()).filter(order => order.userId === user.id);
    
    const stats = {
      totalOrders: userOrders.length,
      totalSpent: userOrders.reduce((sum, order) => sum + order.totalAmount, 0),
      statusBreakdown: {
        pending: userOrders.filter(o => o.status === 'PENDING').length,
        confirmed: userOrders.filter(o => o.status === 'CONFIRMED').length,
        processing: userOrders.filter(o => o.status === 'PROCESSING').length,
        shipped: userOrders.filter(o => o.status === 'SHIPPED').length,
        delivered: userOrders.filter(o => o.status === 'DELIVERED').length,
        cancelled: userOrders.filter(o => o.status === 'CANCELLED').length
      },
      averageOrderValue: userOrders.length > 0 ? 
        Math.round((userOrders.reduce((sum, order) => sum + order.totalAmount, 0) / userOrders.length) * 100) / 100 : 0
    };
    
    res.json({ stats });
    
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all orders (admin endpoint - simplified)
app.get('/admin/orders', (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let allOrders = Array.from(orders.values());
    
    // Filter by status if provided
    if (status) {
      allOrders = allOrders.filter(order => order.status === status.toUpperCase());
    }
    
    // Sort by creation date (newest first)
    allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedOrders = allOrders.slice(startIndex, endIndex);
    
    res.json({
      orders: paginatedOrders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: allOrders.length,
        pages: Math.ceil(allOrders.length / Number(limit))
      },
      summary: {
        totalOrders: orders.size,
        totalRevenue: Array.from(orders.values()).reduce((sum, order) => sum + order.totalAmount, 0)
      }
    });
    
  } catch (error) {
    console.error('Get admin orders error:', error);
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
  console.log(`🚀 Order Service running on port ${PORT}`);
  console.log(`📋 Orders in memory: ${orders.size}`);
  console.log(`💰 Payment methods: CASH_ON_DELIVERY, CARD, CLICK, PAYME`);
  console.log(`🚚 Free shipping on orders over $100`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down Order Service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down Order Service...');
  process.exit(0);
});