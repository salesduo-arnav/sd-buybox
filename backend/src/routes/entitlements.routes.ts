import { Router } from 'express';
import { getMe, refresh } from '../controllers/entitlements.controller';


const router = Router();

router.get('/me', getMe);
router.post('/refresh', refresh);

export default router;
