import { Router } from 'express';
import { listProducts, getProduct } from '../controllers/product.controller';

// Auth + org-scoping are mounted centrally in routes/index.ts.
const router = Router();

// GET /api/products?page=1&limit=20&search=...&account_id=uuid
router.get('/', listProducts);

// GET /api/products/:id
router.get('/:id', getProduct);

export default router;
