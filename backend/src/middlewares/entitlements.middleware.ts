import { Request, Response, NextFunction } from 'express';
import { getOrganizationId } from '../utils/request_auth';
import { apiError } from '../utils/handle_error';
import { entitlements, EntitlementError, FeatureSlug } from '../services/entitlements';

// Returns 402 when the org has no active buybox entitlements at all.
// Mounted as the top of every gated route group.
export async function requireAnyEntitlement(req: Request, res: Response, next: NextFunction) {
    try {
        const snapshot = await entitlements.snapshot(getOrganizationId(req));
        if (!snapshot.hasAny) {
            return apiError(res, 402, 'SUBSCRIPTION_REQUIRED', 'Active buybox subscription required');
        }
        next();
    } catch (err) {
        if (err instanceof EntitlementError) return err.send(res);
        return apiError(res, 500, 'INTERNAL_ERROR', 'Entitlement check failed');
    }
}

// Factory for a boolean feature gate. 403 when the feature is off.
export function requireFeature(slug: FeatureSlug) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const snapshot = await entitlements.snapshot(getOrganizationId(req));
            entitlements.requireFeature(snapshot, slug);
            next();
        } catch (err) {
            if (err instanceof EntitlementError) return err.send(res);
            return apiError(res, 500, 'INTERNAL_ERROR', 'Entitlement check failed');
        }
    };
}
