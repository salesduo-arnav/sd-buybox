import axios from 'axios';
import { spApiRequest } from './sp_api.client';
import { env } from '../../config/env';
import Logger from '../../utils/logger';
import { sleep } from '../../utils/sleep';
import type { ListingRow, ReportProcessingStatus } from './sp_api.types';

interface CreateReportResponse {
    reportId: string;
}

interface ReportStatusResponse {
    reportId: string;
    processingStatus: ReportProcessingStatus;
    reportDocumentId?: string;
}

interface ReportDocumentResponse {
    reportDocumentId: string;
    url: string;
    compressionAlgorithm?: 'GZIP';
}

export async function requestReport(params: {
    accountId: string;
    marketplaceId: string;
    reportType: string;
}): Promise<string> {
    const response = await spApiRequest<CreateReportResponse>({
        accountId: params.accountId,
        method: 'POST',
        path: '/reports/2021-06-30/reports',
        body: {
            reportType: params.reportType,
            marketplaceIds: [params.marketplaceId],
        },
    });
    return response.reportId;
}

export async function pollReportUntilDone(params: {
    accountId: string;
    reportId: string;
}): Promise<ReportStatusResponse> {
    const deadline = Date.now() + env.spApi.reportPollTimeoutMs;
    while (true) {
        const status = await spApiRequest<ReportStatusResponse>({
            accountId: params.accountId,
            method: 'GET',
            path: `/reports/2021-06-30/reports/${params.reportId}`,
            skipThrottle: true,
        });

        if (status.processingStatus === 'DONE') return status;
        if (status.processingStatus === 'CANCELLED' || status.processingStatus === 'FATAL') {
            throw new Error(`Report ${params.reportId} ended in ${status.processingStatus}`);
        }
        if (Date.now() > deadline) {
            throw new Error(`Report ${params.reportId} did not complete within ${env.spApi.reportPollTimeoutMs}ms`);
        }

        await sleep(env.spApi.reportPollIntervalMs);
    }
}

export async function downloadReportDocument(params: {
    accountId: string;
    reportDocumentId: string;
}): Promise<string> {
    const doc = await spApiRequest<ReportDocumentResponse>({
        accountId: params.accountId,
        method: 'GET',
        path: `/reports/2021-06-30/documents/${params.reportDocumentId}`,
        skipThrottle: true,
    });

    if (doc.compressionAlgorithm === 'GZIP') {
        const response = await axios.get<ArrayBuffer>(doc.url, {
            responseType: 'arraybuffer',
            timeout: env.spApi.requestTimeoutMs,
        });
        const zlib = await import('node:zlib');
        const buffer = Buffer.from(response.data);
        return zlib.gunzipSync(buffer).toString('utf-8');
    }

    const response = await axios.get<string>(doc.url, {
        responseType: 'text',
        timeout: env.spApi.requestTimeoutMs,
    });
    return response.data;
}

// Column names vary across marketplaces — match aliases case-insensitively
// so Amazon renaming a header doesn't silently drop the sync.
export function parseListingsTsv(tsv: string): ListingRow[] {
    const lines = tsv.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return [];

    const header = lines[0].split('\t').map((h) => h.trim().toLowerCase());
    const indexOf = (aliases: string[]): number => {
        for (const alias of aliases) {
            const idx = header.indexOf(alias);
            if (idx !== -1) return idx;
        }
        return -1;
    };

    const idxAsin = indexOf(['asin1', 'asin']);
    const idxSku = indexOf(['seller-sku', 'sku']);
    const idxTitle = indexOf(['item-name', 'product-name', 'title']);
    const idxPrice = indexOf(['price']);
    const idxQty = indexOf(['quantity']);

    if (idxAsin === -1) {
        Logger.warn('Listings TSV missing ASIN column — skipping parse', { header });
        return [];
    }

    const rows: ListingRow[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        const asin = cols[idxAsin]?.trim();
        if (!asin) continue;
        const priceRaw = idxPrice !== -1 ? cols[idxPrice]?.trim() : undefined;
        const qtyRaw = idxQty !== -1 ? cols[idxQty]?.trim() : undefined;
        rows.push({
            asin,
            sku: idxSku !== -1 ? cols[idxSku]?.trim() || null : null,
            title: idxTitle !== -1 ? cols[idxTitle]?.trim() || null : null,
            price: priceRaw ? Number(priceRaw) || null : null,
            quantity: qtyRaw ? Number(qtyRaw) || null : null,
        });
    }
    return rows;
}

export async function fetchListings(params: {
    accountId: string;
    marketplaceId: string;
    reportType: string;
}): Promise<ListingRow[]> {
    const reportId = await requestReport(params);
    Logger.info(`Listings report requested: ${reportId}`, { accountId: params.accountId });

    const status = await pollReportUntilDone({ accountId: params.accountId, reportId });
    if (!status.reportDocumentId) {
        throw new Error(`Report ${reportId} completed but has no reportDocumentId`);
    }

    const tsv = await downloadReportDocument({
        accountId: params.accountId,
        reportDocumentId: status.reportDocumentId,
    });
    return parseListingsTsv(tsv);
}
