import { Router } from 'express';
import { triggerScan, listScans, getScan } from '../controllers/scan.controller';

// Auth + org-scoping are mounted centrally in routes/index.ts.
const router = Router();

// POST /api/scans/trigger
router.post('/trigger', triggerScan);

// GET /api/scans?account_id=uuid
router.get('/', listScans);

// GET /api/scans/:id
router.get('/:id', getScan);

export default router;
