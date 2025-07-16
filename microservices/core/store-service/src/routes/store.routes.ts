import { Router } from 'express';
import { StoreController } from '../controllers/store.controller';

const router = Router();
const storeController = new StoreController();

// Store management routes
router.get('/', storeController.getAllStores);
router.get('/:id', storeController.getStoreById);
router.post('/', storeController.createStore);
router.put('/:id', storeController.updateStore);
router.delete('/:id', storeController.deleteStore);

// Store status management
router.patch('/:id/status', storeController.updateStoreStatus);
router.get('/:id/analytics', storeController.getStoreAnalytics);

export default router;