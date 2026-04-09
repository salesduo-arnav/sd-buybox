import { Request, Response } from 'express';
import { TrackerConfig } from '../models';
import { corePlatform } from '../services/corePlatform.client';
import { handleError, apiSuccess, apiError } from '../utils/handle_error';
import { getOrganizationId } from '../utils/request_auth';
import { entitlements, EntitlementError, FEATURE, LIMIT, Snapshot } from '../services/entitlements';
import { TRACKING_SCOPES, UPDATE_FREQUENCIES, UpdateFrequency } from '../config/constants';

// GET /api/settings/:accountId, PUT /api/settings/:accountId

const PROTECTED = ['id', 'organization_id', 'integration_account_id', 'created_at', 'updated_at'];

// Keep only the fields a client is allowed to set.
function stripProtected(body: unknown): Record<string, unknown> {
    const input = (body ?? {}) as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(input)) {
        if (!PROTECTED.includes(key)) out[key] = input[key];
    }
    return out;
}

// Enforce plan restrictions on an incoming update. Silently strips or
// clamps restricted fields and returns the list so the API response can
// surface it via `meta.clamped_fields`.
function applyPlanRestrictions(
    updates: Record<string, unknown>,
    snapshot: Snapshot
): { sanitized: Record<string, unknown>; clamped: string[] } {
    const sanitized = { ...updates };
    const clamped: string[] = [];

    // If not in Entitlements but FE still sends these (e.g. from stale cache), strip them out and warn.
    if (!entitlements.has(snapshot, FEATURE.SLACK_ALERTS)) {
        if (sanitized.slack_alerts_enabled !== false) {
            sanitized.slack_alerts_enabled = false;
            clamped.push('slack_alerts_enabled');
        }
    }

    if (!entitlements.has(snapshot, FEATURE.CUSTOM_THRESHOLDS)) {
        if ('visibility_warning_threshold' in sanitized) {
            delete sanitized.visibility_warning_threshold;
            clamped.push('visibility_warning_threshold');
        }
        if ('visibility_critical_threshold' in sanitized) {
            delete sanitized.visibility_critical_threshold;
            clamped.push('visibility_critical_threshold');
        }
    }

    if (!entitlements.has(snapshot, FEATURE.CUSTOM_RECIPIENTS)) {
        if ('notification_emails' in sanitized) {
            delete sanitized.notification_emails;
            clamped.push('notification_emails');
        }
        if (sanitized.slack_channel_id != null) {
            sanitized.slack_channel_id = null;
            clamped.push('slack_channel_id');
        }
    }

    if (!entitlements.has(snapshot, FEATURE.SELECTED_TRACKING)) {
        if (sanitized.tracking_scope !== TRACKING_SCOPES.ALL) {
            sanitized.tracking_scope = TRACKING_SCOPES.ALL;
            clamped.push('tracking_scope');
        }
        if (sanitized.specific_asins != null) {
            sanitized.specific_asins = null;
            clamped.push('specific_asins');
        }
    }

    const preferred = sanitized.update_frequency as UpdateFrequency | undefined;
    if (preferred && isFrequency(preferred)) {
        const ceiling = entitlements.clampFrequency(preferred, snapshot);
        if (ceiling !== preferred) {
            sanitized.update_frequency = ceiling;
            clamped.push('update_frequency');
        }
    }

    return { sanitized, clamped };
}

function isFrequency(value: string): value is UpdateFrequency {
    return (
        value === UPDATE_FREQUENCIES.DAILY ||
        value === UPDATE_FREQUENCIES.HOURLY ||
        value === UPDATE_FREQUENCIES.REAL_TIME
    );
}

export const getSettings = async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;
        const orgId = getOrganizationId(req);

        const config = await TrackerConfig.findOne({
            where: { integration_account_id: accountId, organization_id: orgId },
        });

        if (!config) return apiError(res, 404, 'NOT_FOUND', 'Settings not found');
        return apiSuccess(res, config);
    } catch (err) {
        handleError(res, err, 'getSettings');
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;
        const orgId = getOrganizationId(req);

        const belongs = await corePlatform.integrations.accountBelongsToOrg(accountId, orgId);
        if (!belongs) return apiError(res, 404, 'NOT_FOUND', 'Account not found for this organization');

        const snapshot = await entitlements.snapshot(orgId);
        const { sanitized, clamped } = applyPlanRestrictions(stripProtected(req.body), snapshot);

        const existing = await TrackerConfig.findOne({
            where: { integration_account_id: accountId, organization_id: orgId },
        });

        if (!existing) {
            const accountsUsed = await TrackerConfig.count({ where: { organization_id: orgId } });
            try {
                entitlements.requireCapacity(snapshot, LIMIT.CONNECTED_ACCOUNTS, accountsUsed);
            } catch (err) {
                if (err instanceof EntitlementError) return err.send(res);
                throw err;
            }
        }

        const [config, wasCreated] = await TrackerConfig.findOrCreate({
            where: { integration_account_id: accountId, organization_id: orgId },
            defaults: { integration_account_id: accountId, organization_id: orgId, ...sanitized },
        });
        if (!wasCreated) await config.update(sanitized);

        return apiSuccess(res, config, {
            meta: clamped.length > 0 ? { clamped_fields: clamped } : undefined,
        });
    } catch (err) {
        handleError(res, err, 'updateSettings');
    }
};
