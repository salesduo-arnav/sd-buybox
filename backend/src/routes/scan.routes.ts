import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { triggerScan, listScans, getScan } from '../controllers/scan.controller';

const router = Router();

router.use(authenticate);

// POST /api/scans/trigger
router.post('/trigger', triggerScan);

// GET /api/scans?account_id=uuid
router.get('/', listScans);

// GET /api/scans/:id
router.get('/:id', getScan);

export default router;
