import { NextFunction, Request, Response } from 'express';
import { CorePlatformError, CorePlatformUser } from '../types/corePlatform';

// Mock Logger (avoid file transport writes) and the core-platform client
// (so tests don't touch the network).
jest.mock('../utils/logger', () => ({
    __esModule: true,
    default: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        http: jest.fn(),
    },
}));

const mockValidateSession = jest.fn();
jest.mock('../services/corePlatform.client', () => ({
    corePlatform: {
        session: {
            validate: (...args: unknown[]) => mockValidateSession(...args),
        },
    },
    CorePlatformError: jest.requireActual('../types/corePlatform').CorePlatformError,
}));

// Import AFTER mocks are set up so the middleware binds to mocked modules.
import {
    authenticate,
    resolveOrganization,
    requireSuperuser,
    clearSessionCache,
} from './auth.middleware';

const USER_WITH_ONE_ORG: CorePlatformUser = {
    id: 'user-1',
    email: 'test@example.com',
    full_name: 'Test User',
    is_superuser: false,
    memberships: [
        {
            organization: { id: 'org-1', name: 'Org One' },
            role: { id: 1, name: 'Admin' },
        },
    ],
};

const USER_WITH_TWO_ORGS: CorePlatformUser = {
    ...USER_WITH_ONE_ORG,
    memberships: [
        { organization: { id: 'org-1', name: 'Org One' }, role: { id: 1, name: 'Admin' } },
        { organization: { id: 'org-2', name: 'Org Two' }, role: { id: 1, name: 'Admin' } },
    ],
};

const USER_WITH_NO_ORGS: CorePlatformUser = {
    ...USER_WITH_ONE_ORG,
    memberships: [],
};

function createMockRequest(overrides: Partial<Request> = {}): Request {
    return {
        cookies: {},
        headers: {},
        ip: '127.0.0.1',
        ...overrides,
    } as Request;
}

function createMockResponse(): Response {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res as Response;
}

describe('authenticate', () => {
    beforeEach(() => {
        mockValidateSession.mockReset();
    });

    it('returns 401 when no session cookie is present', async () => {
        const req = createMockRequest();
        const res = createMockResponse();
        const next = jest.fn() as NextFunction;

        await authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            status: 'error',
            error: { code: 'UNAUTHENTICATED', message: 'Authentication required' },
        });
        expect(next).not.toHaveBeenCalled();
        expect(mockValidateSession).not.toHaveBeenCalled();
    });

    it('attaches req.auth and calls next() on successful validation', async () => {
        mockValidateSession.mockResolvedValueOnce(USER_WITH_ONE_ORG);

        const req = createMockRequest({ cookies: { session_id: 'sess-abc' } });
        const res = createMockResponse();
        const next = jest.fn() as NextFunction;

        await authenticate(req, res, next);

        expect(mockValidateSession).toHaveBeenCalledTimes(1);
        expect(req.auth).toEqual({ user: USER_WITH_ONE_ORG, sessionId: 'sess-abc' });
        expect(next).toHaveBeenCalled();

        // Cleanup: make sure this session id isn't cached across tests.
        clearSessionCache('sess-abc');
    });

    it('serves subsequent calls from the cache (no second upstream call)', async () => {
        mockValidateSession.mockResolvedValueOnce(USER_WITH_ONE_ORG);

        const first = createMockRequest({ cookies: { session_id: 'sess-cache' } });
        await authenticate(first, createMockResponse(), jest.fn() as NextFunction);

        const second = createMockRequest({ cookies: { session_id: 'sess-cache' } });
        const next = jest.fn() as NextFunction;
        await authenticate(second, createMockResponse(), next);

        expect(mockValidateSession).toHaveBeenCalledTimes(1);
        expect(second.auth?.user.id).toBe('user-1');
        expect(next).toHaveBeenCalled();

        clearSessionCache('sess-cache');
    });

    it('returns 401 and clears the cookie when core-platform rejects the session', async () => {
        mockValidateSession.mockRejectedValueOnce(
            new CorePlatformError('expired', { status: 401, code: 'UNAUTHORIZED' })
        );

        const req = createMockRequest({ cookies: { session_id: 'sess-bad' } });
        const res = createMockResponse();
        const next = jest.fn() as NextFunction;

        await authenticate(req, res, next);

        expect(res.clearCookie).toHaveBeenCalledWith('session_id');
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            status: 'error',
            error: { code: 'UNAUTHENTICATED', message: 'Session expired' },
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 503 when core-platform is unreachable', async () => {
        mockValidateSession.mockRejectedValueOnce(
            new CorePlatformError('boom', { status: null, code: 'NETWORK_ERROR' })
        );

        const req = createMockRequest({ cookies: { session_id: 'sess-net' } });
        const res = createMockResponse();
        const next = jest.fn() as NextFunction;

        await authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith({
            status: 'error',
            error: {
                code: 'AUTH_UPSTREAM_UNAVAILABLE',
                message: 'Authentication service temporarily unavailable',
            },
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 500 on an unexpected (non-CorePlatformError) failure', async () => {
        mockValidateSession.mockRejectedValueOnce(new Error('surprise'));

        const req = createMockRequest({ cookies: { session_id: 'sess-surprise' } });
        const res = createMockResponse();
        const next = jest.fn() as NextFunction;

        await authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(next).not.toHaveBeenCalled();
    });
});

describe('resolveOrganization', () => {
    it('returns 500 if authenticate did not run first', () => {
        const req = createMockRequest();
        const res = createMockResponse();
        const next = jest.fn() as NextFunction;

        resolveOrganization(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(next).not.toHaveBeenCalled();
    });

    it('attaches the sole membership when user belongs to exactly one org', () => {
        const req = createMockRequest();
        req.auth = { user: USER_WITH_ONE_ORG, sessionId: 'sess-1' };
        const next = jest.fn() as NextFunction;

        resolveOrganization(req, createMockResponse(), next);

        expect(req.auth.organization?.id).toBe('org-1');
        expect(req.auth.role?.name).toBe('Admin');
        expect(next).toHaveBeenCalled();
    });

    it('returns 400 when user has multiple orgs and no x-organization-id header', () => {
        const req = createMockRequest();
        req.auth = { user: USER_WITH_TWO_ORGS, sessionId: 'sess-2' };
        const res = createMockResponse();
        const next = jest.fn() as NextFunction;

        resolveOrganization(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            status: 'error',
            error: {
                code: 'ORG_REQUIRED',
                message: 'x-organization-id header is required when user belongs to multiple organizations',
            },
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('attaches the membership matching the x-organization-id header', () => {
        const req = createMockRequest({ headers: { 'x-organization-id': 'org-2' } });
        req.auth = { user: USER_WITH_TWO_ORGS, sessionId: 'sess-3' };
        const next = jest.fn() as NextFunction;

        resolveOrganization(req, createMockResponse(), next);

        expect(req.auth.organization?.id).toBe('org-2');
        expect(next).toHaveBeenCalled();
    });

    it('returns 403 when the requested org is not in the user memberships', () => {
        const req = createMockRequest({ headers: { 'x-organization-id': 'org-999' } });
        req.auth = { user: USER_WITH_TWO_ORGS, sessionId: 'sess-4' };
        const res = createMockResponse();
        const next = jest.fn() as NextFunction;

        resolveOrganization(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            status: 'error',
            error: { code: 'ORG_FORBIDDEN', message: 'You do not have access to this organization' },
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when the user has no memberships', () => {
        const req = createMockRequest();
        req.auth = { user: USER_WITH_NO_ORGS, sessionId: 'sess-5' };
        const res = createMockResponse();
        const next = jest.fn() as NextFunction;

        resolveOrganization(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            status: 'error',
            error: { code: 'ORG_FORBIDDEN', message: 'User has no organization memberships' },
        });
        expect(next).not.toHaveBeenCalled();
    });
});

describe('requireSuperuser', () => {
    it('returns 401 if req.auth is missing', () => {
        const req = createMockRequest();
        const res = createMockResponse();
        const next = jest.fn() as NextFunction;

        requireSuperuser(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 for a non-superuser', () => {
        const req = createMockRequest();
        req.auth = { user: USER_WITH_ONE_ORG, sessionId: 'sess-6' };
        const res = createMockResponse();
        const next = jest.fn() as NextFunction;

        requireSuperuser(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            status: 'error',
            error: { code: 'SUPERUSER_REQUIRED', message: 'Superuser access required' },
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('calls next() for a superuser', () => {
        const req = createMockRequest();
        req.auth = {
            user: { ...USER_WITH_ONE_ORG, is_superuser: true },
            sessionId: 'sess-7',
        };
        const next = jest.fn() as NextFunction;

        requireSuperuser(req, createMockResponse(), next);

        expect(next).toHaveBeenCalled();
    });
});
