import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3016;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'recommendation-service',
    timestamp: new Date().toISOString(),
  });
});

// Recommendation endpoints
app.get('/api/v1/recommendations/user/:userId', (req, res) => {
  res.json({
    message: `Get recommendations for user ${req.params.userId}`,
    data: {
      userId: req.params.userId,
      recommendations: [
        { productId: 'prod_1', score: 0.95, reason: 'Based on your purchase history' },
        { productId: 'prod_2', score: 0.87, reason: 'Customers who bought similar items' },
        { productId: 'prod_3', score: 0.82, reason: 'Trending in your category' },
      ],
      algorithm: 'collaborative_filtering',
      generatedAt: new Date().toISOString(),
    },
  });
});

app.get('/api/v1/recommendations/product/:productId/similar', (req, res) => {
  res.json({
    message: `Get similar products for ${req.params.productId}`,
    data: {
      productId: req.params.productId,
      similarProducts: [
        { productId: 'prod_4', similarity: 0.91, reason: 'Same category and features' },
        { productId: 'prod_5', similarity: 0.85, reason: 'Similar price range' },
        { productId: 'prod_6', similarity: 0.78, reason: 'Frequently bought together' },
      ],
      algorithm: 'content_based',
    },
  });
});

app.get('/api/v1/recommendations/trending', (req, res) => {
  const { category, timeframe = '7d' } = req.query;
  res.json({
    message: `Get trending products for ${timeframe}`,
    data: {
      category,
      timeframe,
      trendingProducts: [
        { productId: 'prod_7', trendScore: 0.98, views: 15000, purchases: 450 },
        { productId: 'prod_8', trendScore: 0.94, views: 12000, purchases: 380 },
        { productId: 'prod_9', trendScore: 0.89, views: 10000, purchases: 320 },
      ],
      algorithm: 'trend_analysis',
    },
  });
});

app.post('/api/v1/recommendations/feedback', (req, res) => {
  const { userId, productId, action, rating } = req.body;
  res.status(201).json({
    message: 'Record recommendation feedback',
    data: {
      feedbackId: 'feedback_' + Date.now(),
      userId,
      productId,
      action,
      rating,
      recordedAt: new Date().toISOString(),
    },
  });
});

app.post('/api/v1/recommendations/retrain', (req, res) => {
  res.status(202).json({
    message: 'Retrain recommendation models',
    data: {
      jobId: 'retrain_' + Date.now(),
      status: 'queued',
      estimatedDuration: '30 minutes',
      startedAt: new Date().toISOString(),
    },
  });
});

app.get('/api/v1/recommendations/cart/:userId/suggestions', (req, res) => {
  res.json({
    message: `Get cart-based suggestions for user ${req.params.userId}`,
    data: {
      userId: req.params.userId,
      cartSuggestions: [
        { productId: 'prod_10', reason: 'Frequently bought together', confidence: 0.88 },
        { productId: 'prod_11', reason: 'Complete your setup', confidence: 0.75 },
      ],
      algorithm: 'market_basket_analysis',
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

app.listen(PORT, () => {
  console.log(`Recommendation Service running on port ${PORT}`);
});

export default app;
