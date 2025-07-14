import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import paymentRoutes from './routes/payment.routes';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3008;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  })
);

// Rate limiting
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per 15 minutes
  message: 'Too many payment requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/payments', paymentLimiter);

// General middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'payment-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/v1/payments', paymentRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to databases
    await connectDatabase();
    await connectRedis();

    app.listen(PORT, () => {
      logger.info(`Payment Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info('Payment providers configured:', {
        click: !!process.env.CLICK_SERVICE_ID,
        payme: !!process.env.PAYME_MERCHANT_ID,
        uzcard: !!process.env.UZCARD_MERCHANT_ID,
        apelsin: !!process.env.APELSIN_MERCHANT_ID,
      });
    });
  } catch (error) {
    logger.error('Failed to start Payment Service', error);
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