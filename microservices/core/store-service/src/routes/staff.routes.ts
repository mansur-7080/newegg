import { Router } from 'express';

const router = Router({ mergeParams: true });

// Get all staff for a store
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Store staff retrieved successfully',
    data: [],
  });
});

// Add staff member
router.post('/', (req, res) => {
  res.status(201).json({
    success: true,
    message: 'Staff member added successfully',
    data: req.body,
  });
});

// Update staff role/permissions
router.put('/:staffId', (req, res) => {
  res.json({
    success: true,
    message: 'Staff member updated successfully',
    data: req.body,
  });
});

// Remove staff member
router.delete('/:staffId', (req, res) => {
  res.json({
    success: true,
    message: 'Staff member removed successfully',
  });
});

export default router;