import type { AxiosError } from 'axios';
import type { IntegrationAccountSummary } from '../types/corePlatform';

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

// Build a single fake axios instance with all the shape the client needs,
// plus capture hooks so tests can inspect the registered interceptors.
type InterceptorFn<T = unknown> = (value: T) => T | Promise<T>;

const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
        request: {
            use: jest.fn<void, [InterceptorFn]>(),
        },
        response: {
            use: jest.fn<void, [InterceptorFn, InterceptorFn]>(),
        },
    },
};

jest.mock('axios', () => ({
    __esModule: true,
    default: {
        create: jest.fn(() => mockAxiosInstance),
    },
}));

// Import AFTER mocks. Also pull __resetCorePlatformClient so each test
// starts with a fresh lazy axios instance.
import { corePlatform, CorePlatformError, __resetCorePlatformClient } from './corePlatform.client';

function latestRequestInterceptor(): InterceptorFn<{ url?: string; headers?: Record<string, string> }> {
    const calls = mockAxiosInstance.interceptors.request.use.mock.calls;
    return calls[calls.length - 1][0] as InterceptorFn<{ url?: string; headers?: Record<string, string> }>;
}

function latestResponseErrorInterceptor(): InterceptorFn<AxiosError> {
    const calls = mockAxiosInstance.interceptors.response.use.mock.calls;
    return calls[calls.length - 1][1] as InterceptorFn<AxiosError>;
}

// Trigger lazy build of the axios instance so interceptors are registered.
async function ensureClientBuilt(): Promise<void> {
    mockAxiosInstance.get.mockResolvedValueOnce({ data: [] });
    await corePlatform.integrations.listAccounts('org-noop');
}

beforeEach(() => {
    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.post.mockReset();
    mockAxiosInstance.interceptors.request.use.mockReset();
    mockAxiosInstance.interceptors.response.use.mockReset();
    __resetCorePlatformClient();
});

describe('request interceptor (X-Service-Key injection)', () => {
    it('injects service credentials on /internal/* paths', async () => {
        await ensureClientBuilt();
        const interceptor = latestRequestInterceptor();

        const config = interceptor({ url: '/internal/integrations/accounts', headers: {} });

        expect((config as { headers: Record<string, string> }).headers['X-Service-Key']).toBe('test-internal-api-key');
        expect((config as { headers: Record<string, string> }).headers['X-Service-Name']).toBe('buybox-test');
    });

    it('does NOT inject service credentials on non-internal paths', async () => {
        await ensureClientBuilt();
        const interceptor = latestRequestInterceptor();

        const config = interceptor({ url: '/auth/me', headers: {} });

        expect((config as { headers: Record<string, string> }).headers['X-Service-Key']).toBeUndefined();
    });

    it('does NOT inject credentials when /internal/ appears mid-URL (startsWith only)', async () => {
        await ensureClientBuilt();
        const interceptor = latestRequestInterceptor();

        // Attacker-style URL: /internal/ appears in a query param, not as the path.
        const config = interceptor({ url: '/public?next=/internal/foo', headers: {} });

        expect((config as { headers: Record<string, string> }).headers['X-Service-Key']).toBeUndefined();
    });
});

describe('response error interceptor (normalization)', () => {
    it('normalizes a 401 response into CorePlatformError with UNAUTHORIZED', async () => {
        await ensureClientBuilt();
        const errorInterceptor = latestResponseErrorInterceptor();

        const axiosError = {
            response: { status: 401, data: { message: 'expired' } },
            message: 'Request failed',
        } as AxiosError;

        await expect(errorInterceptor(axiosError)).rejects.toMatchObject({
            status: 401,
            code: 'UNAUTHORIZED',
            message: 'expired',
        });
    });

    it('normalizes a 5xx response into CorePlatformError with UPSTREAM_ERROR', async () => {
        await ensureClientBuilt();
        const errorInterceptor = latestResponseErrorInterceptor();

        const axiosError = {
            response: { status: 502, data: { message: 'bad gateway' } },
            message: 'Request failed',
        } as AxiosError;

        await expect(errorInterceptor(axiosError)).rejects.toMatchObject({
            status: 502,
            code: 'UPSTREAM_ERROR',
        });
    });

    it('normalizes a network error (no response) into NETWORK_ERROR with null status', async () => {
        await ensureClientBuilt();
        const errorInterceptor = latestResponseErrorInterceptor();

        const axiosError = {
            response: undefined,
            message: 'ECONNREFUSED',
        } as unknown as AxiosError;

        await expect(errorInterceptor(axiosError)).rejects.toMatchObject({
            status: null,
            code: 'NETWORK_ERROR',
            message: 'ECONNREFUSED',
        });
    });
});

describe('CorePlatformError classification', () => {
    it('treats null-status errors as upstream-unavailable', () => {
        const error = new CorePlatformError('down', { status: null, code: 'NETWORK_ERROR' });
        expect(error.isUpstreamUnavailable).toBe(true);
        expect(error.isUnauthorized).toBe(false);
    });

    it('treats 5xx as upstream-unavailable', () => {
        const error = new CorePlatformError('boom', { status: 502, code: 'UPSTREAM_ERROR' });
        expect(error.isUpstreamUnavailable).toBe(true);
    });

    it('treats 401 as unauthorized, not upstream-unavailable', () => {
        const error = new CorePlatformError('expired', { status: 401, code: 'UNAUTHORIZED' });
        expect(error.isUnauthorized).toBe(true);
        expect(error.isUpstreamUnavailable).toBe(false);
    });
});

describe('integrations.listAccounts', () => {
    it('calls /internal/integrations/accounts with org_id param and returns the unwrapped array', async () => {
        const mockAccounts: IntegrationAccountSummary[] = [
            {
                id: 'acc-1',
                organization_id: 'org-1',
                account_name: 'Seller 1',
                integration_type: 'amazon_sp_api',
                status: 'connected',
            },
        ];
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAccounts });

        const accounts = await corePlatform.integrations.listAccounts('org-1');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
            '/internal/integrations/accounts',
            expect.objectContaining({ params: { org_id: 'org-1' } })
        );
        expect(accounts).toEqual(mockAccounts);
    });

    it('unwraps a { data: [...] } envelope', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: [{ id: 'acc-1' }] } });
        const accounts = await corePlatform.integrations.listAccounts('org-1');
        expect(accounts).toEqual([{ id: 'acc-1' }]);
    });

    it('returns an empty array when the upstream payload is null', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({ data: null });
        const accounts = await corePlatform.integrations.listAccounts('org-1');
        expect(accounts).toEqual([]);
    });
});

describe('integrations.accountBelongsToOrg', () => {
    it('returns true when the account id is in the listAccounts result', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
            data: [{ id: 'acc-1' }, { id: 'acc-2' }],
        });
        await expect(corePlatform.integrations.accountBelongsToOrg('acc-2', 'org-1')).resolves.toBe(true);
    });

    it('returns false when the account id is not in the list', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
            data: [{ id: 'acc-1' }],
        });
        await expect(corePlatform.integrations.accountBelongsToOrg('acc-999', 'org-1')).resolves.toBe(false);
    });

    it('returns false when the org has no accounts', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({ data: [] });
        await expect(corePlatform.integrations.accountBelongsToOrg('acc-1', 'org-1')).resolves.toBe(false);
    });
});

describe('entitlements.list', () => {
    it('calls /internal/organizations/:id/entitlements and returns the unwrapped array', async () => {
        const mockEntitlements = [
            {
                id: 'ent-1',
                organization_id: 'org-1',
                tool_id: 'tool-buybox',
                feature_id: 'feat-1',
                limit_amount: 25,
                usage_amount: 0,
                reset_period: 'never',
                feature: { id: 'feat-1', name: 'Tracked ASINs', slug: 'buybox.limit.tracked_asins' },
                tool: { id: 'tool-buybox', name: 'BuyBox', slug: 'buybox' },
            },
        ];
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockEntitlements });

        const result = await corePlatform.entitlements.list('org-1');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
            '/internal/organizations/org-1/entitlements',
            expect.any(Object)
        );
        expect(result).toEqual(mockEntitlements);
    });

    it('unwraps a { data: [...] } envelope', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: [{ id: 'ent-1' }] } });
        const result = await corePlatform.entitlements.list('org-1');
        expect(result).toEqual([{ id: 'ent-1' }]);
    });

    it('returns an empty array when the upstream payload is null', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({ data: null });
        const result = await corePlatform.entitlements.list('org-1');
        expect(result).toEqual([]);
    });
});

describe('entitlements.consume', () => {
    it('POSTs feature_slug + amount to the consume endpoint', async () => {
        mockAxiosInstance.post.mockResolvedValueOnce({
            data: { allowed: true, usage_amount: 1, limit_amount: 5 },
        });

        const result = await corePlatform.entitlements.consume('org-1', 'buybox.limit.scans_per_month');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
            '/internal/organizations/org-1/entitlements/consume',
            { feature_slug: 'buybox.limit.scans_per_month', amount: 1 }
        );
        expect(result.allowed).toBe(true);
        expect(result.usage_amount).toBe(1);
    });

    it('honors a custom amount and unwraps a { data: ... } envelope', async () => {
        mockAxiosInstance.post.mockResolvedValueOnce({
            data: { data: { allowed: false, reason: 'limit_exceeded', usage_amount: 5, limit_amount: 5 } },
        });

        const result = await corePlatform.entitlements.consume('org-1', 'buybox.limit.scans_per_month', 3);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
            '/internal/organizations/org-1/entitlements/consume',
            { feature_slug: 'buybox.limit.scans_per_month', amount: 3 }
        );
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('limit_exceeded');
    });
});
