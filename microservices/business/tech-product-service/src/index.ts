import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { TechProductController } from './controllers/tech-product.controller';
import { SpecsComparisonController } from './controllers/specs-comparison.controller';
import { PCBuilderController } from './controllers/pc-builder.controller';
import { TechCategoryController } from './controllers/tech-category.controller';
import { errorHandler } from './middleware';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 3020;

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'tech-product-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Logging
app.use(logger);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'tech-product-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
  });
});

// Tech Product routes
app.get('/api/v1/tech-products', TechProductController.getProducts);
app.get('/api/v1/tech-products/search', TechProductController.searchProducts);
app.get('/api/v1/tech-products/filter', TechProductController.filterProducts);
app.get('/api/v1/tech-products/:id', TechProductController.getProduct);
app.get('/api/v1/tech-products/:id/specs', TechProductController.getDetailedSpecs);
app.get('/api/v1/tech-products/:id/compatibility', TechProductController.getCompatibility);
app.get('/api/v1/tech-products/:id/reviews', TechProductController.getProductReviews);
app.get('/api/v1/tech-products/:id/benchmarks', TechProductController.getBenchmarks);

// Category management
app.get('/api/v1/tech-categories', TechCategoryController.getCategories);
app.get('/api/v1/tech-categories/:category/products', TechCategoryController.getCategoryProducts);
app.get('/api/v1/tech-categories/:category/filters', TechCategoryController.getCategoryFilters);
app.get(
  '/api/v1/tech-categories/:category/specs-template',
  TechCategoryController.getSpecsTemplate
);

// PC Builder routes
app.post('/api/v1/pc-builder/validate', PCBuilderController.validateBuild);
app.post('/api/v1/pc-builder/estimate-power', PCBuilderController.estimatePowerConsumption);
app.post('/api/v1/pc-builder/calculate-performance', PCBuilderController.calculatePerformance);
app.post('/api/v1/pc-builder/optimize-budget', PCBuilderController.optimizeBudget);
app.post('/api/v1/pc-builder/save', PCBuilderController.saveBuild);
app.get('/api/v1/pc-builder/builds/:userId', PCBuilderController.getUserBuilds);
app.get('/api/v1/pc-builder/builds/public/trending', PCBuilderController.getTrendingBuilds);
app.get('/api/v1/pc-builder/components/:category', PCBuilderController.getCompatibleComponents);

// Comparison routes
app.post('/api/v1/compare/products', SpecsComparisonController.compareProducts);
app.get('/api/v1/compare/categories/:category', SpecsComparisonController.getComparableProducts);
app.post('/api/v1/compare/save', SpecsComparisonController.saveComparison);
app.get('/api/v1/compare/saved/:userId', SpecsComparisonController.getSavedComparisons);

// Uzbekistan specific routes
app.get('/api/v1/uzbekistan/vendors', TechProductController.getUzbekVendors);
app.get('/api/v1/uzbekistan/warranty/:productId', TechProductController.getWarrantyInfo);
app.get('/api/v1/uzbekistan/delivery-options/:productId', TechProductController.getDeliveryOptions);
app.get('/api/v1/uzbekistan/support-centers', TechProductController.getSupportCenters);

// Price tracking
app.get('/api/v1/price-history/:productId', TechProductController.getPriceHistory);
app.post('/api/v1/price-alerts', TechProductController.createPriceAlert);
app.get('/api/v1/price-alerts/:userId', TechProductController.getUserPriceAlerts);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    service: 'tech-product-service',
  });
});

logger.info(`� Tech Product Service running on port ${PORT}`);
logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
logger.info(`📊 Health check: ${process.env.API_BASE_URL || `http://localhost:${PORT}`}/health`);
logger.info(`🖥️ PC Builder API: ${process.env.API_BASE_URL || `http://localhost:${PORT}`}/api/v1/pc-builder`);
logger.info(`⚖️ Comparison API: ${process.env.API_BASE_URL || `http://localhost:${PORT}`}/api/v1/compare`);

export default app;
