import { Router } from 'express';
const router = Router();

// Analytics routes
router.get('/dashboard', (req, res) => {
  res.json({
    message: 'Store analytics dashboard',
    data: {
      totalStores: 150,
      activeVendors: 85,
      totalRevenue: 25000000,
      monthlyGrowth: 12.5
    },
    timestamp: new Date().toISOString()
  });
});

router.get('/reports', (req, res) => {
  res.json({
    message: 'Store analytics reports',
    data: [],
    timestamp: new Date().toISOString()
  });
});

export { router as analyticsRoutes };