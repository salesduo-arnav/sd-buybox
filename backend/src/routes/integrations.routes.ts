import { Router } from 'express';
import { listAccounts } from '../controllers/integrations.controller';

const router = Router();

// GET /api/integrations/accounts — list connected integration accounts
// for the active organization. Auth + org middleware are mounted by
// routes/index.ts, so this router assumes req.auth is fully populated.
router.get('/accounts', listAccounts);

export default router;
