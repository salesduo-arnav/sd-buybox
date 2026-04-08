import { Request, Response } from 'express';
import { Alert } from '../models';
import { parsePagination, paginateQuery, buildPaginatedResult } from '../utils/pagination';
import { handleError } from '../utils/handle_error';

/**
 * Alert Controller
 *
 * GET   /api/alerts            — List alerts (filterable by severity, read status)
 * PATCH /api/alerts/:id/read   — Mark alert as read
 * PATCH /api/alerts/read-all   — Mark all alerts as read
 */
export const listAlerts = async (req: Request, res: Response) => {
    try {
        const organizationId = req.auth!.organization!.id;
        const pagination = parsePagination(req.query);
        const { severity, is_read, account_id } = req.query;

        const where: Record<string, unknown> = { organization_id: organizationId };
        if (severity) where.severity = severity;
        if (is_read !== undefined) where.is_read = is_read === 'true';
        if (account_id) where.integration_account_id = account_id;

        const { count, rows } = await Alert.findAndCountAll({
            where,
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
        const { id } = req.params;
        const alert = await Alert.findByPk(id);

        if (!alert) {
            return res.status(404).json({ status: 'error', message: 'Alert not found' });
        }

        await alert.update({ is_read: true });
        res.json({ status: 'success', data: alert });
    } catch (error) {
        handleError(res, error, 'markAsRead');
    }
};

export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        const organizationId = req.auth!.organization!.id;
        await Alert.update({ is_read: true }, { where: { organization_id: organizationId, is_read: false } });
        res.json({ status: 'success', message: 'All alerts marked as read' });
    } catch (error) {
        handleError(res, error, 'markAllAsRead');
    }
};
