import { NextFunction, Request, Response } from 'express';
import Logger from '../utils/logger';
import { corePlatform } from '../services/corePlatform.client';
import { CorePlatformError, CorePlatformUser, Membership } from '../types/corePlatform';

/**
 * Auth middleware chain — buybox delegates all identity to sd-core-platform.
 *
 * Three composable middlewares:
 *
 *   authenticate         Validates the session_id cookie against core-platform
 *                        and attaches req.auth = { user, sessionId }.
 *
 *   resolveOrganization  Reads the x-organization-id header, verifies the
 *                        user is actually a member of that org, and attaches
 *                        req.auth.organization + req.auth.role. No silent
 *                        fallback to "first membership" — the header must
 *                        match a real membership, or 403.
 *
 *   requireSuperuser     Gates admin-only routes on req.auth.user.is_superuser.
 *
 * Usage in routes/index.ts:
 *   router.use('/auth/me', authenticate, meHandler);
 *   router.use('/products', authenticate, resolveOrganization, productRoutes);
 *   router.use('/admin',    authenticate, resolveOrganization, requireSuperuser, adminRoutes);
 */

// ----- session cache ---------------------------------------------------------

const SESSION_CACHE_TTL_MS = Number(process.env.SESSION_CACHE_TTL_MS) || 60_000;
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'session_id';

interface CacheEntry {
    user: CorePlatformUser;
    expiresAt: number;
}

const sessionCache = new Map<string, CacheEntry>();

function cacheGet(sessionId: string): CorePlatformUser | null {
    const entry = sessionCache.get(sessionId);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
        sessionCache.delete(sessionId);
        return null;
    }
    return entry.user;
}

function cacheSet(sessionId: string, user: CorePlatformUser): void {
    sessionCache.set(sessionId, { user, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });
}

export function clearSessionCache(sessionId?: string): void {
    if (sessionId) sessionCache.delete(sessionId);
    else sessionCache.clear();
}

// ----- error envelope --------------------------------------------------------

type AuthErrorCode =
    | 'UNAUTHENTICATED'
    | 'AUTH_UPSTREAM_UNAVAILABLE'
    | 'ORG_REQUIRED'
    | 'ORG_FORBIDDEN'
    | 'SUPERUSER_REQUIRED';

function authError(res: Response, status: number, code: AuthErrorCode, message: string) {
    return res.status(status).json({ status: 'error', error: { code, message } });
}

// ----- authenticate ----------------------------------------------------------

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    const sessionId: string | undefined = req.cookies?.[SESSION_COOKIE_NAME];

    if (!sessionId) {
        return authError(res, 401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const cached = cacheGet(sessionId);
    if (cached) {
        req.auth = { user: cached, sessionId };
        return next();
    }

    try {
        const user = await corePlatform.session.validate(sessionId, {
            userAgent: req.headers['user-agent'] || undefined,
            ip: req.ip || undefined,
        });
        cacheSet(sessionId, user);
        req.auth = { user, sessionId };
        return next();
    } catch (error) {
        if (error instanceof CorePlatformError) {
            if (error.isUnauthorized) {
                clearSessionCache(sessionId);
                res.clearCookie(SESSION_COOKIE_NAME);
                return authError(res, 401, 'UNAUTHENTICATED', 'Session expired');
            }
            if (error.isUpstreamUnavailable) {
                Logger.error('Core-platform auth upstream unavailable', { code: error.code, message: error.message });
                return authError(res, 503, 'AUTH_UPSTREAM_UNAVAILABLE', 'Authentication service temporarily unavailable');
            }
        }
        Logger.error('Unexpected error in authenticate middleware', {
            error: error instanceof Error ? error.message : String(error),
        });
        return authError(res, 500, 'UNAUTHENTICATED', 'Authentication failed');
    }
}

// ----- resolveOrganization ---------------------------------------------------

function findMembership(memberships: Membership[], orgId: string): Membership | undefined {
    return memberships.find((m) => m.organization?.id === orgId);
}

export function resolveOrganization(req: Request, res: Response, next: NextFunction): void | Response {
    if (!req.auth) {
        // Programmer error — authenticate must run first.
        Logger.error('resolveOrganization called before authenticate');
        return authError(res, 500, 'UNAUTHENTICATED', 'Auth middleware misconfigured');
    }

    const memberships = req.auth.user.memberships ?? [];
    const headerOrgId = (req.headers['x-organization-id'] as string | undefined)?.trim();

    let membership: Membership | undefined;

    if (headerOrgId) {
        membership = findMembership(memberships, headerOrgId);
        if (!membership) {
            return authError(res, 403, 'ORG_FORBIDDEN', 'You do not have access to this organization');
        }
    } else if (memberships.length === 1) {
        membership = memberships[0];
    } else if (memberships.length === 0) {
        return authError(res, 403, 'ORG_FORBIDDEN', 'User has no organization memberships');
    } else {
        return authError(
            res,
            400,
            'ORG_REQUIRED',
            'x-organization-id header is required when user belongs to multiple organizations'
        );
    }

    req.auth.organization = membership.organization;
    req.auth.role = membership.role;
    return next();
}

// ----- requireSuperuser ------------------------------------------------------

export function requireSuperuser(req: Request, res: Response, next: NextFunction): void | Response {
    if (!req.auth?.user) {
        return authError(res, 401, 'UNAUTHENTICATED', 'Authentication required');
    }
    if (!req.auth.user.is_superuser) {
        return authError(res, 403, 'SUPERUSER_REQUIRED', 'Superuser access required');
    }
    return next();
}
