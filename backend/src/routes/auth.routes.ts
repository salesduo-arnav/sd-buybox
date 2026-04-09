import { Router } from 'express';
import Logger from '../utils/logger';
import { env } from '../config/env';
import { authenticate, clearSessionCache } from '../middlewares/auth.middleware';
import { corePlatform, CorePlatformError } from '../services/corePlatform.client';
import { apiSuccess } from '../utils/handle_error';
import { getCurrentUser } from '../utils/request_auth';

const router = Router();

// GET /api/auth/me
// Returns the currently authenticated user along with their org/role memberships.
// Does NOT run resolveOrganization — a fresh user with no orgs, or one who
// hasn't chosen an active org yet, must still be able to fetch themselves.
router.get('/me', authenticate, (req, res) => {
    return apiSuccess(res, getCurrentUser(req));
});

// POST /api/auth/logout
// Clears the session on core-platform, evicts our local cache, and clears
// the cookie. Never fails loudly — logout is idempotent by design.
router.post('/logout', async (req, res) => {
    const sessionId: string | undefined = req.cookies?.[env.session.cookieName];

    if (sessionId) {
        clearSessionCache(sessionId);
        try {
            await corePlatform.session.logout(sessionId);
        } catch (error) {
            // Upstream failure shouldn't block the user from being logged out locally.
            if (error instanceof CorePlatformError) {
                Logger.warn('Core-platform logout failed (clearing cookie anyway)', {
                    code: error.code,
                    status: error.status,
                });
            } else {
                Logger.warn('Unexpected error during logout', {
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }

    res.clearCookie(env.session.cookieName);
    return apiSuccess(res, { loggedOut: true });
});

export default router;
