import { Response } from 'express';
import { corePlatform } from '../corePlatform.client';
import { RawEntitlement } from '../../types/corePlatform';
import { apiError } from '../../utils/handle_error';
import { env } from '../../config/env';
import {
    FeatureSlug,
    FlowSlug,
    FREQUENCY_RANK,
    Frequency,
    LIMIT,
} from './entitlements.types';

// Thrown when the user hits a plan wall. Carries the HTTP status the
// controller should send — 402 for limit exhaustion, 403 for missing feature.
export class EntitlementError extends Error {
    constructor(
        readonly status: number,
        readonly code: string,
        message: string
    ) {
        super(message);
    }

    send(res: Response): Response {
        return apiError(res, this.status, this.code, this.message);
    }
}

// One entry from a plan. `limit = null` is unlimited, `0` is disabled.
interface Entry {
    limit: number | null;
    usage: number;
}

// Typed view of an org's entitlements, keyed by feature slug. A slug that
// has no matching row is treated as disabled / zero / most restrictive.
export interface Snapshot {
    orgId: string;
    hasAny: boolean;
    entries: Map<string, Entry>;
}

const cache = new Map<string, { snapshot: Snapshot; expiresAt: number }>();

function buildSnapshot(orgId: string, raw: RawEntitlement[]): Snapshot {
    const entries = new Map<string, Entry>();
    for (const row of raw) {
        entries.set(row.feature.slug, {
            limit: row.limit_amount,
            usage: row.usage_amount,
        });
    }
    return { orgId, hasAny: entries.size > 0, entries };
}

// A `limit=null` row or any positive integer means the feature is on.
function isEnabled(snapshot: Snapshot, slug: string): boolean {
    const entry = snapshot.entries.get(slug);
    if (!entry) return false;
    return entry.limit === null || entry.limit > 0;
}

export const entitlements = {
    // Fetch + cache the snapshot for one org (60s TTL). Returns an empty
    // snapshot when core-platform is unreachable so the caller can still
    // make a safe-default decision.
    async snapshot(orgId: string): Promise<Snapshot> {
        const cached = cache.get(orgId);
        if (cached && cached.expiresAt > Date.now()) return cached.snapshot;

        try {
            const raw = await corePlatform.entitlements.list(orgId);
            const snapshot = buildSnapshot(orgId, raw);
            cache.set(orgId, { snapshot, expiresAt: Date.now() + env.entitlements.cacheTtlMs });
            return snapshot;
        } catch {
            return buildSnapshot(orgId, []);
        }
    },

    // Drop the cached snapshot for one org. Called after a consume or
    // when the user returns from the billing flow.
    invalidate(orgId: string): void {
        cache.delete(orgId);
    },

    has(snapshot: Snapshot, slug: FeatureSlug): boolean {
        return isEnabled(snapshot, slug);
    },

    // Throw-on-missing version of `has`.
    requireFeature(snapshot: Snapshot, slug: FeatureSlug): void {
        if (!isEnabled(snapshot, slug)) {
            throw new EntitlementError(403, 'FEATURE_NOT_ENTITLED', `Feature ${slug} is not available on your plan`);
        }
    },

    // Max frequency the plan allows. Returns 'daily' when the tier is
    // missing, rank 0, or the org has no entitlements at all.
    maxFrequency(snapshot: Snapshot): Frequency {
        const entry = snapshot.entries.get('buybox.tier.update_frequency');
        if (!entry) return 'daily';
        if (entry.limit === null || entry.limit >= 3) return 'real_time';
        if (entry.limit === 2) return 'hourly';
        return 'daily';
    },

    clampFrequency(preferred: Frequency, snapshot: Snapshot): Frequency {
        const ceiling = this.maxFrequency(snapshot);
        return FREQUENCY_RANK[preferred] <= FREQUENCY_RANK[ceiling] ? preferred : ceiling;
    },

    // Retention in days. `null = unlimited` is returned as a 10-year
    // ceiling so DELETE queries stay bounded.
    retentionDays(snapshot: Snapshot): number {
        const entry = snapshot.entries.get('buybox.tier.history_retention_days');
        if (!entry) return 30;
        if (entry.limit === null) return 3650;
        return entry.limit;
    },

    // Derived limits — caller passes the live row count.
    checkLimit(
        snapshot: Snapshot,
        slug: (typeof LIMIT)[keyof typeof LIMIT],
        currentUsed: number
    ): { used: number; limit: number | null; atCap: boolean } {
        const entry = snapshot.entries.get(slug);
        const limit = entry?.limit ?? 0;
        const atCap = limit !== null && currentUsed >= limit;
        return { used: currentUsed, limit, atCap };
    },

    requireCapacity(
        snapshot: Snapshot,
        slug: (typeof LIMIT)[keyof typeof LIMIT],
        currentUsed: number
    ): void {
        const result = this.checkLimit(snapshot, slug, currentUsed);
        if (result.atCap) {
            throw new EntitlementError(
                402,
                'LIMIT_EXCEEDED',
                `Limit for ${slug} exceeded (${result.used} / ${result.limit ?? '∞'})`
            );
        }
    },

    // Flow limits — atomic check-and-increment on core-platform.
    async consume(orgId: string, slug: FlowSlug, amount = 1): Promise<void> {
        const result = await corePlatform.entitlements.consume(orgId, slug, amount);
        if (!result.allowed) {
            throw new EntitlementError(
                402,
                'LIMIT_EXCEEDED',
                `Limit for ${slug} exceeded (${result.usage_amount ?? 0} / ${result.limit_amount ?? '∞'})`
            );
        }
        this.invalidate(orgId);
    },
};
