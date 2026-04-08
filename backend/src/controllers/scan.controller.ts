import { Request, Response } from 'express';
import { Scan } from '../models';
import { handleError } from '../utils/handle_error';
import { SCAN_TRIGGERS, SCAN_STATUSES } from '../config/constants';

/**
 * Scan Controller
 *
 * POST /api/scans/trigger         — Manually trigger a scan
 * GET  /api/scans                 — List scans for an account
 * GET  /api/scans/:id             — Get scan details
 */
export const triggerScan = async (req: Request, res: Response) => {
    try {
        const { account_id, marketplace = 'US' } = req.body;
        const organizationId = req.auth!.organization!.id;

        // Check for active scans
        const activeScan = await Scan.findOne({
            where: {
                integration_account_id: account_id,
                status: [SCAN_STATUSES.QUEUED, SCAN_STATUSES.IN_PROGRESS],
            },
        });

        if (activeScan) {
            return res.status(409).json({
                status: 'error',
                message: 'A scan is already in progress for this account',
            });
        }

        const scan = await Scan.create({
            integration_account_id: account_id,
            organization_id: organizationId,
            triggered_by: SCAN_TRIGGERS.MANUAL,
            marketplace,
        });

        // TODO: Enqueue buybox:account-scan job via pg-boss

        res.status(201).json({ status: 'success', data: scan });
    } catch (error) {
        handleError(res, error, 'triggerScan');
    }
};

export const listScans = async (req: Request, res: Response) => {
    try {
        const organizationId = req.auth!.organization!.id;
        const { account_id } = req.query;

        const where: Record<string, unknown> = { organization_id: organizationId };
        if (account_id) where.integration_account_id = account_id;

        const scans = await Scan.findAll({
            where,
            order: [['created_at', 'DESC']],
            limit: 20,
        });

        res.json({ status: 'success', data: scans });
    } catch (error) {
        handleError(res, error, 'listScans');
    }
};

export const getScan = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const scan = await Scan.findByPk(id);

        if (!scan) {
            return res.status(404).json({ status: 'error', message: 'Scan not found' });
        }

        res.json({ status: 'success', data: scan });
    } catch (error) {
        handleError(res, error, 'getScan');
    }
};
