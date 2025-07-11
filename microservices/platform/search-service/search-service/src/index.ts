import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from '@ultramarket/common';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3007;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'search-service',
    timestamp: new Date().toISOString(),
  });
});

// Search endpoints
app.get('/api/v1/search', (req, res) => {
  const { q, category, sort, page = 1, limit = 20 } = req.query;
  res.json({
    message: 'Search products',
    data: {
      query: q,
      category,
      sort,
      results: [],
      pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total: 0 }
    }
  });
});

app.get('/api/v1/search/suggestions', (req, res) => {
  const { q } = req.query;
  res.json({
    message: 'Get search suggestions',
    data: {
      query: q,
      suggestions: ['laptop', 'laptop gaming', 'laptop dell']
    }
  });
});

app.post('/api/v1/search/index', (req, res) => {
  res.status(201).json({
    message: 'Index product for search',
    data: { indexed: true, productId: req.body.productId }
  });
});

app.delete('/api/v1/search/index/:productId', (req, res) => {
  res.json({
    message: `Remove product ${req.params.productId} from search index`,
    data: { removed: true }
  });
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'UltraMarket Search Service',
    version: '1.0.0',
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Search Service running on port ${PORT}`);
});

export default app;
