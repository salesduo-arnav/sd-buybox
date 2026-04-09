import { NextFunction, Request, Response } from 'express';

// Silence the file logger transport.
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

// Mock the entitlements service. Using `jest.requireActual` for the
// EntitlementError class so the SUT's `instanceof` check still works.
const mockSnapshot = jest.fn();
const mockRequireFeature = jest.fn();

jest.mock('../services/entitlements', () => {
    const actual = jest.requireActual('../services/entitlements');
    return {
        ...actual,
        entitlements: {
            snapshot: (...args: unknown[]) => mockSnapshot(...args),
            requireFeature: (...args: unknown[]) => mockRequireFeature(...args),
        },
    };
});

// Imports AFTER mocks.
import { requireAnyEntitlement, requireFeature } from './entitlements.middleware';
import { EntitlementError, FEATURE } from '../services/entitlements';

const ORG_ID = 'org-1';

function buildRequest(): Request {
    return {
        auth: {
            user: { id: 'u1', email: 'a@b.c', full_name: 'Test', memberships: [] },
            sessionId: 'sess',
            organization: { id: ORG_ID, name: 'Org' },
        },
    } as unknown as Request;
}

function buildResponse(): Response {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
}

beforeEach(() => {
    mockSnapshot.mockReset();
    mockRequireFeature.mockReset();
});

describe('requireAnyEntitlement', () => {
    it('calls next() when the org has at least one active entitlement', async () => {
        mockSnapshot.mockResolvedValueOnce({ orgId: ORG_ID, hasAny: true, entries: new Map() });

        const req = buildRequest();
        const res = buildResponse();
        const next = jest.fn() as NextFunction;

        await requireAnyEntitlement(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 402 SUBSCRIPTION_REQUIRED when the snapshot has no entitlements', async () => {
        mockSnapshot.mockResolvedValueOnce({ orgId: ORG_ID, hasAny: false, entries: new Map() });

        const req = buildRequest();
        const res = buildResponse();
        const next = jest.fn() as NextFunction;

        await requireAnyEntitlement(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(402);
        expect(res.json).toHaveBeenCalledWith({
            status: 'error',
            error: { code: 'SUBSCRIPTION_REQUIRED', message: 'Active buybox subscription required' },
        });
    });

    it('routes thrown EntitlementError through err.send()', async () => {
        mockSnapshot.mockRejectedValueOnce(new EntitlementError(403, 'FEATURE_NOT_ENTITLED', 'nope'));

        const req = buildRequest();
        const res = buildResponse();
        const next = jest.fn() as NextFunction;

        await requireAnyEntitlement(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            status: 'error',
            error: { code: 'FEATURE_NOT_ENTITLED', message: 'nope' },
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 500 INTERNAL_ERROR on an unexpected failure', async () => {
        mockSnapshot.mockRejectedValueOnce(new Error('boom'));

        const req = buildRequest();
        const res = buildResponse();
        const next = jest.fn() as NextFunction;

        await requireAnyEntitlement(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            status: 'error',
            error: { code: 'INTERNAL_ERROR', message: 'Entitlement check failed' },
        });
    });
});

describe('requireFeature(slug)', () => {
    it('calls next() when the feature is enabled', async () => {
        mockSnapshot.mockResolvedValueOnce({ orgId: ORG_ID, hasAny: true, entries: new Map() });
        // requireFeature in the service is a no-op when allowed.
        mockRequireFeature.mockReturnValueOnce(undefined);

        const handler = requireFeature(FEATURE.SLACK_ALERTS);
        const req = buildRequest();
        const res = buildResponse();
        const next = jest.fn() as NextFunction;

        await handler(req, res, next);

        expect(mockRequireFeature).toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
    });

    it('returns 403 when the service throws FeatureNotEntitled', async () => {
        mockSnapshot.mockResolvedValueOnce({ orgId: ORG_ID, hasAny: true, entries: new Map() });
        mockRequireFeature.mockImplementationOnce(() => {
            throw new EntitlementError(403, 'FEATURE_NOT_ENTITLED', 'Feature buybox.feature.slack_alerts is not available on your plan');
        });

        const handler = requireFeature(FEATURE.SLACK_ALERTS);
        const req = buildRequest();
        const res = buildResponse();
        const next = jest.fn() as NextFunction;

        await handler(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            status: 'error',
            error: {
                code: 'FEATURE_NOT_ENTITLED',
                message: 'Feature buybox.feature.slack_alerts is not available on your plan',
            },
        });
    });

    it('falls back to 500 on a non-EntitlementError throw', async () => {
        mockSnapshot.mockRejectedValueOnce(new Error('weird'));

        const handler = requireFeature(FEATURE.SLACK_ALERTS);
        const req = buildRequest();
        const res = buildResponse();
        const next = jest.fn() as NextFunction;

        await handler(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            status: 'error',
            error: { code: 'INTERNAL_ERROR', message: 'Entitlement check failed' },
        });
    });
});
