import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from '@ultramarket/common';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
  });
});

// Notification endpoints
app.post('/api/v1/notifications/send', (req, res) => {
  const { userId, type, title, message, channel } = req.body;
  res.status(201).json({
    message: 'Send notification',
    data: {
      notificationId: 'notif_' + Date.now(),
      userId,
      type,
      title,
      message,
      channel: channel || 'email',
      status: 'sent'
    }
  });
});

app.get('/api/v1/notifications/:userId', (req, res) => {
  res.json({
    message: `Get notifications for user ${req.params.userId}`,
    data: {
      notifications: [
        { id: 'notif_1', title: 'Order Confirmed', message: 'Your order has been confirmed', read: false },
        { id: 'notif_2', title: 'Shipment Update', message: 'Your order is on the way', read: true }
      ],
      unreadCount: 1
    }
  });
});

app.put('/api/v1/notifications/:notificationId/read', (req, res) => {
  res.json({
    message: `Mark notification ${req.params.notificationId} as read`,
    data: { marked: true }
  });
});

app.post('/api/v1/notifications/bulk-send', (req, res) => {
  const { userIds, type, title, message } = req.body;
  res.status(201).json({
    message: 'Send bulk notifications',
    data: {
      batchId: 'batch_' + Date.now(),
      userCount: userIds?.length || 0,
      status: 'queued'
    }
  });
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'UltraMarket Notification Service',
    version: '1.0.0',
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Notification Service running on port ${PORT}`);
});

export default app;
