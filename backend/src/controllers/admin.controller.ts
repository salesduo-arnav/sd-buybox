import { Request, Response } from 'express';
import configService from '../services/config.service';
import { corePlatform } from '../services/corePlatform.client';
import { handleError, apiSuccess, apiError } from '../utils/handle_error';
import { getOrganizationId, getUserId } from '../utils/request_auth';

// Admin Controller
//
// GET /api/admin/configs       — List all system configs
// PUT /api/admin/configs/:key  — Update a system config

// Valid options for `select`-type configs.
const SELECT_OPTIONS: Record<string, string[]> = {
    default_update_frequency: ['real_time', 'hourly', 'daily'],
    default_marketplace: ['US', 'CA', 'UK', 'DE', 'FR', 'IT', 'ES', 'JP', 'AU', 'IN', 'MX', 'BR'],
    entitlement_frequency_fallback: ['real_time', 'hourly', 'daily'],
};

function validateConfigValue(value: unknown, configType: string, configKey: string): string | null {
    switch (configType) {
        case 'boolean':
            if (typeof value !== 'boolean') return 'Value must be a boolean';
            break;
        case 'integer':
            if (!Number.isInteger(value) || (value as number) < 0) return 'Value must be a non-negative integer';
            break;
        case 'decimal':
            if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 'Value must be a non-negative number';
            break;
        case 'text':
            if (typeof value !== 'string' || value.trim() === '') return 'Value must be a non-empty string';
            break;
        case 'json':
            if (typeof value !== 'object' || value === null) return 'Value must be a JSON object or array';
            break;
        case 'select': {
            const allowed = SELECT_OPTIONS[configKey];
            if (!allowed) return `No select options defined for key "${configKey}"`;
            if (typeof value !== 'string' || !allowed.includes(value)) {
                return `Value must be one of: ${allowed.join(', ')}`;
            }
            break;
        }
        default:
            break;
    }
    return null;
}

export const listConfigs = async (_req: Request, res: Response) => {
    try {
        const rows = await configService.getAll();
        const configs = rows.map((c) => ({
            key: c.config_key,
            value: c.config_value,
            type: c.config_type,
            category: c.category,
            description: c.description,
        }));
        return apiSuccess(res, { configs });
    } catch (error) {
        handleError(res, error, 'listConfigs');
    }
};

export const updateConfig = async (req: Request, res: Response) => {
    try {
        const { key } = req.params;
        const { config_value: configValue } = req.body;

        if (configValue === undefined) {
            return apiError(res, 400, 'VALIDATION_ERROR', 'config_value is required');
        }

        // Look up existing config for type-based validation.
        const rows = await configService.getAll();
        const existing = rows.find((c) => c.config_key === key);
        if (!existing) {
            return apiError(res, 404, 'NOT_FOUND', `Config key "${key}" not found`);
        }

        const validationError = validateConfigValue(configValue, existing.config_type, key);
        if (validationError) {
            return apiError(res, 400, 'VALIDATION_ERROR', validationError);
        }

        const updatedConfig = await configService.set(key, configValue);

        // Fire-and-forget audit log — never throws.
        corePlatform.audit.log({
            actor_id: getUserId(req),
            organization_id: getOrganizationId(req),
            action: 'config.updated',
            entity_type: 'system_config',
            entity_id: key,
            details: { config_key: key },
        });

        return apiSuccess(res, {
            key: updatedConfig.config_key,
            value: updatedConfig.config_value,
            type: updatedConfig.config_type,
            category: updatedConfig.category,
            description: updatedConfig.description,
        });
    } catch (error) {
        handleError(res, error, 'updateConfig');
    }
};
