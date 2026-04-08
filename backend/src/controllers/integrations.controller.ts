import { Request, Response } from 'express';
import { corePlatform } from '../services/corePlatform.client';
import { handleError } from '../utils/handle_error';

/**
 * Integrations Controller
 *
 * Thin proxy over sd-core-platform's integration endpoints. Buybox does NOT
 * own integration accounts — it reads them from the platform for the active org.
 *
 * GET /api/integrations/accounts
 *   Lists all connected integration accounts for the active organization.
 *   Protected by `authenticate` + `resolveOrganization`, so
 *   `req.auth.organization` is guaranteed to exist and to match the user.
 */
export const listAccounts = async (req: Request, res: Response) => {
    try {
        const orgId = req.auth!.organization!.id;
        const accounts = await corePlatform.integrations.listAccounts(orgId);
        res.json({ status: 'success', data: accounts });
    } catch (error) {
        handleError(res, error, 'listAccounts');
    }
};
