import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { env } from '../../config/env';
import { SP_API_ENDPOINTS } from '../../config/constants';
import Logger from '../../utils/logger';
import { sleep } from '../../utils/sleep';
import { corePlatform } from '../corePlatform.client';
import type { IntegrationCredentials } from '../../types/corePlatform';

// Short-lived local cache of creds from core-platform, purely to spare
// core-platform during hot scans. Core-platform remains the source of
// truth for token freshness; on 401 we invalidate and re-fetch.

interface CachedCreds {
    accessToken: string;
    sellerId: string | null;
    marketplaceId: string | null;
    region: string;
    expiresAt: number;
}

const credsCache = new Map<string, CachedCreds>();

async function getCachedCreds(accountId: string): Promise<CachedCreds> {
    const cached = credsCache.get(accountId);
    if (cached && cached.expiresAt > Date.now()) return cached;

    const fresh = await corePlatform.integrations.getCredentials(accountId);
    const accessToken = fresh.credentials?.access_token;
    if (!accessToken) {
        throw new Error(`Integration account ${accountId} returned no access_token — reconnect may be required`);
    }

    const entry: CachedCreds = {
        accessToken,
        sellerId: fresh.seller_id,
        marketplaceId: fresh.marketplace_id,
        region: (fresh.region || '').toUpperCase(),
        expiresAt: Date.now() + env.spApi.credsCacheTtlMs,
    };
    credsCache.set(accountId, entry);
    return entry;
}

export function invalidateToken(accountId: string): void {
    credsCache.delete(accountId);
}

// Single global FIFO throttle — Amazon's pricing quota is per-seller
// and we don't run concurrent scans for one seller.
let lastRequestAt = 0;

async function throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - lastRequestAt;
    const needsWait = env.spApi.rateLimitMs - elapsed;
    if (needsWait > 0) await sleep(needsWait);
    lastRequestAt = Date.now();
}

export interface SpApiRequestOptions {
    accountId: string;
    method: 'GET' | 'POST' | 'DELETE';
    path: string;
    query?: Record<string, string | number | undefined>;
    body?: unknown;
    skipThrottle?: boolean;
}

const axiosByRegion = new Map<string, AxiosInstance>();
function axiosFor(region: string): AxiosInstance {
    const host = SP_API_ENDPOINTS[region];
    if (!host) throw new Error(`Unknown SP-API region: ${region}`);
    let instance = axiosByRegion.get(region);
    if (!instance) {
        instance = axios.create({
            baseURL: host,
            timeout: env.spApi.requestTimeoutMs,
        });
        axiosByRegion.set(region, instance);
    }
    return instance;
}

// Exponential backoff: 1s, 2s, 4s, 8s, 16s.
const MAX_ATTEMPTS = 5;

export async function spApiRequest<T = unknown>(options: SpApiRequestOptions): Promise<T> {
    const creds = await getCachedCreds(options.accountId);
    const client = axiosFor(creds.region);

    let attempt = 0;
    while (true) {
        attempt += 1;
        if (!options.skipThrottle) await throttle();

        const currentCreds = attempt === 1 ? creds : await getCachedCreds(options.accountId);

        const config: AxiosRequestConfig = {
            method: options.method,
            url: options.path,
            params: options.query,
            data: options.body,
            headers: {
                'x-amz-access-token': currentCreds.accessToken,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        };

        try {
            const response = await client.request<T>(config);
            return response.data;
        } catch (err) {
            const axiosErr = err as AxiosError;
            const status = axiosErr.response?.status;

            // Cached token rejected — invalidate and retry with a fresh one.
            if (status === 401 && attempt === 1) {
                invalidateToken(options.accountId);
                continue;
            }

            const isRetryable = status === 429 || (typeof status === 'number' && status >= 500);
            if (isRetryable && attempt < MAX_ATTEMPTS) {
                const backoffMs = 1000 * 2 ** (attempt - 1);
                Logger.warn(
                    `SP-API ${options.method} ${options.path} got ${status} (attempt ${attempt}/${MAX_ATTEMPTS}); retrying in ${backoffMs}ms`
                );
                await sleep(backoffMs);
                continue;
            }

            Logger.error('SP-API request failed', {
                accountId: options.accountId,
                method: options.method,
                path: options.path,
                status,
                message: axiosErr.message,
            });
            throw err;
        }
    }
}

export async function getAccountContext(accountId: string): Promise<{
    sellerId: string | null;
    marketplaceId: string | null;
    region: string;
}> {
    const creds = await getCachedCreds(accountId);
    return {
        sellerId: creds.sellerId,
        marketplaceId: creds.marketplaceId,
        region: creds.region,
    };
}

export async function loadCredentials(accountId: string): Promise<IntegrationCredentials> {
    return corePlatform.integrations.getCredentials(accountId);
}
