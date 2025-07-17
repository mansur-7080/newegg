import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { validateRequest } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { productValidation } from '../validators/product.validator';

const router = Router();

// Public routes
router.get('/search', ProductController.searchProducts);
router.get('/', ProductController.getAllProducts);
router.get('/:id', ProductController.getProductById);
router.get('/:id/reviews', ProductController.getProductReviews);
router.get('/category/:categoryId', ProductController.getProductsByCategory);
router.get('/brand/:brand', ProductController.getProductsByBrand);

// Protected routes - require authentication
router.use(authenticate);

// Create product - vendor or admin only
router.post(
  '/',
  validateRequest(productValidation.create),
  ProductController.createProduct
);

// Update product - owner or admin only
router.put(
  '/:id',
  validateRequest(productValidation.update),
  ProductController.updateProduct
);

// Delete product - owner or admin only
router.delete('/:id', ProductController.deleteProduct);

// Inventory management
router.post('/:id/inventory', ProductController.updateInventory);
router.get('/:id/inventory', ProductController.getInventory);

// Product images
router.post('/:id/images', ProductController.uploadImages);
router.delete('/:id/images/:imageId', ProductController.deleteImage);

// Bulk operations - admin only
router.post('/bulk/import', ProductController.bulkImport);
router.post('/bulk/export', ProductController.bulkExport);

export default router;