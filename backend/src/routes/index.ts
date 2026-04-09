import { Router } from 'express';
import { authenticate, resolveOrganization, requireSuperuser } from '../middlewares/auth.middleware';
import { requireAnyEntitlement } from '../middlewares/entitlements.middleware';
import authRoutes from './auth.routes';
import visibilityRoutes from './visibility.routes';
import productRoutes from './product.routes';
import alertRoutes from './alert.routes';
import scanRoutes from './scan.routes';
import settingsRoutes from './settings.routes';
import adminRoutes from './admin.routes';
import integrationsRoutes from './integrations.routes';
import entitlementsRoutes from './entitlements.routes';

// Root API router.
//
// The auth chain is mounted once, per-group, at this level. Individual
// feature routers do NOT call `router.use(authenticate)` — they trust the
// chain established here:
//
//   /auth               -> authenticate only (/me), or public (/logout)
//   unlockedOrgChain    -> authenticate + resolveOrganization (no paywall)
//   orgChain            -> unlockedOrgChain + requireAnyEntitlement (paywall)
//   /admin              -> orgChain + requireSuperuser
//
// Routes mounted on the unlockedOrgChain keep working while the org is
// in the 'expired' billing state — the frontend needs them to render the
// locked shell and the upgrade CTA.

const router = Router();

router.use('/auth', authRoutes);

const unlockedOrgChain = [authenticate, resolveOrganization];
const orgChain = [...unlockedOrgChain, requireAnyEntitlement];

// Must stay reachable while expired — the frontend locked shell needs them.
router.use('/entitlements', ...unlockedOrgChain, entitlementsRoutes);
router.use('/integrations', ...unlockedOrgChain, integrationsRoutes);

// Gated feature routes — return 402 SUBSCRIPTION_REQUIRED when expired.
router.use('/visibility', ...orgChain, visibilityRoutes);
router.use('/products',   ...orgChain, productRoutes);
router.use('/alerts',     ...orgChain, alertRoutes);
router.use('/scans',      ...orgChain, scanRoutes);
router.use('/settings',   ...orgChain, settingsRoutes);
router.use('/admin',      ...orgChain, requireSuperuser, adminRoutes);

export default router;
