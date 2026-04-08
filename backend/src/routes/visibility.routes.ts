import { Router } from 'express';
import { getOverview } from '../controllers/visibility.controller';

// Auth + org-scoping are mounted centrally in routes/index.ts.
const router = Router();

// GET /api/visibility/overview?period=last_30_days&account_id=uuid
router.get('/overview', getOverview);

export default router;
