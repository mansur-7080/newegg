/**
 * UltraMarket Product Service - Entry Point
 * REAL WORKING IMPLEMENTATION
 */

import express from 'express';
import cors from 'cors';
import productRoutes from './routes/product.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'product-service',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/v1/products', productRoutes);

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`✅ Product Service running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🛍️  API endpoints: http://localhost:${PORT}/api/v1/products`);
});

export default app;
