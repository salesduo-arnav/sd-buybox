import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { listProducts, getProduct } from '../controllers/product.controller';

const router = Router();

router.use(authenticate);

// GET /api/products?page=1&limit=20&search=...&account_id=uuid
router.get('/', listProducts);

// GET /api/products/:id
router.get('/:id', getProduct);

export default router;
