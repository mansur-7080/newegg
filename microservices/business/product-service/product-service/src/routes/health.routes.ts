import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

// GET /api/v1/health
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Product Service is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;