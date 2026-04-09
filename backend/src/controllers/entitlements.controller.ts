import { Request, Response } from 'express';
import { apiSuccess, handleError } from '../utils/handle_error';
import { getOrganizationId } from '../utils/request_auth';
import { entitlements, FEATURE, LIMIT } from '../services/entitlements';
import { Product, TrackerConfig } from '../models';

// GET /api/entitlements/me — snapshot the frontend reads to drive paywalls.
export const getMe = async (req: Request, res: Response) => {
    try {
        const orgId = getOrganizationId(req);
        const snapshot = await entitlements.snapshot(orgId);

        const [asinsUsed, accountsUsed] = await Promise.all([
            Product.count({ where: { organization_id: orgId } }),
            TrackerConfig.count({ where: { organization_id: orgId } }),
        ]);

        return apiSuccess(res, {
            organization_id: orgId,
            has_any_entitlement: snapshot.hasAny,
            features: {
                slack_alerts: entitlements.has(snapshot, FEATURE.SLACK_ALERTS),
                custom_thresholds: entitlements.has(snapshot, FEATURE.CUSTOM_THRESHOLDS),
                custom_recipients: entitlements.has(snapshot, FEATURE.CUSTOM_RECIPIENTS),
                selected_tracking: entitlements.has(snapshot, FEATURE.SELECTED_TRACKING),
                advanced_analytics: entitlements.has(snapshot, FEATURE.ADVANCED_ANALYTICS),
            },
            tiers: {
                max_frequency: entitlements.maxFrequency(snapshot),
                retention_days: entitlements.retentionDays(snapshot),
            },
            limits: {
                tracked_asins: entitlements.checkLimit(snapshot, LIMIT.TRACKED_ASINS, asinsUsed),
                connected_accounts: entitlements.checkLimit(snapshot, LIMIT.CONNECTED_ACCOUNTS, accountsUsed),
            },
        });
    } catch (err) {
        return handleError(res, err, 'entitlements.getMe');
    }
};

// POST /api/entitlements/refresh — flush the 60s cache after the user
// returns from the core-platform billing flow.
export const refresh = async (req: Request, res: Response) => {
    try {
        entitlements.invalidate(getOrganizationId(req));
        return apiSuccess(res, { invalidated: true });
    } catch (err) {
        return handleError(res, err, 'entitlements.refresh');
    }
};
