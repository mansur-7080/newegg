import { Router } from 'express';
import { ProductController, 
  getProductsValidation, 
  createProductValidation, 
  updateProductValidation,
  createCategoryValidation,
  searchProductsValidation 
} from '../controllers/productController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Public routes
router.get('/products', getProductsValidation, ProductController.getProducts);
router.get('/products/:id', ProductController.getProduct);
router.get('/categories', ProductController.getCategories);
router.get('/search', searchProductsValidation, ProductController.searchProducts);
router.get('/recommendations', ProductController.getRecommendations);

// Protected routes (Admin/Seller only)
router.post('/products', authenticateToken, createProductValidation, ProductController.createProduct);
router.put('/products/:id', authenticateToken, updateProductValidation, ProductController.updateProduct);
router.delete('/products/:id', authenticateToken, ProductController.deleteProduct);
router.post('/categories', authenticateToken, createCategoryValidation, ProductController.createCategory);

export default router;
