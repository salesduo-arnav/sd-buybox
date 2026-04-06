import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { getOverview } from '../controllers/visibility.controller';

const router = Router();

router.use(authenticate);

// GET /api/visibility/overview?period=last_30_days&account_id=uuid
router.get('/overview', getOverview);

export default router;
