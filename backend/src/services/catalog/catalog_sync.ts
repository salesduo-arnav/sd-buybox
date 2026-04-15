import { Op } from 'sequelize';
import { Product } from '../../models';
import { LISTINGS_REPORT_TYPE, DEFAULT_MARKETPLACE_IDS } from '../../config/constants';
import configService from '../config.service';
import Logger from '../../utils/logger';
import { fetchListings, getAccountContext } from '../sp_api';
import { entitlements, LIMIT } from '../entitlements';
import { corePlatform } from '../corePlatform.client';

export interface CatalogSyncPayload {
    accountId?: string;
    organizationId?: string;
    marketplace?: string;
    triggeredBy?: 'scheduled' | 'manual';
}

export interface CatalogSyncResult {
    accountId: string;
    productsInserted: number;
    productsUpdated: number;
    productsSoftDeleted: number;
    skippedAtLimit: number;
}

// Never hard-deletes — delisted products stay soft-deleted so their
// history remains queryable. TRACKED_ASINS cap only gates new inserts.
export async function syncAccountCatalog(params: {
    accountId: string;
    organizationId: string;
    marketplace?: string;
}): Promise<CatalogSyncResult> {
    const { accountId, organizationId } = params;

    const ctx = await getAccountContext(accountId);
    const marketplaceIds = configService.getSync<Record<string, string>>(
        'marketplace_ids',
        DEFAULT_MARKETPLACE_IDS
    );
    const marketplaceId =
        ctx.marketplaceId ||
        (params.marketplace ? marketplaceIds[params.marketplace.toUpperCase()] : undefined);
    if (!marketplaceId) {
        throw new Error(`Account ${accountId} has no marketplaceId and none was provided`);
    }

    Logger.info('Catalog sync: requesting listings report', { accountId, marketplaceId });
    const listings = await fetchListings({
        accountId,
        marketplaceId,
        reportType: LISTINGS_REPORT_TYPE,
    });
    Logger.info(`Catalog sync: received ${listings.length} listings`, { accountId });

    const existing = await Product.findAll({
        where: { integration_account_id: accountId, organization_id: organizationId },
        attributes: ['id', 'asin', 'deleted_at'],
        paranoid: false,
    });
    const existingByAsin = new Map<string, { id: string; deletedAt: Date | null }>();
    for (const row of existing) {
        existingByAsin.set(row.asin, {
            id: row.id,
            deletedAt: (row as Product & { deleted_at: Date | null }).deleted_at ?? null,
        });
    }

    const snapshot = await entitlements.snapshot(organizationId);
    const activeCount = existing.filter((e) => !(e as Product & { deleted_at: Date | null }).deleted_at).length;

    const result: CatalogSyncResult = {
        accountId,
        productsInserted: 0,
        productsUpdated: 0,
        productsSoftDeleted: 0,
        skippedAtLimit: 0,
    };

    const seenAsins = new Set<string>();
    let currentUsed = activeCount;

    for (const row of listings) {
        seenAsins.add(row.asin);
        const prior = existingByAsin.get(row.asin);

        if (prior) {
            await Product.update(
                {
                    sku: row.sku,
                    title: row.title,
                    average_selling_price: row.price,
                    last_synced_at: new Date(),
                    deleted_at: null,
                },
                { where: { id: prior.id }, paranoid: false }
            );
            result.productsUpdated += 1;
            if (prior.deletedAt) currentUsed += 1;
            continue;
        }

        const cap = entitlements.checkLimit(snapshot, LIMIT.TRACKED_ASINS, currentUsed);
        if (cap.atCap) {
            result.skippedAtLimit += 1;
            continue;
        }

        await Product.create({
            integration_account_id: accountId,
            organization_id: organizationId,
            asin: row.asin,
            sku: row.sku,
            title: row.title,
            average_selling_price: row.price,
            track_buybox: true,
            last_synced_at: new Date(),
        });
        result.productsInserted += 1;
        currentUsed += 1;
    }

    const toDelete = Array.from(existingByAsin.entries())
        .filter(([asin, meta]) => !seenAsins.has(asin) && !meta.deletedAt)
        .map(([, meta]) => meta.id);

    if (toDelete.length > 0) {
        await Product.update(
            { deleted_at: new Date() },
            { where: { id: { [Op.in]: toDelete } }, paranoid: false }
        );
        result.productsSoftDeleted = toDelete.length;
    }

    Logger.info('Catalog sync: done', result);
    return result;
}

// Enqueues one per-account sync rather than syncing inline so pg-boss
// can retry each account independently.
export async function fanOutCatalogSync(params: {
    enqueue: (payload: CatalogSyncPayload) => Promise<void>;
    triggeredBy?: 'scheduled' | 'manual';
}): Promise<{ enqueued: number }> {
    const accounts = await corePlatform.integrations.listAllConnected();
    let enqueued = 0;
    for (const account of accounts) {
        await params.enqueue({
            accountId: account.id,
            organizationId: account.organization_id,
            triggeredBy: params.triggeredBy ?? 'scheduled',
        });
        enqueued += 1;
    }
    Logger.info(`Catalog sync fan-out: enqueued ${enqueued} account syncs`);
    return { enqueued };
}

// Branches on payload shape so the recurring schedule (no accountId)
// and manual per-account triggers share one queue.
export async function handleCatalogSync(params: {
    payload: CatalogSyncPayload;
    enqueue: (payload: CatalogSyncPayload) => Promise<void>;
}): Promise<void> {
    const { payload, enqueue } = params;

    if (!payload.accountId || !payload.organizationId) {
        await fanOutCatalogSync({ enqueue, triggeredBy: payload.triggeredBy });
        return;
    }

    await syncAccountCatalog({
        accountId: payload.accountId,
        organizationId: payload.organizationId,
        marketplace: payload.marketplace,
    });
}
