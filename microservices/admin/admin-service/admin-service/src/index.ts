import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3019;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'admin-service',
    timestamp: new Date().toISOString(),
  });
});

// Admin endpoints
app.get('/api/v1/admin/dashboard', (req, res) => {
  res.json({
    message: 'Get admin dashboard data',
    data: {
      stats: {
        totalUsers: 5000,
        totalOrders: 1250,
        totalRevenue: 125000,
        activeServices: 15
      },
      recentActivity: [
        { type: 'order', description: 'New order #1234', timestamp: new Date() },
        { type: 'user', description: 'User registration', timestamp: new Date() }
      ],
      systemHealth: {
        cpu: 45,
        memory: 62,
        storage: 35,
        uptime: '99.9%'
      }
    }
  });
});

app.get('/api/v1/admin/users', (req, res) => {
  const { page = 1, limit = 20, search, status } = req.query;
  res.json({
    message: 'Get all users',
    data: {
      users: [
        { id: 'user_1', email: 'user1@example.com', status: 'active', registeredAt: new Date() },
        { id: 'user_2', email: 'user2@example.com', status: 'active', registeredAt: new Date() }
      ],
      pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total: 100 },
      filters: { search, status }
    }
  });
});

app.put('/api/v1/admin/users/:userId/status', (req, res) => {
  const { status } = req.body;
  res.json({
    message: `Update user ${req.params.userId} status to ${status}`,
    data: { userId: req.params.userId, newStatus: status, updatedAt: new Date() }
  });
});

app.get('/api/v1/admin/orders', (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  res.json({
    message: 'Get all orders',
    data: {
      orders: [
        { id: 'order_1', userId: 'user_1', total: 99.99, status: 'completed', createdAt: new Date() },
        { id: 'order_2', userId: 'user_2', total: 149.99, status: 'pending', createdAt: new Date() }
      ],
      pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total: 250 }
    }
  });
});

app.get('/api/v1/admin/services/health', (req, res) => {
  res.json({
    message: 'Get all services health status',
    data: {
      services: [
        { name: 'auth-service', status: 'healthy', uptime: '99.9%', responseTime: '45ms' },
        { name: 'product-service', status: 'healthy', uptime: '99.8%', responseTime: '62ms' },
        { name: 'order-service', status: 'healthy', uptime: '99.7%', responseTime: '38ms' }
      ],
      overallStatus: 'healthy',
      checkedAt: new Date()
    }
  });
});

app.post('/api/v1/admin/announcements', (req, res) => {
  const { title, message, type, targetUsers } = req.body;
  res.status(201).json({
    message: 'Create system announcement',
    data: {
      announcementId: 'announce_' + Date.now(),
      title,
      message,
      type,
      targetUsers,
      status: 'active',
      createdAt: new Date()
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

app.listen(PORT, () => {
  console.log(`Admin Service running on port ${PORT}`);
});

export default app;