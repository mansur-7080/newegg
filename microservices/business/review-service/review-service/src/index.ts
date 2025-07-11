import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3010;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'review-service',
    timestamp: new Date().toISOString(),
  });
});

// Reviews endpoints
app.get('/api/v1/reviews', (req, res) => {
  res.json({ message: 'Get all reviews', data: [] });
});

app.get('/api/v1/reviews/:id', (req, res) => {
  res.json({ message: `Get review ${req.params.id}`, data: null });
});

app.post('/api/v1/reviews', (req, res) => {
  res.status(201).json({ message: 'Create review', data: req.body });
});

app.put('/api/v1/reviews/:id', (req, res) => {
  res.json({ message: `Update review ${req.params.id}`, data: req.body });
});

app.delete('/api/v1/reviews/:id', (req, res) => {
  res.json({ message: `Delete review ${req.params.id}` });
});

app.get('/api/v1/products/:productId/reviews', (req, res) => {
  res.json({ message: `Get reviews for product ${req.params.productId}`, data: [] });
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
  console.log(`Review Service running on port ${PORT}`);
});

export default app;