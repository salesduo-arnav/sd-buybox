import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';
import { listConfigs, updateConfig } from '../controllers/admin.controller';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

// GET /api/admin/configs
router.get('/configs', listConfigs);

// PUT /api/admin/configs/:key
router.put('/configs/:key', updateConfig);

export default router;
