import { Router } from 'express';
const router = Router();

// Vendor management routes
router.get('/', (req, res) => {
  res.json({
    message: 'Get all vendors',
    data: [],
    timestamp: new Date().toISOString()
  });
});

router.post('/', (req, res) => {
  res.json({
    message: 'Create new vendor',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

router.get('/:id', (req, res) => {
  res.json({
    message: 'Get vendor by ID',
    data: { id: req.params.id },
    timestamp: new Date().toISOString()
  });
});

export { router as vendorRoutes };