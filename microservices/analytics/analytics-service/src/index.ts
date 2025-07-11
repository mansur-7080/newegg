import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3015;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'analytics-service',
    timestamp: new Date().toISOString(),
  });
});

// Analytics endpoints
app.get('/api/v1/analytics/dashboard', (req, res) => {
  res.json({
    message: 'Get dashboard analytics',
    data: {
      totalOrders: 1250,
      totalRevenue: 125000,
      totalUsers: 5000,
      conversionRate: 3.2,
      topProducts: [
        { id: 'prod_1', name: 'Gaming Laptop', sales: 50, revenue: 75000 },
        { id: 'prod_2', name: 'Wireless Mouse', sales: 200, revenue: 15000 }
      ]
    }
  });
});

app.get('/api/v1/analytics/sales', (req, res) => {
  const { period } = req.query;
  res.json({
    message: `Get sales analytics for ${period || 'month'}`,
    data: {
      period: period || 'month',
      totalSales: 125000,
      orderCount: 1250,
      averageOrderValue: 100,
      dailyBreakdown: [
        { date: '2024-01-01', sales: 5000, orders: 50 },
        { date: '2024-01-02', sales: 6000, orders: 60 }
      ]
    }
  });
});

app.get('/api/v1/analytics/users', (req, res) => {
  res.json({
    message: 'Get user analytics',
    data: {
      totalUsers: 5000,
      activeUsers: 1500,
      newUsers: 250,
      userRetention: 65.5,
      demographics: {
        ageGroups: { '18-25': 30, '26-35': 40, '36-45': 20, '46+': 10 },
        locations: { 'USA': 60, 'Europe': 25, 'Asia': 15 }
      }
    }
  });
});

app.post('/api/v1/analytics/track', (req, res) => {
  const { event, userId, properties } = req.body;
  res.status(201).json({
    message: 'Track analytics event',
    data: {
      eventId: 'event_' + Date.now(),
      event,
      userId,
      properties,
      timestamp: new Date().toISOString()
    }
  });
});

app.get('/api/v1/analytics/reports/:reportType', (req, res) => {
  res.json({
    message: `Generate ${req.params.reportType} report`,
    data: {
      reportId: 'report_' + Date.now(),
      type: req.params.reportType,
      generatedAt: new Date().toISOString(),
      downloadUrl: `/reports/${req.params.reportType}_${Date.now()}.pdf`
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
  console.log(`Analytics Service running on port ${PORT}`);
});

export default app;