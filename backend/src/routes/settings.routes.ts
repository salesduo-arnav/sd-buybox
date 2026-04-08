import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller';

// Auth + org-scoping are mounted centrally in routes/index.ts.
const router = Router();

// GET /api/settings/:accountId
router.get('/:accountId', getSettings);

// PUT /api/settings/:accountId
router.put('/:accountId', updateSettings);

export default router;
