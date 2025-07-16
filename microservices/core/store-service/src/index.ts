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

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3004;

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
  });
});

// Store management endpoints
app.get('/api/stores', (req, res) => {
  res.json({
    message: 'List of stores',
    stores: [
      { id: 1, name: 'Tech Store', vendor: 'vendor1', status: 'active' },
      { id: 2, name: 'Fashion Store', vendor: 'vendor2', status: 'active' },
      { id: 3, name: 'Home Store', vendor: 'vendor3', status: 'pending' },
    ],
  });
});

app.get('/api/stores/:id', (req, res) => {
  const storeId = req.params.id;
  res.json({
    message: `Store details for ID: ${storeId}`,
    store: {
      id: storeId,
      name: 'Sample Store',
      vendor: 'vendor1',
      status: 'active',
      description: 'A sample store for demonstration',
      createdAt: new Date().toISOString(),
    },
  });
});

app.post('/api/stores', (req, res) => {
  const { name, vendor, description } = req.body;
  res.status(201).json({
    message: 'Store created successfully',
    store: {
      id: Math.floor(Math.random() * 1000),
      name,
      vendor,
      description,
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message,
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Store Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;