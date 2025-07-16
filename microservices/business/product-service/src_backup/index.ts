/**
 * UltraMarket Product Service
 * Professional product catalog and inventory management service
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3003;
const HOST = process.env.HOST ?? 'localhost';

// Security middleware
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? '*',
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '1000', 10),
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'product-service',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION ?? '1.0.0',
  });
});

// API routes
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[ERROR HANDLER]', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500,
    },
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

// Start server
async function startServer() {
  try {
    // Start server
    app.listen(PORT, HOST, () => {
      console.log(`[INFO] Product service started successfully at ${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error('[ERROR] Failed to start product service', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[INFO] SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[INFO] SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();

export default app;
