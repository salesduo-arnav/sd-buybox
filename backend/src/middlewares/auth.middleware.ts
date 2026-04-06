import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import Logger from '../utils/logger';

interface Membership {
    organization: { id: string; name: string; slug?: string };
    role: { id: number; name: string; slug?: string };
}

interface CachedUserData {
    id: string;
    email: string;
    name: string;
    is_superuser?: boolean;
    memberships: Membership[];
}

// In-memory session cache with 5-min TTL
const sessionCache = new Map<string, { user: CachedUserData; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCachedUserData(sessionId: string): CachedUserData | null {
    const cached = sessionCache.get(sessionId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.user;
    }
    if (cached) {
        sessionCache.delete(sessionId);
    }
    return null;
}

function cacheUserData(sessionId: string, user: CachedUserData): void {
    sessionCache.set(sessionId, {
        user,
        expiresAt: Date.now() + CACHE_TTL_MS,
    });
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {

    try {
        const sessionId = req.cookies.session_id;

        if (!sessionId) {
            return res.status(401).json({ status: 'error', message: 'Authentication required' });
        }

        let cached = getCachedUserData(sessionId);

        if (!cached) {
            const corePlatformUrl = process.env.CORE_PLATFORM_INTERNAL_URL || process.env.CORE_PLATFORM_URL;
            if (!corePlatformUrl) {
                Logger.error('CORE_PLATFORM_URL not configured');
                return res.status(500).json({ status: 'error', message: 'Authentication service unavailable' });
            }

            const response = await axios.get(`${corePlatformUrl}/auth/me`, {
                headers: {
                    Cookie: `session_id=${sessionId}`,
                    'User-Agent': req.headers['user-agent'] || '',
                    'X-Forwarded-For': req.ip || '',
                },
                timeout: 30000,
            });

            const userData = response.data?.user || response.data;
            if (!userData || !userData.id) {
                return res.status(401).json({ status: 'error', message: 'Invalid session' });
            }

            cached = {
                id: userData.id,
                email: userData.email,
                name: userData.full_name || userData.name,
                is_superuser: userData.is_superuser,
                memberships: userData.memberships || [],
            };

            cacheUserData(sessionId, cached);
        }

        // Resolve organization_id: prefer header, fall back to first membership
        let orgId = req.headers['x-organization-id'] as string;
        if (!orgId && cached.memberships.length > 0) {
            orgId = cached.memberships[0].organization?.id;
        }

        req.user = {
            id: cached.id,
            email: cached.email,
            name: cached.name,
            organization_id: orgId,
            is_superuser: cached.is_superuser,
            memberships: cached.memberships,
        };
        next();
    } catch (error: any) {
        if (error.response?.status === 401) {
            return res.status(401).json({ status: 'error', message: 'Session expired' });
        }
        Logger.error('Auth middleware error:', error.message);
        return res.status(500).json({ status: 'error', message: 'Authentication service error' });
    }
};

export const clearSessionCache = () => sessionCache.clear();
