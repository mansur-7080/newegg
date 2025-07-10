import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import {
  validateProduct,
  validateQuery,
  createProductSchema,
  updateProductSchema,
  createCategorySchema,
  createReviewSchema,
  productQuerySchema,
  reviewQuerySchema,
} from '../validators/productValidator';
import rateLimit from 'express-rate-limit';

const router = Router();
const productController = new ProductController();

// Rate limiting
const createProductLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 product creations per windowMs
  message: {
    success: false,
    message: 'Too many products created from this IP, please try again later.',
  },
});

const createReviewLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 reviews per hour
  message: {
    success: false,
    message: 'Too many reviews created from this IP, please try again later.',
  },
});

// Product routes
router.post(
  '/products',
  createProductLimit,
  validateProduct(createProductSchema),
  productController.createProduct
);

router.get('/products', validateQuery(productQuerySchema), productController.searchProducts);

router.get('/products/featured', productController.getFeaturedProducts);
router.get('/products/stats', productController.getProductStats);

router.get('/products/:id', productController.getProduct);
router.get('/products/:id/related', productController.getRelatedProducts);
router.get('/products/:id/availability', productController.checkAvailability);

router.put('/products/:id', validateProduct(updateProductSchema), productController.updateProduct);

router.delete('/products/:id', productController.deleteProduct);

router.patch('/products/:id/inventory', productController.updateInventory);

// SKU-based product route
router.get('/products/sku/:sku', productController.getProductBySku);

// Category routes
router.post('/categories', validateProduct(createCategorySchema), productController.createCategory);

router.get('/categories', productController.getCategories);
router.get('/categories/:slug', productController.getCategoryBySlug);

// Review routes
router.post(
  '/products/:id/reviews',
  createReviewLimit,
  validateProduct(createReviewSchema),
  productController.createReview
);

router.get(
  '/products/:id/reviews',
  validateQuery(reviewQuerySchema),
  productController.getProductReviews
);

export default router;
