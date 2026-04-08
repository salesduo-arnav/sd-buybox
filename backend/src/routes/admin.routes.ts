import { Router } from 'express';
import { listConfigs, updateConfig } from '../controllers/admin.controller';

// Auth + org-scoping + requireSuperuser are mounted centrally in routes/index.ts.
const router = Router();

// GET /api/admin/configs
router.get('/configs', listConfigs);

// PUT /api/admin/configs/:key
router.put('/configs/:key', updateConfig);

export default router;
