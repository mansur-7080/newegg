import { Router } from 'express';
import { 
  getAllCategories, 
  getCategoryById, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} from '../controllers/category.controller';

const router = Router();

// GET /api/v1/categories
router.get('/', getAllCategories);

// GET /api/v1/categories/:id
router.get('/:id', getCategoryById);

// POST /api/v1/categories
router.post('/', createCategory);

// PUT /api/v1/categories/:id
router.put('/:id', updateCategory);

// DELETE /api/v1/categories/:id
router.delete('/:id', deleteCategory);

export default router;