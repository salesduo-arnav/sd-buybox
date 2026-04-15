import { Op } from 'sequelize';
import { Scan, Product, BuyBoxSnapshot, Alert } from '../../models';
import {
    ALERT_TYPES,
    SCAN_STATUSES,
    SEVERITIES,
    WINNER_TYPES,
} from '../../config/constants';
import Logger from '../../utils/logger';
import { getItemOffers, getAccountContext } from '../sp_api';
import {
    classifyBuybox,
    estimateMissedSales,
    findLowestThirdPartyOffer,
    findOwnOffer,
} from '../../utils/buybox_logic';
import type { ProductCheckPayload } from './scan_types';

export interface ProductCheckDeps {
    enqueueAlertDispatch: (alertId: string, organizationId: string) => Promise<void>;
}

export async function runProductCheck(
    payload: ProductCheckPayload,
    deps: ProductCheckDeps
): Promise<void> {
    const { scanId, productId, accountId, organizationId, asin, marketplaceId } = payload;

    const product = await Product.findOne({
        where: { id: productId, organization_id: organizationId },
    });
    if (!product) {
        Logger.warn('Product check: product not found, skipping', { productId, scanId });
        await advanceScanProgress(scanId, organizationId, { issue: false });
        return;
    }

    const ctx = await getAccountContext(accountId);
    const ownSellerId = ctx.sellerId;

    let offersResult;
    try {
        offersResult = await getItemOffers({ accountId, asin, marketplaceId });
    } catch (err) {
        // Treat as a skipped product so one broken ASIN doesn't block
        // scan completion; pg-boss retries transient failures upstream.
        const message = err instanceof Error ? err.message : String(err);
        Logger.error('Product check: getItemOffers failed, marking product skipped', {
            scanId, productId, asin, error: message,
        });
        await advanceScanProgress(scanId, organizationId, { issue: false });
        return;
    }

    const classification = classifyBuybox({
        offers: offersResult.offers,
        ownSellerId,
    });
    const ownOffer = findOwnOffer(offersResult.offers, ownSellerId);
    const lowestThirdParty = findLowestThirdPartyOffer(offersResult.offers, ownSellerId);

    const ownPrice = priceOf(ownOffer);
    const buyboxPrice = priceOf(classification.winner);
    const lowest3pPrice = priceOf(lowestThirdParty);

    const missedSales = estimateMissedSales({
        hasBuybox: classification.hasBuybox,
        estimatedDailyUnits: toNumber(product.estimated_daily_units),
        averageSellingPrice: toNumber(product.average_selling_price),
        buyboxPrice,
    });

    await BuyBoxSnapshot.create({
        product_id: productId,
        scan_id: scanId,
        organization_id: organizationId,
        integration_account_id: accountId,
        has_buybox: classification.hasBuybox,
        is_suppressed: classification.isSuppressed,
        our_price: ownPrice,
        buybox_price: buyboxPrice,
        lowest_3p_price: lowest3pPrice,
        winner_type: classification.winnerType,
        loss_reason: classification.lossReason,
        est_missed_sales: missedSales,
        snapshot_at: new Date(),
    });

    const alert = await maybeCreateAlert({
        productId,
        scanId,
        organizationId,
        accountId,
        classification,
        buyboxPrice,
        ownPrice,
        missedSales,
        asin,
    });

    if (alert) {
        try {
            await deps.enqueueAlertDispatch(alert.id, organizationId);
        } catch (err) {
            // Alert is already persisted — don't fail the product check on enqueue blip.
            Logger.warn('Failed to enqueue alert dispatch', {
                alertId: alert.id,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    await advanceScanProgress(scanId, organizationId, { issue: Boolean(alert) });
}

function priceOf(offer: { listingPrice: number | null; shipping: number | null } | undefined): number | null {
    if (!offer) return null;
    const listing = offer.listingPrice ?? 0;
    const shipping = offer.shipping ?? 0;
    const total = listing + shipping;
    return Number.isFinite(total) ? total : null;
}

// Sequelize returns DECIMAL columns as strings — normalize to number here.
function toNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
}

// Emits an Alert row on a state transition vs. the most recent prior snapshot.
async function maybeCreateAlert(params: {
    productId: string;
    scanId: string;
    organizationId: string;
    accountId: string;
    classification: ReturnType<typeof classifyBuybox>;
    buyboxPrice: number | null;
    ownPrice: number | null;
    missedSales: number;
    asin: string;
}): Promise<Alert | null> {
    const prior = await BuyBoxSnapshot.findOne({
        where: {
            product_id: params.productId,
            scan_id: { [Op.ne]: params.scanId },
        },
        order: [['snapshot_at', 'DESC']],
    });

    const curHas = params.classification.hasBuybox;
    const priorHas = prior?.has_buybox ?? null;

    let alertType: string | null = null;
    let severity: string = SEVERITIES.WARNING;

    if (priorHas === null && !curHas) {
        alertType = ALERT_TYPES.BUYBOX_LOST;
    } else if (priorHas === true && !curHas) {
        alertType = ALERT_TYPES.BUYBOX_LOST;
    } else if (priorHas === false && curHas) {
        alertType = ALERT_TYPES.BUYBOX_RECOVERED;
        severity = SEVERITIES.INFO;
    }

    if (!alertType) return null;

    // Suppression usually signals a pricing/listing violation — escalate.
    if (alertType === ALERT_TYPES.BUYBOX_LOST && params.classification.winnerType === WINNER_TYPES.SUPPRESSED) {
        severity = SEVERITIES.CRITICAL;
    }

    return Alert.create({
        product_id: params.productId,
        organization_id: params.organizationId,
        integration_account_id: params.accountId,
        alert_type: alertType,
        severity,
        title: alertTitle(alertType, params.asin),
        message: alertMessage({
            alertType,
            asin: params.asin,
            classification: params.classification,
            buyboxPrice: params.buyboxPrice,
            ownPrice: params.ownPrice,
            missedSales: params.missedSales,
        }),
        metadata: {
            scan_id: params.scanId,
            winner_type: params.classification.winnerType,
            loss_reason: params.classification.lossReason,
            buybox_price: params.buyboxPrice,
            our_price: params.ownPrice,
            est_missed_sales: params.missedSales,
        },
    });
}

function alertTitle(alertType: string, asin: string): string {
    if (alertType === ALERT_TYPES.BUYBOX_RECOVERED) return `Buy Box recovered — ${asin}`;
    return `Buy Box lost — ${asin}`;
}

function alertMessage(params: {
    alertType: string;
    asin: string;
    classification: ReturnType<typeof classifyBuybox>;
    buyboxPrice: number | null;
    ownPrice: number | null;
    missedSales: number;
}): string {
    if (params.alertType === ALERT_TYPES.BUYBOX_RECOVERED) {
        return `You're back in the Buy Box for ${params.asin} at ${formatPrice(params.ownPrice)}.`;
    }

    const winner = params.classification.winnerType;
    const where =
        winner === WINNER_TYPES.AMAZON_VC ? 'to Amazon Retail' :
        winner === WINNER_TYPES.SUPPRESSED ? '— Buy Box suppressed by Amazon' :
        'to a third-party seller';
    const at = params.buyboxPrice !== null ? ` at ${formatPrice(params.buyboxPrice)}` : '';
    const your = params.ownPrice !== null ? `; your price: ${formatPrice(params.ownPrice)}` : '';
    const impact =
        params.missedSales > 0
            ? `. Estimated daily revenue at risk: ${formatPrice(params.missedSales)}.`
            : '.';
    return `You lost the Buy Box for ${params.asin} ${where}${at}${your}${impact}`;
}

function formatPrice(value: number | null): string {
    if (value === null) return '—';
    return `$${value.toFixed(2)}`;
}

// Atomic `Scan.increment` keeps counters correct under parallel workers.
export async function advanceScanProgress(
    scanId: string,
    organizationId: string,
    opts: { issue: boolean }
): Promise<void> {
    const increments: Record<string, number> = { scanned_products: 1 };
    if (opts.issue) increments.issues_found = 1;

    await Scan.increment(increments, { where: { id: scanId, organization_id: organizationId } });

    const scan = await Scan.findOne({ where: { id: scanId, organization_id: organizationId } });
    if (!scan) return;

    if (scan.status !== SCAN_STATUSES.IN_PROGRESS) return;
    if (scan.scanned_products < scan.total_products) return;

    await scan.update({
        status: SCAN_STATUSES.COMPLETED,
        completed_at: new Date(),
    });
    Logger.info('Scan completed (inline)', {
        scanId,
        totalProducts: scan.total_products,
        issuesFound: scan.issues_found,
    });
}
