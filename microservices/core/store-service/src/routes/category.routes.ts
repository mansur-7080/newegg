import { Router } from 'express';

const router = Router({ mergeParams: true });

// Get all categories for a store
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Store categories retrieved successfully',
    data: [],
  });
});

// Create new category
router.post('/', (req, res) => {
  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: req.body,
  });
});

// Update category
router.put('/:categoryId', (req, res) => {
  res.json({
    success: true,
    message: 'Category updated successfully',
    data: req.body,
  });
});

// Delete category
router.delete('/:categoryId', (req, res) => {
  res.json({
    success: true,
    message: 'Category deleted successfully',
  });
});

export default router;