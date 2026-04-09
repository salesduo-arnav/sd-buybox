import { Request, Response } from 'express';
import configService from '../services/config.service';
import { corePlatform } from '../services/corePlatform.client';
import { handleError, apiSuccess } from '../utils/handle_error';
import { getOrganizationId, getUserId } from '../utils/request_auth';

// Admin Controller
//
// GET /api/admin/configs       — List all system configs
// PUT /api/admin/configs/:key  — Update a system config

export const listConfigs = async (_req: Request, res: Response) => {
    try {
        const configs = await configService.getAll();
        return apiSuccess(res, configs);
    } catch (error) {
        handleError(res, error, 'listConfigs');
    }
};

export const updateConfig = async (req: Request, res: Response) => {
    try {
        const { key } = req.params;
        const { config_value: configValue } = req.body;

        const updatedConfig = await configService.set(key, configValue);

        // Fire-and-forget audit log — never throws.
        await corePlatform.audit.log({
            actor_id: getUserId(req),
            organization_id: getOrganizationId(req),
            action: 'config.updated',
            entity_type: 'system_config',
            entity_id: key,
            details: { config_key: key },
        });

        return apiSuccess(res, updatedConfig);
    } catch (error) {
        handleError(res, error, 'updateConfig');
    }
};
