import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import corePlatformService from '../services/core_platform.service';
import visibilityRoutes from './visibility.routes';
import productRoutes from './product.routes';
import alertRoutes from './alert.routes';
import scanRoutes from './scan.routes';
import settingsRoutes from './settings.routes';
import adminRoutes from './admin.routes';

const router = Router();

// Auth endpoint — proxies to core platform
router.get('/auth/me', authenticate, (req, res) => {
    const { memberships, ...user } = req.user!;
    res.json({
        status: 'success',
        data: {
            ...user,
            full_name: user.name,
            memberships: memberships || [],
        },
    });
});

// Logout — clear session on core platform and clear cookie
router.post('/auth/logout', async (req, res) => {
    try {
        const sessionId = req.cookies.session_id;
        if (sessionId) {
            await corePlatformService.logout(sessionId);
        }
        res.clearCookie('session_id');
        res.json({ status: 'success' });
    } catch {
        res.clearCookie('session_id');
        res.json({ status: 'success' });
    }
});

// Feature routes
router.use('/visibility', visibilityRoutes);
router.use('/products', productRoutes);
router.use('/alerts', alertRoutes);
router.use('/scans', scanRoutes);
router.use('/settings', settingsRoutes);
router.use('/admin', adminRoutes);

export default router;
