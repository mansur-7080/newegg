import { Router } from 'express';
import { 
  getAllProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  getProductsByCategory,
  getFeaturedProducts,
  searchProducts
} from '../controllers/product.controller';
import { validateProduct, validateProductUpdate } from '../middleware/validation';

const router = Router();

// GET /api/v1/products
router.get('/', getAllProducts);

// GET /api/v1/products/search
router.get('/search', searchProducts);

// GET /api/v1/products/featured
router.get('/featured', getFeaturedProducts);

// GET /api/v1/products/category/:categoryId
router.get('/category/:categoryId', getProductsByCategory);

// GET /api/v1/products/:id
router.get('/:id', getProductById);

// POST /api/v1/products
router.post('/', validateProduct, createProduct);

// PUT /api/v1/products/:id
router.put('/:id', validateProductUpdate, updateProduct);

// DELETE /api/v1/products/:id
router.delete('/:id', deleteProduct);

export default router;