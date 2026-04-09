import { Request, Response } from 'express';
import { TrackerConfig } from '../models';
import { corePlatform } from '../services/corePlatform.client';
import { handleError, apiSuccess, apiError } from '../utils/handle_error';
import { getOrganizationId } from '../utils/request_auth';

// Settings Controller
//
// GET /api/settings/:accountId   — Get tracker config for an account
// PUT /api/settings/:accountId   — Update tracker config
//
// Both endpoints require that `:accountId` is an integration account actually
// connected to the active organization — verified against sd-core-platform.

// Fields the client is never allowed to set directly. Stripped from req.body
// before writing to the database.
const PROTECTED_CONFIG_FIELDS = ['id', 'organization_id', 'integration_account_id', 'created_at', 'updated_at'];

function stripProtectedFields(body: unknown): Record<string, unknown> {
    const source = (body ?? {}) as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};
    for (const key of Object.keys(source)) {
        if (!PROTECTED_CONFIG_FIELDS.includes(key)) {
            sanitized[key] = source[key];
        }
    }
    return sanitized;
}

export const getSettings = async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;
        const organizationId = getOrganizationId(req);

        const config = await TrackerConfig.findOne({
            where: { integration_account_id: accountId, organization_id: organizationId },
        });

        if (!config) {
            return apiError(res, 404, 'NOT_FOUND', 'Settings not found');
        }

        return apiSuccess(res, config);
    } catch (error) {
        handleError(res, error, 'getSettings');
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;
        const organizationId = getOrganizationId(req);

        const belongsToOrg = await corePlatform.integrations.accountBelongsToOrg(accountId, organizationId);
        if (!belongsToOrg) {
            return apiError(res, 404, 'NOT_FOUND', 'Account not found for this organization');
        }

        const updatableFields = stripProtectedFields(req.body);

        const [config, wasCreated] = await TrackerConfig.findOrCreate({
            where: { integration_account_id: accountId, organization_id: organizationId },
            defaults: {
                integration_account_id: accountId,
                organization_id: organizationId,
                ...updatableFields,
            },
        });

        if (!wasCreated) {
            await config.update(updatableFields);
        }

        return apiSuccess(res, config);
    } catch (error) {
        handleError(res, error, 'updateSettings');
    }
};
