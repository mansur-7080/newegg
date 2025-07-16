import { Router } from 'express';
import { VendorController } from '../controllers/vendor.controller';

const router = Router();
const vendorController = new VendorController();

// Vendor management routes
router.get('/', vendorController.getAllVendors);
router.get('/:id', vendorController.getVendorById);
router.post('/', vendorController.createVendor);
router.put('/:id', vendorController.updateVendor);
router.delete('/:id', vendorController.deleteVendor);

// Vendor verification
router.patch('/:id/verify', vendorController.verifyVendor);
router.get('/:id/stores', vendorController.getVendorStores);

export default router;