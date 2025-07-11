import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3013;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'inventory-service',
    timestamp: new Date().toISOString(),
  });
});

// Inventory endpoints
app.get('/api/v1/inventory', (req, res) => {
  res.json({ 
    message: 'Get all inventory', 
    data: [
      { productId: 'prod_1', quantity: 50, reserved: 5, available: 45 },
      { productId: 'prod_2', quantity: 25, reserved: 2, available: 23 }
    ]
  });
});

app.get('/api/v1/inventory/:productId', (req, res) => {
  res.json({ 
    message: `Get inventory for product ${req.params.productId}`, 
    data: { productId: req.params.productId, quantity: 50, reserved: 5, available: 45 }
  });
});

app.post('/api/v1/inventory/:productId/reserve', (req, res) => {
  const { quantity } = req.body;
  res.json({ 
    message: `Reserve ${quantity} items for product ${req.params.productId}`, 
    data: { reservationId: 'res_' + Date.now(), quantity }
  });
});

app.post('/api/v1/inventory/:productId/release', (req, res) => {
  const { reservationId } = req.body;
  res.json({ 
    message: `Release reservation ${reservationId} for product ${req.params.productId}`, 
    data: { released: true }
  });
});

app.put('/api/v1/inventory/:productId', (req, res) => {
  const { quantity } = req.body;
  res.json({ 
    message: `Update inventory for product ${req.params.productId}`, 
    data: { productId: req.params.productId, newQuantity: quantity }
  });
});

app.post('/api/v1/inventory/check-availability', (req, res) => {
  const { items } = req.body;
  res.json({ 
    message: 'Check availability for multiple items', 
    data: { available: true, items: items?.map((item: any) => ({ ...item, available: true })) || [] }
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
  console.log(`Inventory Service running on port ${PORT}`);
});

export default app;