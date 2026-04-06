import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { getSettings, updateSettings } from '../controllers/settings.controller';

const router = Router();

router.use(authenticate);

// GET /api/settings/:accountId
router.get('/:accountId', getSettings);

// PUT /api/settings/:accountId
router.put('/:accountId', updateSettings);

export default router;
