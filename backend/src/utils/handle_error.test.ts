import { Response } from 'express';
import { apiSuccess, apiError, handleError } from './handle_error';
import { CorePlatformError } from '../types/corePlatform';

// Logger writes to a file transport on construction — mock it to keep
// tests silent and avoid touching the filesystem.
jest.mock('./logger', () => ({
    __esModule: true,
    default: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        http: jest.fn(),
    },
}));

function createMockResponse(): Response {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
}

describe('apiSuccess', () => {
    it('returns { status: success, data } with default status 200', () => {
        const res = createMockResponse();
        apiSuccess(res, { id: 'abc' });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ status: 'success', data: { id: 'abc' } });
    });

    it('honors an explicit status code', () => {
        const res = createMockResponse();
        apiSuccess(res, { id: 'abc' }, { statusCode: 201 });
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('accepts null data', () => {
        const res = createMockResponse();
        apiSuccess(res, null);
        expect(res.json).toHaveBeenCalledWith({ status: 'success', data: null });
    });

    it('includes meta when provided', () => {
        const res = createMockResponse();
        apiSuccess(res, { id: 'abc' }, { meta: { clamped_fields: ['slack_alerts_enabled'] } });
        expect(res.json).toHaveBeenCalledWith({
            status: 'success',
            data: { id: 'abc' },
            meta: { clamped_fields: ['slack_alerts_enabled'] },
        });
    });
});

describe('apiError', () => {
    it('returns { status: error, error: { code, message } }', () => {
        const res = createMockResponse();
        apiError(res, 404, 'NOT_FOUND', 'Missing');
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            status: 'error',
            error: { code: 'NOT_FOUND', message: 'Missing' },
        });
    });
});

describe('handleError', () => {
    it('maps CorePlatformError 401 to 401 UNAUTHENTICATED', () => {
        const res = createMockResponse();
        const error = new CorePlatformError('expired', { status: 401, code: 'UNAUTHORIZED' });
        handleError(res, error, 'ctx');
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            status: 'error',
            error: { code: 'UNAUTHENTICATED', message: 'Session expired' },
        });
    });

    it('maps CorePlatformError 5xx to 503 UPSTREAM_UNAVAILABLE', () => {
        const res = createMockResponse();
        const error = new CorePlatformError('boom', { status: 503, code: 'UPSTREAM_ERROR' });
        handleError(res, error, 'ctx');
        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith({
            status: 'error',
            error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Upstream service temporarily unavailable' },
        });
    });

    it('maps CorePlatformError network error (null status) to 503', () => {
        const res = createMockResponse();
        const error = new CorePlatformError('disconnected', { status: null, code: 'NETWORK_ERROR' });
        handleError(res, error, 'ctx');
        expect(res.status).toHaveBeenCalledWith(503);
    });

    it('preserves CorePlatformError other 4xx codes (e.g. 403)', () => {
        const res = createMockResponse();
        const error = new CorePlatformError('forbidden', { status: 403, code: 'FORBIDDEN' });
        handleError(res, error, 'ctx');
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            status: 'error',
            error: { code: 'FORBIDDEN', message: 'forbidden' },
        });
    });

    it('maps generic Error to 500 INTERNAL_ERROR', () => {
        const res = createMockResponse();
        handleError(res, new Error('kaboom'), 'ctx');
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            status: 'error',
            error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
        });
    });

    it('maps unknown throwable (non-Error) to 500 INTERNAL_ERROR', () => {
        const res = createMockResponse();
        handleError(res, 'just a string', 'ctx');
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            status: 'error',
            error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
        });
    });
});
