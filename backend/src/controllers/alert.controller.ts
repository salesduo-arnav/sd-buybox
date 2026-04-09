import { Request, Response } from 'express';
import { Alert } from '../models';
import { parsePagination, paginateQuery, buildPaginatedResult } from '../utils/pagination';
import { handleError, apiSuccess, apiError } from '../utils/handle_error';
import { getOrganizationId } from '../utils/request_auth';

// Alert Controller
//
// GET   /api/alerts            — List alerts (filterable by severity, read status)
// PATCH /api/alerts/:id/read   — Mark alert as read
// PATCH /api/alerts/read-all   — Mark all alerts as read

export const listAlerts = async (req: Request, res: Response) => {
    try {
        const organizationId = getOrganizationId(req);
        const pagination = parsePagination(req.query);
        const { severity, is_read: isReadFilter, account_id: accountIdFilter } = req.query;

        const whereClause: Record<string, unknown> = { organization_id: organizationId };
        if (severity) whereClause.severity = severity;
        if (isReadFilter !== undefined) whereClause.is_read = isReadFilter === 'true';
        if (accountIdFilter) whereClause.integration_account_id = accountIdFilter;

        const { count, rows } = await Alert.findAndCountAll({
            where: whereClause,
            ...paginateQuery(pagination),
            include: [{ association: 'product', attributes: ['id', 'asin', 'title', 'image_url'] }],
        });

        res.json(buildPaginatedResult(rows, count, pagination));
    } catch (error) {
        handleError(res, error, 'listAlerts');
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const { id: alertId } = req.params;
        const organizationId = getOrganizationId(req);

        const alert = await Alert.findOne({
            where: { id: alertId, organization_id: organizationId },
        });

        if (!alert) {
            return apiError(res, 404, 'NOT_FOUND', 'Alert not found');
        }

        await alert.update({ is_read: true });
        return apiSuccess(res, alert);
    } catch (error) {
        handleError(res, error, 'markAsRead');
    }
};

export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        const organizationId = getOrganizationId(req);
        const [updatedCount] = await Alert.update(
            { is_read: true },
            { where: { organization_id: organizationId, is_read: false } }
        );
        return apiSuccess(res, { updated: updatedCount });
    } catch (error) {
        handleError(res, error, 'markAllAsRead');
    }
};
