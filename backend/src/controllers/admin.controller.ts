import { Request, Response } from 'express';
import configService from '../services/config.service';
import { corePlatform } from '../services/corePlatform.client';
import { handleError } from '../utils/handle_error';

/**
 * Admin Controller
 *
 * GET  /api/admin/configs         — List all system configs
 * PUT  /api/admin/configs/:key    — Update a system config
 */
export const listConfigs = async (_req: Request, res: Response) => {
    try {
        const configs = await configService.getAll();
        res.json({ status: 'success', data: configs });
    } catch (error) {
        handleError(res, error, 'listConfigs');
    }
};

export const updateConfig = async (req: Request, res: Response) => {
    try {
        const { key } = req.params;
        const { config_value } = req.body;

        const config = await configService.set(key, config_value);

        // Fire-and-forget audit log — never throws.
        await corePlatform.audit.log({
            actor_id: req.auth!.user.id,
            organization_id: req.auth!.organization!.id,
            action: 'config.updated',
            entity_type: 'system_config',
            entity_id: key,
            details: { config_key: key, new_value: config_value },
        });

        res.json({ status: 'success', data: config });
    } catch (error) {
        handleError(res, error, 'updateConfig');
    }
};
