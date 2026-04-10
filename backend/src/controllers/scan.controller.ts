import { Request, Response } from 'express';
import { Scan } from '../models';
import { corePlatform } from '../services/corePlatform.client';
import configService from '../services/config.service';
import { handleError, apiSuccess, apiError } from '../utils/handle_error';
import { getOrganizationId } from '../utils/request_auth';
import { SCAN_TRIGGERS, SCAN_STATUSES } from '../config/constants';
import { entitlements, EntitlementError, LIMIT } from '../services/entitlements';

// Scan Controller
//
// POST /api/scans/trigger  — Manually trigger a scan
// GET  /api/scans          — List scans for an account
// GET  /api/scans/:id      — Get scan details

export const triggerScan = async (req: Request, res: Response) => {
    try {
        const organizationId = getOrganizationId(req);
        const defaultMarketplace = configService.getSync('default_marketplace', 'US');
        const { account_id: accountId, marketplace = defaultMarketplace } = (req.body ?? {}) as {
            account_id?: unknown;
            marketplace?: unknown;
        };

        if (typeof accountId !== 'string' || !accountId) {
            return apiError(res, 400, 'INVALID_REQUEST', 'account_id is required');
        }
        if (typeof marketplace !== 'string' || !marketplace) {
            return apiError(res, 400, 'INVALID_REQUEST', 'marketplace must be a non-empty string');
        }

        const belongsToOrg = await corePlatform.integrations.accountBelongsToOrg(accountId, organizationId);
        if (!belongsToOrg) {
            return apiError(res, 404, 'NOT_FOUND', 'Account not found for this organization');
        }

        const activeScan = await Scan.findOne({
            where: {
                integration_account_id: accountId,
                organization_id: organizationId,
                status: [SCAN_STATUSES.QUEUED, SCAN_STATUSES.IN_PROGRESS],
            },
        });

        if (activeScan) {
            return apiError(res, 409, 'SCAN_IN_PROGRESS', 'A scan is already in progress for this account');
        }

        // Only manual scans count against the monthly quota. Scheduled
        // scans are gated by the update_frequency tier instead.
        try {
            await entitlements.consume(organizationId, LIMIT.SCANS_PER_MONTH);
        } catch (err) {
            if (err instanceof EntitlementError) return err.send(res);
            throw err;
        }

        const scan = await Scan.create({
            integration_account_id: accountId,
            organization_id: organizationId,
            triggered_by: SCAN_TRIGGERS.MANUAL,
            marketplace,
        });

        // TODO: Enqueue buybox:account-scan job via pg-boss
        return apiSuccess(res, scan, { statusCode: 201 });
    } catch (error) {
        handleError(res, error, 'triggerScan');
    }
};

export const listScans = async (req: Request, res: Response) => {
    try {
        const organizationId = getOrganizationId(req);
        const { account_id: accountIdFilter } = req.query;

        const whereClause: Record<string, unknown> = { organization_id: organizationId };
        if (accountIdFilter) whereClause.integration_account_id = accountIdFilter;

        const scans = await Scan.findAll({
            where: whereClause,
            order: [['created_at', 'DESC']],
            limit: configService.getSync('recent_scans_limit', 20),
        });

        return apiSuccess(res, scans);
    } catch (error) {
        handleError(res, error, 'listScans');
    }
};

export const getScan = async (req: Request, res: Response) => {
    try {
        const { id: scanId } = req.params;
        const organizationId = getOrganizationId(req);

        const scan = await Scan.findOne({
            where: { id: scanId, organization_id: organizationId },
        });

        if (!scan) {
            return apiError(res, 404, 'NOT_FOUND', 'Scan not found');
        }

        return apiSuccess(res, scan);
    } catch (error) {
        handleError(res, error, 'getScan');
    }
};
