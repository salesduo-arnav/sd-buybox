import type { Request, Response } from 'express';

// Silence the file logger transport.
jest.mock('../utils/logger', () => ({
    __esModule: true,
    default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(), http: jest.fn() },
}));

// Mock configService.
const mockGetAll = jest.fn();
const mockSet = jest.fn();

jest.mock('../services/config.service', () => ({
    __esModule: true,
    default: {
        getAll: (...args: unknown[]) => mockGetAll(...args),
        set: (...args: unknown[]) => mockSet(...args),
    },
}));

// Mock corePlatform.
jest.mock('../services/corePlatform.client', () => ({
    corePlatform: {
        audit: { log: jest.fn() },
    },
}));

import { listConfigs, updateConfig } from './admin.controller';

function fakeConfig(key: string, value: unknown, type = 'text', category = 'general', description: string | null = null) {
    return { config_key: key, config_value: value, config_type: type, category, description };
}

function createMockRequest(overrides: Partial<Request> = {}): Request {
    return {
        params: {},
        body: {},
        auth: {
            user: { id: 'user-1' },
            sessionId: 'session-1',
            organization: { id: 'org-1' },
        },
        ...overrides,
    } as unknown as Request;
}

function createMockResponse(): Response {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
}

beforeEach(() => {
    mockGetAll.mockReset();
    mockSet.mockReset();
});

describe('listConfigs', () => {
    it('returns configs in the expected shape with key/value/type/category/description', async () => {
        mockGetAll.mockResolvedValueOnce([
            fakeConfig('max_products_per_scan', 500, 'integer', 'scanning', 'Max products per scan'),
            fakeConfig('default_marketplace', 'US', 'select', 'scanning', null),
        ]);

        const req = createMockRequest();
        const res = createMockResponse();
        await listConfigs(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = (res.json as jest.Mock).mock.calls[0][0];
        expect(body.status).toBe('success');
        expect(body.data.configs).toEqual([
            { key: 'max_products_per_scan', value: 500, type: 'integer', category: 'scanning', description: 'Max products per scan' },
            { key: 'default_marketplace', value: 'US', type: 'select', category: 'scanning', description: null },
        ]);
    });
});

describe('updateConfig', () => {
    it('updates a valid integer config and returns the formatted result', async () => {
        mockGetAll.mockResolvedValueOnce([
            fakeConfig('max_products_per_scan', 500, 'integer', 'scanning', 'desc'),
        ]);
        mockSet.mockResolvedValueOnce(fakeConfig('max_products_per_scan', 200, 'integer', 'scanning', 'desc'));

        const req = createMockRequest({ params: { key: 'max_products_per_scan' }, body: { config_value: 200 } });
        const res = createMockResponse();
        await updateConfig(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(mockSet).toHaveBeenCalledWith('max_products_per_scan', 200);
    });

    it('returns 400 when config_value is missing', async () => {
        const req = createMockRequest({ params: { key: 'some_key' }, body: {} });
        const res = createMockResponse();
        await updateConfig(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        const body = (res.json as jest.Mock).mock.calls[0][0];
        expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when the config key does not exist', async () => {
        mockGetAll.mockResolvedValueOnce([]);

        const req = createMockRequest({ params: { key: 'nonexistent' }, body: { config_value: 1 } });
        const res = createMockResponse();
        await updateConfig(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('rejects a string for an integer config', async () => {
        mockGetAll.mockResolvedValueOnce([
            fakeConfig('max_products_per_scan', 500, 'integer', 'scanning'),
        ]);

        const req = createMockRequest({ params: { key: 'max_products_per_scan' }, body: { config_value: 'abc' } });
        const res = createMockResponse();
        await updateConfig(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        const body = (res.json as jest.Mock).mock.calls[0][0];
        expect(body.error.code).toBe('VALIDATION_ERROR');
        expect(body.error.message).toContain('non-negative integer');
    });

    it('rejects a non-boolean for a boolean config', async () => {
        mockGetAll.mockResolvedValueOnce([
            fakeConfig('some_flag', true, 'boolean', 'general'),
        ]);

        const req = createMockRequest({ params: { key: 'some_flag' }, body: { config_value: 'yes' } });
        const res = createMockResponse();
        await updateConfig(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        const body = (res.json as jest.Mock).mock.calls[0][0];
        expect(body.error.message).toContain('boolean');
    });

    it('rejects an invalid option for a select config', async () => {
        mockGetAll.mockResolvedValueOnce([
            fakeConfig('default_marketplace', 'US', 'select', 'scanning'),
        ]);

        const req = createMockRequest({ params: { key: 'default_marketplace' }, body: { config_value: 'ZZ' } });
        const res = createMockResponse();
        await updateConfig(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        const body = (res.json as jest.Mock).mock.calls[0][0];
        expect(body.error.message).toContain('one of');
    });

    it('accepts a valid select option', async () => {
        mockGetAll.mockResolvedValueOnce([
            fakeConfig('default_marketplace', 'US', 'select', 'scanning'),
        ]);
        mockSet.mockResolvedValueOnce(fakeConfig('default_marketplace', 'DE', 'select', 'scanning'));

        const req = createMockRequest({ params: { key: 'default_marketplace' }, body: { config_value: 'DE' } });
        const res = createMockResponse();
        await updateConfig(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(mockSet).toHaveBeenCalledWith('default_marketplace', 'DE');
    });

    it('rejects a negative number for a decimal config', async () => {
        mockGetAll.mockResolvedValueOnce([
            fakeConfig('missed_sales_min_velocity', 0.5, 'decimal', 'thresholds'),
        ]);

        const req = createMockRequest({ params: { key: 'missed_sales_min_velocity' }, body: { config_value: -1 } });
        const res = createMockResponse();
        await updateConfig(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects a non-object for a json config', async () => {
        mockGetAll.mockResolvedValueOnce([
            fakeConfig('supported_marketplaces', ['US'], 'json', 'scanning'),
        ]);

        const req = createMockRequest({ params: { key: 'supported_marketplaces' }, body: { config_value: 'not json' } });
        const res = createMockResponse();
        await updateConfig(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        const body = (res.json as jest.Mock).mock.calls[0][0];
        expect(body.error.message).toContain('JSON');
    });

    it('accepts a valid json array', async () => {
        mockGetAll.mockResolvedValueOnce([
            fakeConfig('supported_marketplaces', ['US'], 'json', 'scanning'),
        ]);
        mockSet.mockResolvedValueOnce(fakeConfig('supported_marketplaces', ['US', 'CA'], 'json', 'scanning'));

        const req = createMockRequest({ params: { key: 'supported_marketplaces' }, body: { config_value: ['US', 'CA'] } });
        const res = createMockResponse();
        await updateConfig(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(mockSet).toHaveBeenCalledWith('supported_marketplaces', ['US', 'CA']);
    });
});
