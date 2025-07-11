import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3011;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'shipping-service',
    timestamp: new Date().toISOString(),
  });
});

// Shipping endpoints
app.get('/api/v1/shipping/rates', (req, res) => {
  res.json({ 
    message: 'Get shipping rates', 
    data: [
      { method: 'standard', price: 9.99, days: '5-7' },
      { method: 'express', price: 19.99, days: '2-3' },
      { method: 'overnight', price: 39.99, days: '1' }
    ]
  });
});

app.post('/api/v1/shipping/calculate', (req, res) => {
  res.json({ message: 'Calculate shipping cost', data: { cost: 9.99, method: 'standard' } });
});

app.get('/api/v1/shipping/track/:trackingNumber', (req, res) => {
  res.json({ 
    message: `Track shipment ${req.params.trackingNumber}`, 
    data: { status: 'in-transit', location: 'Distribution Center' }
  });
});

app.post('/api/v1/shipping/create', (req, res) => {
  res.status(201).json({ 
    message: 'Create shipment', 
    data: { trackingNumber: 'ULT' + Date.now(), status: 'created' }
  });
});

app.put('/api/v1/shipping/:id/status', (req, res) => {
  res.json({ message: `Update shipment ${req.params.id} status`, data: req.body });
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
  console.log(`Shipping Service running on port ${PORT}`);
});

export default app;