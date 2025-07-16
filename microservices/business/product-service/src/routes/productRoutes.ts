import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { ProductService } from '../services/ProductService';
import { ProductRepository } from '../repositories/ProductRepository';
import { DatabaseManager } from '../config/database';
import { CacheManager } from '../shared/cache';

/**
 * Professional Product Routes - Real REST API Routes
 * Complete CRUD operations for products
 */

// Initialize dependencies
const database = DatabaseManager.getInstance().getClient();
const cache = new CacheManager();
const repository = new ProductRepository(database, cache);
const service = new ProductService(repository, cache);
const controller = new ProductController(service);

const router = Router();

// Product CRUD operations
router.get('/', controller.getProducts.bind(controller));
router.get('/search', controller.searchProducts.bind(controller));
router.get('/statistics', controller.getProductStatistics.bind(controller));
router.get('/low-stock', controller.getLowStockProducts.bind(controller));
router.get('/health', controller.healthCheck.bind(controller));
router.get('/categories/:categoryId', controller.getProductsByCategory.bind(controller));
router.get('/:id', controller.getProductById.bind(controller));

router.post('/', controller.createProduct.bind(controller));
router.post('/:id/activate', controller.activateProduct.bind(controller));
router.post('/:id/deactivate', controller.deactivateProduct.bind(controller));
router.post('/:id/inventory', controller.updateInventory.bind(controller));

router.put('/:id', controller.updateProduct.bind(controller));
router.put('/bulk', controller.bulkUpdateProducts.bind(controller));

router.delete('/:id', controller.deleteProduct.bind(controller));

export default router;