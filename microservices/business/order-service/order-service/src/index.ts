import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { OrderService } from './services/order.service';
import { setupSwagger } from './docs/swagger';

const app = express();
const PORT = process.env.PORT || 3005;

app.use(helmet());
app.use(cors());
app.use(express.json());

const orderService = new OrderService();

// Setup Swagger
setupSwagger(app);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'order-service',
    timestamp: new Date().toISOString(),
  });
});

// Create order
app.post('/api/v1/orders', async (req, res) => {
  const result = await orderService.createOrder(req.body);
  res.status(result.success ? 201 : 400).json(result);
});

// Get order by id
app.get('/api/v1/orders/:id', async (req, res) => {
  const result = await orderService.getOrderById(req.params.id);
  res.status(result.success ? 200 : 404).json(result);
});

// Update order status
app.patch('/api/v1/orders/:id/status', async (req, res) => {
  const { status, userId } = req.body;
  const result = await orderService.updateOrderStatus(req.params.id, status, userId);
  res.status(result.success ? 200 : 400).json(result);
});

// Get user orders
app.get('/api/v1/orders/user/:userId', async (req, res) => {
  const { page, limit, status } = req.query;
  const result = await orderService.getUserOrders(
    req.params.userId,
    page ? parseInt(page as string) : 1,
    limit ? parseInt(limit as string) : 10,
    status as string
  );
  res.status(result.success ? 200 : 400).json(result);
});

// Cancel order
app.post('/api/v1/orders/:id/cancel', async (req, res) => {
  const { userId } = req.body;
  const result = await orderService.cancelOrder(req.params.id, userId);
  res.status(result.success ? 200 : 400).json(result);
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
  // eslint-disable-next-line no-console
  console.log(`Order Service running on port ${PORT}`);
});

export default app;