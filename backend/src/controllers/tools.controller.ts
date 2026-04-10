import { Request, Response } from 'express';
import { corePlatform } from '../services/corePlatform.client';
import { handleError, apiSuccess } from '../utils/handle_error';

// Tools Controller
//
// Thin proxy over sd-core-platform's tool endpoints. The frontend
// IntegrationGuard calls this to discover which integrations the
// buybox tool requires before allowing access.
//
// GET /api/tools/by-slug/:slug
//   Returns tool metadata including `required_integrations`.
//   Protected by `authenticate` so `req.auth.sessionId` is available
//   for forwarding to core-platform.

export const getToolBySlug = async (req: Request, res: Response) => {
    try {
        const { slug } = req.params;
        const tool = await corePlatform.tools.getBySlug(slug, req.auth!.sessionId, {
            userAgent: req.headers['user-agent'] || undefined,
            ip: req.ip || undefined,
        });
        return apiSuccess(res, tool);
    } catch (error) {
        handleError(res, error, 'getToolBySlug');
    }
};
