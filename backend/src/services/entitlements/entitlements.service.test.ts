import type { Response } from 'express';
import type { ConsumeEntitlementResult, RawEntitlement } from '../../types/corePlatform';

// Silence the file logger transport.
jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        http: jest.fn(),
    },
}));

// Mock the core-platform client so the service can be exercised in isolation.
const mockList = jest.fn();
const mockConsume = jest.fn();

jest.mock('../corePlatform.client', () => ({
    corePlatform: {
        entitlements: {
            list: (...args: unknown[]) => mockList(...args),
            consume: (...args: unknown[]) => mockConsume(...args),
        },
    },
    CorePlatformError: jest.requireActual('../../types/corePlatform').CorePlatformError,
}));

// Imports AFTER mocks so the SUT binds to mocked modules.
import { entitlements, EntitlementError } from './entitlements.service';
import { FEATURE, LIMIT } from './entitlements.types';
import { CorePlatformError } from '../../types/corePlatform';

const ORG_ID = 'org-1';

// Convenience builder for a raw entitlement row scoped to the buybox tool.
function row(slug: string, limitAmount: number | null, usage = 0): RawEntitlement {
    return {
        id: `ent-${slug}`,
        organization_id: ORG_ID,
        tool_id: 'tool-buybox',
        feature_id: `feat-${slug}`,
        limit_amount: limitAmount,
        usage_amount: usage,
        reset_period: 'monthly',
        feature: { id: `feat-${slug}`, name: slug, slug },
        tool: { id: 'tool-buybox', name: 'BuyBox', slug: 'buybox-test' },
    };
}

// Each test starts with a fresh cache by snapshotting a brand-new org id.
let nextOrgId = 0;
function freshOrg(): string {
    nextOrgId += 1;
    return `org-${nextOrgId}`;
}

beforeEach(() => {
    mockList.mockReset();
    mockConsume.mockReset();
});

describe('entitlements.snapshot', () => {
    it('returns an empty hasAny=false snapshot when the org has nothing seeded', async () => {
        const org = freshOrg();
        mockList.mockResolvedValueOnce([]);

        const snapshot = await entitlements.snapshot(org);

        expect(snapshot.orgId).toBe(org);
        expect(snapshot.hasAny).toBe(false);
        expect(entitlements.has(snapshot, FEATURE.SLACK_ALERTS)).toBe(false);
    });

    it('treats limit_amount=null as enabled and limit_amount=0 as disabled', async () => {
        const org = freshOrg();
        mockList.mockResolvedValueOnce([
            row(FEATURE.SLACK_ALERTS, null),
            row(FEATURE.CUSTOM_THRESHOLDS, 0),
            row(FEATURE.ADVANCED_ANALYTICS, 1),
        ]);

        const snapshot = await entitlements.snapshot(org);

        expect(snapshot.hasAny).toBe(true);
        expect(entitlements.has(snapshot, FEATURE.SLACK_ALERTS)).toBe(true);
        expect(entitlements.has(snapshot, FEATURE.CUSTOM_THRESHOLDS)).toBe(false);
        expect(entitlements.has(snapshot, FEATURE.ADVANCED_ANALYTICS)).toBe(true);
    });

    it('serves the second call from cache without re-hitting the upstream', async () => {
        const org = freshOrg();
        mockList.mockResolvedValueOnce([row(FEATURE.SLACK_ALERTS, null)]);

        await entitlements.snapshot(org);
        await entitlements.snapshot(org);

        expect(mockList).toHaveBeenCalledTimes(1);
    });

    it('returns an empty snapshot when the upstream throws (safe-default)', async () => {
        const org = freshOrg();
        mockList.mockRejectedValueOnce(new CorePlatformError('boom', { status: 503, code: 'UPSTREAM_ERROR' }));

        const snapshot = await entitlements.snapshot(org);

        expect(snapshot.hasAny).toBe(false);
        expect(entitlements.has(snapshot, FEATURE.SLACK_ALERTS)).toBe(false);
    });

    it('invalidate(orgId) drops the cached snapshot so the next call refetches', async () => {
        const org = freshOrg();
        mockList.mockResolvedValueOnce([row(FEATURE.SLACK_ALERTS, null)]);
        mockList.mockResolvedValueOnce([row(FEATURE.SLACK_ALERTS, 0)]);

        const before = await entitlements.snapshot(org);
        expect(entitlements.has(before, FEATURE.SLACK_ALERTS)).toBe(true);

        entitlements.invalidate(org);

        const after = await entitlements.snapshot(org);
        expect(entitlements.has(after, FEATURE.SLACK_ALERTS)).toBe(false);
        expect(mockList).toHaveBeenCalledTimes(2);
    });
});

describe('entitlements.requireFeature', () => {
    it('throws a 403 EntitlementError when the feature is missing', async () => {
        const snapshot = await entitlements.snapshot(freshOrg());
        expect(() => entitlements.requireFeature(snapshot, FEATURE.SLACK_ALERTS)).toThrow(EntitlementError);

        try {
            entitlements.requireFeature(snapshot, FEATURE.SLACK_ALERTS);
        } catch (err) {
            const typed = err as EntitlementError;
            expect(typed.status).toBe(403);
            expect(typed.code).toBe('FEATURE_NOT_ENTITLED');
        }
    });

    it('does not throw when the feature is enabled', async () => {
        const org = freshOrg();
        mockList.mockResolvedValueOnce([row(FEATURE.SLACK_ALERTS, null)]);
        const snapshot = await entitlements.snapshot(org);

        expect(() => entitlements.requireFeature(snapshot, FEATURE.SLACK_ALERTS)).not.toThrow();
    });
});

describe('entitlements.maxFrequency / clampFrequency', () => {
    it('returns daily when no tier row exists', async () => {
        const snapshot = await entitlements.snapshot(freshOrg());
        expect(entitlements.maxFrequency(snapshot)).toBe('daily');
    });

    it('decodes rank 1 as daily, 2 as hourly, 3 as real_time', async () => {
        for (const [rank, expected] of [
            [1, 'daily'],
            [2, 'hourly'],
            [3, 'real_time'],
        ] as const) {
            const org = freshOrg();
            mockList.mockResolvedValueOnce([row('buybox.tier.update_frequency', rank)]);
            const snapshot = await entitlements.snapshot(org);
            expect(entitlements.maxFrequency(snapshot)).toBe(expected);
        }
    });

    it('treats null limit_amount on the frequency tier as real_time', async () => {
        const org = freshOrg();
        mockList.mockResolvedValueOnce([row('buybox.tier.update_frequency', null)]);
        const snapshot = await entitlements.snapshot(org);
        expect(entitlements.maxFrequency(snapshot)).toBe('real_time');
    });

    it('clampFrequency returns the lower of preferred vs ceiling', async () => {
        const org = freshOrg();
        mockList.mockResolvedValueOnce([row('buybox.tier.update_frequency', 2)]); // hourly ceiling
        const snapshot = await entitlements.snapshot(org);

        expect(entitlements.clampFrequency('real_time', snapshot)).toBe('hourly');
        expect(entitlements.clampFrequency('hourly', snapshot)).toBe('hourly');
        expect(entitlements.clampFrequency('daily', snapshot)).toBe('daily');
    });
});

describe('entitlements.retentionDays', () => {
    it('defaults to 30 when no retention row exists', async () => {
        const snapshot = await entitlements.snapshot(freshOrg());
        expect(entitlements.retentionDays(snapshot)).toBe(30);
    });

    it('returns the row value when present', async () => {
        const org = freshOrg();
        mockList.mockResolvedValueOnce([row('buybox.tier.history_retention_days', 90)]);
        const snapshot = await entitlements.snapshot(org);
        expect(entitlements.retentionDays(snapshot)).toBe(90);
    });

    it('translates null retention into the 10-year ceiling', async () => {
        const org = freshOrg();
        mockList.mockResolvedValueOnce([row('buybox.tier.history_retention_days', null)]);
        const snapshot = await entitlements.snapshot(org);
        expect(entitlements.retentionDays(snapshot)).toBe(3650);
    });
});

describe('entitlements.checkLimit / requireCapacity', () => {
    it('atCap is true when used >= integer limit', async () => {
        const org = freshOrg();
        mockList.mockResolvedValueOnce([row(LIMIT.TRACKED_ASINS, 25)]);
        const snapshot = await entitlements.snapshot(org);

        expect(entitlements.checkLimit(snapshot, LIMIT.TRACKED_ASINS, 24).atCap).toBe(false);
        expect(entitlements.checkLimit(snapshot, LIMIT.TRACKED_ASINS, 25).atCap).toBe(true);
        expect(entitlements.checkLimit(snapshot, LIMIT.TRACKED_ASINS, 30).atCap).toBe(true);
    });

    it('atCap is false when limit is null (unlimited)', async () => {
        const org = freshOrg();
        mockList.mockResolvedValueOnce([row(LIMIT.TRACKED_ASINS, null)]);
        const snapshot = await entitlements.snapshot(org);

        expect(entitlements.checkLimit(snapshot, LIMIT.TRACKED_ASINS, 9_999).atCap).toBe(false);
    });

    it('requireCapacity throws a 402 EntitlementError when atCap', async () => {
        const org = freshOrg();
        mockList.mockResolvedValueOnce([row(LIMIT.TRACKED_ASINS, 5)]);
        const snapshot = await entitlements.snapshot(org);

        expect(() => entitlements.requireCapacity(snapshot, LIMIT.TRACKED_ASINS, 5)).toThrow(EntitlementError);
        try {
            entitlements.requireCapacity(snapshot, LIMIT.TRACKED_ASINS, 5);
        } catch (err) {
            const typed = err as EntitlementError;
            expect(typed.status).toBe(402);
            expect(typed.code).toBe('LIMIT_EXCEEDED');
        }
    });

    it('treats a missing limit row as a hard zero (atCap from the start)', async () => {
        const snapshot = await entitlements.snapshot(freshOrg());
        const result = entitlements.checkLimit(snapshot, LIMIT.TRACKED_ASINS, 0);
        expect(result.limit).toBe(0);
        expect(result.atCap).toBe(true);
    });
});

describe('entitlements.consume', () => {
    it('does not throw and invalidates the cache when allowed=true', async () => {
        const org = freshOrg();
        // Seed the cache so we can prove it gets invalidated.
        mockList.mockResolvedValueOnce([row(LIMIT.SCANS_PER_MONTH, 5, 0)]);
        mockList.mockResolvedValueOnce([row(LIMIT.SCANS_PER_MONTH, 5, 1)]);
        await entitlements.snapshot(org);

        const result: ConsumeEntitlementResult = {
            allowed: true,
            usage_amount: 1,
            limit_amount: 5,
        };
        mockConsume.mockResolvedValueOnce(result);

        await expect(entitlements.consume(org, LIMIT.SCANS_PER_MONTH)).resolves.toBeUndefined();
        expect(mockConsume).toHaveBeenCalledWith(org, LIMIT.SCANS_PER_MONTH, 1);

        // Next snapshot call should refetch (cache invalidated).
        const fresh = await entitlements.snapshot(org);
        expect(fresh.entries.get(LIMIT.SCANS_PER_MONTH)?.usage).toBe(1);
        expect(mockList).toHaveBeenCalledTimes(2);
    });

    it('throws a 402 EntitlementError when allowed=false', async () => {
        const org = freshOrg();
        const denied: ConsumeEntitlementResult = {
            allowed: false,
            reason: 'limit_exceeded',
            usage_amount: 5,
            limit_amount: 5,
        };
        mockConsume.mockResolvedValueOnce(denied);

        let caught: unknown;
        try {
            await entitlements.consume(org, LIMIT.SCANS_PER_MONTH);
        } catch (err) {
            caught = err;
        }

        expect(caught).toBeInstanceOf(EntitlementError);
        const typed = caught as EntitlementError;
        expect(typed.status).toBe(402);
        expect(typed.code).toBe('LIMIT_EXCEEDED');
    });
});

describe('EntitlementError.send', () => {
    function mockResponse(): Response {
        const res: Partial<Response> = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res as Response;
    }

    it('writes status + apiError envelope to the response', () => {
        const res = mockResponse();
        const err = new EntitlementError(402, 'LIMIT_EXCEEDED', 'too many');

        err.send(res);

        expect(res.status).toHaveBeenCalledWith(402);
        expect(res.json).toHaveBeenCalledWith({
            status: 'error',
            error: { code: 'LIMIT_EXCEEDED', message: 'too many' },
        });
    });
});
