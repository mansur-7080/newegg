import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { categoryValidation } from '../validators/category.validator';

const router = Router();

// Public routes
router.get('/', CategoryController.getAllCategories);
router.get('/:id', CategoryController.getCategoryById);
router.get('/:id/products', CategoryController.getCategoryProducts);
router.get('/tree', CategoryController.getCategoryTree);

// Protected routes - admin only
router.use(authenticate);

router.post(
  '/',
  validateRequest(categoryValidation.create),
  CategoryController.createCategory
);

router.put(
  '/:id',
  validateRequest(categoryValidation.update),
  CategoryController.updateCategory
);

router.delete('/:id', CategoryController.deleteCategory);

// Category image management
router.post('/:id/image', CategoryController.uploadImage);
router.delete('/:id/image', CategoryController.deleteImage);

export default router;