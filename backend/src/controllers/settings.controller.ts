import { Request, Response } from 'express';
import { TrackerConfig } from '../models';
import { handleError } from '../utils/handle_error';

/**
 * Settings Controller
 *
 * GET  /api/settings/:accountId   — Get tracker config for an account
 * PUT  /api/settings/:accountId   — Update tracker config
 */
export const getSettings = async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;
        const config = await TrackerConfig.findOne({
            where: { integration_account_id: accountId },
        });

        if (!config) {
            return res.status(404).json({ status: 'error', message: 'Settings not found' });
        }

        res.json({ status: 'success', data: config });
    } catch (error) {
        handleError(res, error, 'getSettings');
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;
        const organizationId = req.auth!.organization!.id;

        const [config, created] = await TrackerConfig.findOrCreate({
            where: { integration_account_id: accountId },
            defaults: {
                integration_account_id: accountId,
                organization_id: organizationId,
                ...req.body,
            },
        });

        if (!created) {
            await config.update(req.body);
        }

        res.json({ status: 'success', data: config });
    } catch (error) {
        handleError(res, error, 'updateSettings');
    }
};
