import { Request, Response } from 'express';
import { handleError, apiSuccess } from '../utils/handle_error';
import { getOrganizationId } from '../utils/request_auth';
import { entitlements, FEATURE } from '../services/entitlements';

// GET /api/visibility/overview — dashboard KPIs + (if entitled) charts.

const EMPTY_KPIS = {
    avg_visibility: 0,
    total_missed_sales: 0,
    products_affected: 0,
    last_updated: null,
};

const EMPTY_ADVANCED = {
    visibility_timeline: [],
    loss_reasons: [],
    trends: { visibility: 0, missed_sales: 0, products_affected: 0 },
};

export const getOverview = async (req: Request, res: Response) => {
    try {
        const snapshot = await entitlements.snapshot(getOrganizationId(req));
        const hasAdvanced = entitlements.has(snapshot, FEATURE.ADVANCED_ANALYTICS);

        // TODO: call metricsService.getOverview once it exists.
        return apiSuccess(res, hasAdvanced ? { ...EMPTY_KPIS, ...EMPTY_ADVANCED } : EMPTY_KPIS);
    } catch (err) {
        handleError(res, err, 'getOverview');
    }
};
