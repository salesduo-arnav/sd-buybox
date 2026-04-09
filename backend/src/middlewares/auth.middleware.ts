import { NextFunction, Request, Response } from 'express';
import Logger from '../utils/logger';
import { env } from '../config/env';
import { corePlatform } from '../services/corePlatform.client';
import { CorePlatformError, CorePlatformUser, Membership } from '../types/corePlatform';
import { apiError } from '../utils/handle_error';

// Auth middleware chain — buybox delegates all identity to sd-core-platform.
//
// Three composable middlewares:
//
//   authenticate         Validates the session cookie against core-platform
//                        and attaches req.auth = { user, sessionId }.
//
//   resolveOrganization  Reads the x-organization-id header, verifies the
//                        user is actually a member of that org, and attaches
//                        req.auth.organization + req.auth.role. A user with
//                        exactly one membership falls through to it by
//                        default for better single-tenant UX.
//
//   requireSuperuser     Gates admin-only routes on req.auth.user.is_superuser.
//
// Usage in routes/index.ts:
//   router.use('/auth/me', authenticate, meHandler);
//   router.use('/products', authenticate, resolveOrganization, productRoutes);
//   router.use('/admin', authenticate, resolveOrganization, requireSuperuser, adminRoutes);

// Bounded session cache

interface CacheEntry {
    user: CorePlatformUser;
    expiresAt: number;
}

// LRU-ish cache: capped at env.session.cacheMaxEntries. When full we evict
// the oldest entry (Map preserves insertion order). This caps memory
// regardless of how many distinct session ids we see.
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
    if (sessionCache.size >= env.session.cacheMaxEntries) {
        const oldestKey = sessionCache.keys().next().value;
        if (oldestKey) sessionCache.delete(oldestKey);
    }
    sessionCache.set(sessionId, { user, expiresAt: Date.now() + env.session.cacheTtlMs });
}

export function clearSessionCache(sessionId: string): void {
    sessionCache.delete(sessionId);
}

// Authenticate

type AuthErrorCode =
    | 'UNAUTHENTICATED'
    | 'AUTH_UPSTREAM_UNAVAILABLE'
    | 'ORG_REQUIRED'
    | 'ORG_FORBIDDEN'
    | 'SUPERUSER_REQUIRED'
    | 'INTERNAL_ERROR';

function authError(res: Response, status: number, code: AuthErrorCode, message: string) {
    return apiError(res, status, code, message);
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    const sessionId: string | undefined = req.cookies?.[env.session.cookieName];

    if (!sessionId) {
        return authError(res, 401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const cachedUser = cacheGet(sessionId);
    if (cachedUser) {
        req.auth = { user: cachedUser, sessionId };
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
                res.clearCookie(env.session.cookieName);
                return authError(res, 401, 'UNAUTHENTICATED', 'Session expired');
            }
            if (error.isUpstreamUnavailable) {
                Logger.error('Core-platform auth upstream unavailable', {
                    code: error.code,
                    message: error.message,
                });
                return authError(res, 503, 'AUTH_UPSTREAM_UNAVAILABLE', 'Authentication service temporarily unavailable');
            }
        }
        Logger.error('Unexpected error in authenticate middleware', {
            error: error instanceof Error ? error.message : String(error),
        });
        return authError(res, 500, 'INTERNAL_ERROR', 'Authentication failed');
    }
}

// Resolve Organization

function findMembership(memberships: Membership[], organizationId: string): Membership | undefined {
    return memberships.find((membership) => membership.organization?.id === organizationId);
}

export function resolveOrganization(req: Request, res: Response, next: NextFunction): void | Response {
    if (!req.auth) {
        // Programmer error — authenticate must run first.
        Logger.error('resolveOrganization called before authenticate');
        return authError(res, 500, 'INTERNAL_ERROR', 'Auth middleware misconfigured');
    }

    const memberships = req.auth.user.memberships ?? [];
    const requestedOrgId = (req.headers['x-organization-id'] as string | undefined)?.trim();

    let selectedMembership: Membership | undefined;

    if (requestedOrgId) {
        selectedMembership = findMembership(memberships, requestedOrgId);
        if (!selectedMembership) {
            return authError(res, 403, 'ORG_FORBIDDEN', 'You do not have access to this organization');
        }
    } else if (memberships.length === 1) {
        selectedMembership = memberships[0];
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

    req.auth.organization = selectedMembership.organization;
    req.auth.role = selectedMembership.role;
    return next();
}

// Require Superuser

export function requireSuperuser(req: Request, res: Response, next: NextFunction): void | Response {
    if (!req.auth?.user) {
        return authError(res, 401, 'UNAUTHENTICATED', 'Authentication required');
    }
    if (!req.auth.user.is_superuser) {
        return authError(res, 403, 'SUPERUSER_REQUIRED', 'Superuser access required');
    }
    return next();
}
