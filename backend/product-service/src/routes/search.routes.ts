import { Router } from 'express';
import { searchProducts } from '../controllers/product.controller';

const router = Router();

// GET /api/v1/search
router.get('/', searchProducts);

export default router;