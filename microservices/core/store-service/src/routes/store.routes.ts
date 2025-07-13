import { Router } from 'express';
import { StoreController } from '../controllers/store.controller';
import { requireRole, requireStoreOwner } from '../middleware/auth.middleware';

const router = Router();
const storeController = new StoreController();

// Public routes
router.get('/', storeController.getStores);
router.get('/slug/:slug', storeController.getStoreBySlug);
router.get('/:id', StoreController.getStoreValidation, storeController.getStoreById);

// Protected routes
router.post('/', 
  StoreController.createStoreValidation,
  storeController.createStore
);

router.get('/my/stores', storeController.getMyStores);

router.put('/:id',
  StoreController.updateStoreValidation,
  requireStoreOwner,
  storeController.updateStore
);

router.delete('/:id',
  StoreController.getStoreValidation,
  requireStoreOwner,
  storeController.deleteStore
);

router.get('/:id/stats',
  StoreController.getStoreValidation,
  requireStoreOwner,
  storeController.getStoreStats
);

// Admin only routes
router.post('/:id/verify',
  StoreController.getStoreValidation,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  storeController.verifyStore
);

export default router;