import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';

config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
  });
});

// Auth routes placeholder
app.get('/api/auth/status', (req, res) => {
  res.json({
    message: 'Auth service is running',
    version: '1.0.0',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔐 Auth Service running on port ${PORT}`);
});

export default app;
