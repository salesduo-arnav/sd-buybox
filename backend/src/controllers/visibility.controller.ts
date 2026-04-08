import { Request, Response } from 'express';
import { handleError } from '../utils/handle_error';

/**
 * Visibility Controller
 *
 * GET /api/visibility/overview  — Dashboard overview (KPIs, charts, loss breakdown)
 */
export const getOverview = async (_req: Request, res: Response) => {
    try {
        // TODO: Call metricsService.getOverview(...) using req.auth.organization.id, period, account_id

        res.json({
            status: 'success',
            data: {
                avg_visibility: 0,
                total_missed_sales: 0,
                products_affected: 0,
                last_updated: null,
                visibility_timeline: [],
                loss_reasons: [],
                trends: {
                    visibility: 0,
                    missed_sales: 0,
                    products_affected: 0,
                },
            },
        });
    } catch (error) {
        handleError(res, error, 'getOverview');
    }
};
