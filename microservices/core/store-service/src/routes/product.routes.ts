import { Router } from 'express';

const router = Router({ mergeParams: true });

// Get all products for a store
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Store products retrieved successfully',
    data: {
      products: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    },
  });
});

// Get product by ID
router.get('/:productId', (req, res) => {
  res.json({
    success: true,
    message: 'Product retrieved successfully',
    data: null,
  });
});

// Create new product
router.post('/', (req, res) => {
  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: req.body,
  });
});

// Update product
router.put('/:productId', (req, res) => {
  res.json({
    success: true,
    message: 'Product updated successfully',
    data: req.body,
  });
});

// Delete product
router.delete('/:productId', (req, res) => {
  res.json({
    success: true,
    message: 'Product deleted successfully',
  });
});

export default router;