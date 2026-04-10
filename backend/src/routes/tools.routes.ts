import { Router } from 'express';
import { getToolBySlug } from '../controllers/tools.controller';

const router = Router();

// GET /api/tools/by-slug/:slug — fetch tool metadata (required_integrations).
// Auth middleware is mounted by routes/index.ts.
router.get('/by-slug/:slug', getToolBySlug);

export default router;
