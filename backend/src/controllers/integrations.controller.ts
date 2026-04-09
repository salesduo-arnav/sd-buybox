import { Request, Response } from 'express';
import { corePlatform } from '../services/corePlatform.client';
import { handleError, apiSuccess } from '../utils/handle_error';
import { getOrganizationId } from '../utils/request_auth';

// Integrations Controller
//
// Thin proxy over sd-core-platform's integration endpoints. Buybox does NOT
// own integration accounts — it reads them from the platform for the active org.
//
// GET /api/integrations/accounts
//   Lists all connected integration accounts for the active organization.
//   Protected by `authenticate` + `resolveOrganization`, so
//   `req.auth.organization` is guaranteed to exist and to match the user.

export const listAccounts = async (req: Request, res: Response) => {
    try {
        const organizationId = getOrganizationId(req);
        const accounts = await corePlatform.integrations.listAccounts(organizationId);
        return apiSuccess(res, accounts);
    } catch (error) {
        handleError(res, error, 'listAccounts');
    }
};
