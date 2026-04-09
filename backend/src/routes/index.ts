import { Router } from 'express';
import { authenticate, resolveOrganization, requireSuperuser } from '../middlewares/auth.middleware';
import authRoutes from './auth.routes';
import visibilityRoutes from './visibility.routes';
import productRoutes from './product.routes';
import alertRoutes from './alert.routes';
import scanRoutes from './scan.routes';
import settingsRoutes from './settings.routes';
import adminRoutes from './admin.routes';
import integrationsRoutes from './integrations.routes';

// Root API router.
//
// The auth chain is mounted once, per-group, at this level. Individual
// feature routers do NOT call `router.use(authenticate)` — they trust the
// chain established here:
//
//   /auth      -> authenticate only (/me), or public (/logout)
//   /<feature> -> authenticate + resolveOrganization
//   /admin     -> authenticate + resolveOrganization + requireSuperuser

const router = Router();

router.use('/auth', authRoutes);

const orgChain = [authenticate, resolveOrganization];

router.use('/visibility',   ...orgChain, visibilityRoutes);
router.use('/products',     ...orgChain, productRoutes);
router.use('/alerts',       ...orgChain, alertRoutes);
router.use('/scans',        ...orgChain, scanRoutes);
router.use('/settings',     ...orgChain, settingsRoutes);
router.use('/integrations', ...orgChain, integrationsRoutes);
router.use('/admin',        ...orgChain, requireSuperuser, adminRoutes);

export default router;
