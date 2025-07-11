import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3012;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'payment-service',
    timestamp: new Date().toISOString(),
  });
});

// Payment endpoints
app.post('/api/v1/payments/process', (req, res) => {
  const { amount, currency, method } = req.body;
  res.status(201).json({ 
    message: 'Process payment', 
    data: {
      transactionId: 'txn_' + Date.now(),
      status: 'completed',
      amount,
      currency: currency || 'USD',
      method: method || 'card'
    }
  });
});

app.get('/api/v1/payments/:transactionId', (req, res) => {
  res.json({ 
    message: `Get payment ${req.params.transactionId}`, 
    data: {
      transactionId: req.params.transactionId,
      status: 'completed',
      amount: 100.00,
      currency: 'USD'
    }
  });
});

app.post('/api/v1/payments/:transactionId/refund', (req, res) => {
  res.json({ 
    message: `Refund payment ${req.params.transactionId}`, 
    data: {
      refundId: 'ref_' + Date.now(),
      status: 'refunded',
      amount: req.body.amount
    }
  });
});

app.get('/api/v1/payments/methods', (req, res) => {
  res.json({ 
    message: 'Get payment methods', 
    data: ['card', 'paypal', 'crypto', 'bank_transfer']
  });
});

app.post('/api/v1/payments/validate', (req, res) => {
  res.json({ 
    message: 'Validate payment info', 
    data: { valid: true, errors: [] }
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
  console.log(`Payment Service running on port ${PORT}`);
});

export default app;