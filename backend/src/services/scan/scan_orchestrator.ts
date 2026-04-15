import { Op } from 'sequelize';
import { Scan, Product, TrackerConfig } from '../../models';
import {
    DEFAULT_MARKETPLACE_IDS,
    DEFAULT_SCAN_BATCH_SIZE,
    SCAN_STATUSES,
    TRACKING_SCOPES,
} from '../../config/constants';
import Logger from '../../utils/logger';
import { getAccountContext } from '../sp_api';
import configService from '../config.service';
import type { AccountScanPayload, ProductCheckPayload, ScanCompletionPayload } from './scan_types';

export interface OrchestratorDeps {
    enqueueProductCheck: (payload: ProductCheckPayload) => Promise<void>;
    enqueueCompletionFallback: (
        payload: ScanCompletionPayload,
        opts: { startAfterSeconds: number }
    ) => Promise<void>;
    completionFallbackSeconds: number;
}

export async function runAccountScan(
    payload: AccountScanPayload,
    deps: OrchestratorDeps
): Promise<void> {
    const { scanId, accountId, organizationId, marketplace } = payload;

    const scan = await Scan.findOne({ where: { id: scanId, organization_id: organizationId } });
    if (!scan) {
        Logger.warn('Account scan: scan row not found, skipping', { scanId });
        return;
    }

    // Tolerate pg-boss retries on a crashed orchestrator; bail only if finalized.
    if (scan.status === SCAN_STATUSES.COMPLETED || scan.status === SCAN_STATUSES.FAILED) {
        Logger.info('Account scan: scan already finalized, skipping', { scanId, status: scan.status });
        return;
    }

    await scan.update({
        status: SCAN_STATUSES.IN_PROGRESS,
        started_at: scan.started_at ?? new Date(),
        error_message: null,
    });

    try {
        // Prefer the integration account's marketplaceId; fall back to label lookup.
        const ctx = await getAccountContext(accountId);
        const marketplaceIds = configService.getSync<Record<string, string>>(
            'marketplace_ids',
            DEFAULT_MARKETPLACE_IDS
        );
        const marketplaceId =
            ctx.marketplaceId || marketplaceIds[marketplace.toUpperCase()];
        if (!marketplaceId) {
            throw new Error(`Cannot resolve marketplaceId for ${marketplace} on account ${accountId}`);
        }

        const config = await TrackerConfig.findOne({ where: { integration_account_id: accountId } });

        const products = await resolveScannableProducts({
            accountId,
            organizationId,
            scope: config?.tracking_scope ?? TRACKING_SCOPES.ALL,
            specificAsins: config?.specific_asins ?? null,
        });

        await scan.update({ total_products: products.length });

        if (products.length === 0) {
            await scan.update({
                status: SCAN_STATUSES.COMPLETED,
                completed_at: new Date(),
            });
            Logger.info('Account scan: no products to scan, completing immediately', { scanId });
            return;
        }

        const batchSize = configService.getSync<number>('scan_batch_size', DEFAULT_SCAN_BATCH_SIZE);
        for (let i = 0; i < products.length; i += batchSize) {
            const chunk = products.slice(i, i + batchSize);
            for (const product of chunk) {
                await deps.enqueueProductCheck({
                    scanId,
                    productId: product.id,
                    accountId,
                    organizationId,
                    asin: product.asin,
                    marketplaceId,
                });
            }
        }

        await deps.enqueueCompletionFallback(
            { scanId },
            { startAfterSeconds: deps.completionFallbackSeconds }
        );

        Logger.info('Account scan: fan-out complete', {
            scanId,
            totalProducts: products.length,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        Logger.error('Account scan orchestrator failed', { scanId, error: message });
        await scan.update({
            status: SCAN_STATUSES.FAILED,
            completed_at: new Date(),
            error_message: message,
        });
        // Re-throw so pg-boss applies its retry policy.
        throw err;
    }
}

async function resolveScannableProducts(params: {
    accountId: string;
    organizationId: string;
    scope: string;
    specificAsins: string[] | null;
}): Promise<Array<{ id: string; asin: string }>> {
    const where: Record<string, unknown> = {
        integration_account_id: params.accountId,
        organization_id: params.organizationId,
        track_buybox: true,
    };

    if (params.scope === TRACKING_SCOPES.SELECTED) {
        if (!params.specificAsins || params.specificAsins.length === 0) {
            return [];
        }
        where.asin = { [Op.in]: params.specificAsins };
    }

    const rows = await Product.findAll({
        where,
        attributes: ['id', 'asin'],
    });
    return rows.map((row) => ({ id: row.id, asin: row.asin }));
}
