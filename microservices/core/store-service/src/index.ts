/**
 * UltraMarket Store Service
 * Multi-vendor store management service
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import winston from 'winston';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3004;
const prisma = new PrismaClient();

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/store-service.log' })
  ]
});

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'store-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Store management endpoints
app.get('/api/stores', async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
      include: {
        owner: true,
        products: true
      }
    });
    
    res.json({
      success: true,
      data: stores,
      count: stores.length
    });
  } catch (error) {
    logger.error('Error fetching stores:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.get('/api/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store = await prisma.store.findUnique({
      where: { id: parseInt(id) },
      include: {
        owner: true,
        products: true,
        categories: true
      }
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }

    res.json({
      success: true,
      data: store
    });
  } catch (error) {
    logger.error('Error fetching store:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/api/stores', async (req, res) => {
  try {
    const { name, description, ownerId, address, phone, email } = req.body;

    const store = await prisma.store.create({
      data: {
        name,
        description,
        ownerId,
        address,
        phone,
        email,
        status: 'ACTIVE'
      }
    });

    res.status(201).json({
      success: true,
      data: store
    });
  } catch (error) {
    logger.error('Error creating store:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.put('/api/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const store = await prisma.store.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({
      success: true,
      data: store
    });
  } catch (error) {
    logger.error('Error updating store:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.delete('/api/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.store.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Store deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting store:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Store analytics endpoints
app.get('/api/stores/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock analytics data
    const analytics = {
      totalProducts: 150,
      totalOrders: 1250,
      totalRevenue: 45000000,
      monthlyGrowth: 12.5,
      topProducts: [
        { id: 1, name: 'iPhone 15', sales: 45 },
        { id: 2, name: 'Samsung Galaxy', sales: 38 },
        { id: 3, name: 'MacBook Pro', sales: 25 }
      ]
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error fetching store analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message,
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested resource was not found',
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`Store Service running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

export default app;