import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import notificationRoutes from './routes/notification.routes';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { NotificationService } from './services/notification.service';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3009;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  })
);

// Rate limiting
const notificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many notification requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/notifications', notificationLimiter);

// General middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/v1/notifications', notificationRoutes);

// Error handling middleware
app.use(errorHandler);

// Initialize notification service
let notificationService: NotificationService;

// Start server
const startServer = async () => {
  try {
    // Connect to databases
    await connectDatabase();
    await connectRedis();

    // Initialize notification service
    notificationService = new NotificationService();

    // Start scheduled notification processor
    setInterval(() => {
      notificationService.processScheduledNotifications();
    }, 60000); // Check every minute

    app.listen(PORT, () => {
      logger.info(`Notification Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info('Notification providers configured:', {
        email: !!process.env.SMTP_HOST,
        sms: !!process.env.SMS_API_KEY,
        push: !!process.env.FIREBASE_SERVER_KEY,
      });
    });
  } catch (error) {
    logger.error('Failed to start Notification Service', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received. Closing HTTP server...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received. Closing HTTP server...');
  process.exit(0);
});

startServer();