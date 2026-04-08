import axios, { AxiosError, AxiosInstance } from 'axios';
import Logger from '../utils/logger';
import {
    AuditLogEntry,
    CorePlatformError,
    CorePlatformUser,
    IntegrationAccountSummary,
    IntegrationCredentials,
    SessionValidationContext,
} from '../types/corePlatform';

/**
 * Core-platform HTTP client.
 *
 * The ONLY place in the buybox backend that talks to sd-core-platform.
 * Everything else (middlewares, controllers) goes through the narrow, typed
 * methods exposed by `corePlatform`. No other file should import `axios`
 * for core-platform URLs.
 *
 * Design notes:
 *  - One axios instance, one baseURL, one place to configure timeouts.
 *  - Service auth (`X-Service-Key`) is injected by an interceptor for any
 *    request path that starts with `/internal/`. Call sites never see it.
 *  - Errors are normalized into `CorePlatformError` so callers can make
 *    clean decisions (401 -> session expired, network/5xx -> upstream down).
 */

// Timeout defaults (ms). Each is overridable via env so ops can tune
// without a code change. They're read lazily inside `buildAxios` /
// per-call sites so tests that mutate process.env work correctly.
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_AUTH_TIMEOUT_MS = 5_000;
const DEFAULT_AUDIT_TIMEOUT_MS = 10_000;

function env(name: string, fallback?: string): string {
    return process.env[name] ?? fallback ?? '';
}

/**
 * Read a positive integer from `process.env[name]`. Falls back to `fallback`
 * if unset, empty, or not a positive number — so a typo in .env can never
 * silently set a 0ms timeout (which axios interprets as "no timeout").
 */
function envIntMs(name: string, fallback: number): number {
    const raw = process.env[name];
    if (!raw) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

function authTimeoutMs(): number {
    return envIntMs('CORE_PLATFORM_AUTH_TIMEOUT_MS', DEFAULT_AUTH_TIMEOUT_MS);
}

function auditTimeoutMs(): number {
    return envIntMs('CORE_PLATFORM_AUDIT_TIMEOUT_MS', DEFAULT_AUDIT_TIMEOUT_MS);
}

/**
 * Fail loud at boot if required env vars are missing. Called from app.ts
 * so a misconfigured deploy dies immediately instead of on first request.
 */
export function assertCorePlatformEnv(): void {
    const baseUrl = env('CORE_PLATFORM_INTERNAL_URL') || env('CORE_PLATFORM_URL');
    if (!baseUrl) {
        throw new Error(
            'CORE_PLATFORM_INTERNAL_URL (or CORE_PLATFORM_URL) must be set — buybox cannot authenticate users without it.'
        );
    }
    if (!env('INTERNAL_API_KEY')) {
        throw new Error('INTERNAL_API_KEY must be set — required for service-to-service calls to sd-core-platform.');
    }
}

function buildAxios(): AxiosInstance {
    const baseURL = env('CORE_PLATFORM_INTERNAL_URL') || env('CORE_PLATFORM_URL');
    const timeout = envIntMs('CORE_PLATFORM_TIMEOUT_MS', DEFAULT_TIMEOUT_MS);

    const instance = axios.create({
        baseURL,
        timeout,
        headers: { 'Content-Type': 'application/json' },
    });

    // Inject X-Service-Key on every /internal/* call.
    instance.interceptors.request.use((config) => {
        const url = config.url || '';
        if (url.startsWith('/internal/') || url.includes('/internal/')) {
            config.headers = config.headers ?? {};
            config.headers['X-Service-Key'] = env('INTERNAL_API_KEY');
            config.headers['X-Service-Name'] = env('INTERNAL_SERVICE_NAME', 'buybox');
        }
        return config;
    });

    // Normalize errors.
    instance.interceptors.response.use(
        (response) => response,
        (error: AxiosError) => {
            const status = error.response?.status ?? null;
            const code =
                status === 401 ? 'UNAUTHORIZED' :
                status === 403 ? 'FORBIDDEN' :
                status === 404 ? 'NOT_FOUND' :
                status === null ? 'NETWORK_ERROR' :
                status >= 500 ? 'UPSTREAM_ERROR' :
                'BAD_REQUEST';
            const upstreamMessage =
                (error.response?.data as { message?: string } | undefined)?.message ||
                error.message ||
                'Core-platform request failed';
            return Promise.reject(
                new CorePlatformError(upstreamMessage, { status, code, cause: error })
            );
        }
    );

    return instance;
}

// Lazy — so unit tests (or missing env during tooling) don't crash at import time.
let _http: AxiosInstance | null = null;
function http(): AxiosInstance {
    if (!_http) _http = buildAxios();
    return _http;
}

function unwrap<T>(data: unknown): T {
    // Core-platform responses are typically raw JSON, but some endpoints
    // wrap in { data: ... }. Unwrap both shapes into a single `T`.
    if (data && typeof data === 'object' && 'data' in data) {
        return (data as { data: T }).data;
    }
    return data as T;
}

/**
 * Session operations — proxy user-cookie-bearing requests to core-platform.
 * These do NOT use the X-Service-Key; they forward the browser's session cookie.
 */
const session = {
    async validate(sessionId: string, ctx: SessionValidationContext = {}): Promise<CorePlatformUser> {
        const response = await http().get<CorePlatformUser>('/auth/me', {
            timeout: authTimeoutMs(),
            headers: {
                Cookie: `session_id=${sessionId}`,
                'User-Agent': ctx.userAgent ?? '',
                'X-Forwarded-For': ctx.ip ?? '',
            },
        });
        return unwrap<CorePlatformUser>(response.data);
    },

    async logout(sessionId: string): Promise<void> {
        await http().post(
            '/auth/logout',
            {},
            {
                timeout: authTimeoutMs(),
                headers: { Cookie: `session_id=${sessionId}` },
            }
        );
    },
};

/**
 * Integration operations — service-to-service (requires X-Service-Key).
 */
const integrations = {
    async listAccounts(orgId: string): Promise<IntegrationAccountSummary[]> {
        const response = await http().get<IntegrationAccountSummary[]>('/internal/integrations/accounts', {
            params: { org_id: orgId },
        });
        return unwrap<IntegrationAccountSummary[]>(response.data) ?? [];
    },

    async getCredentials(accountId: string): Promise<IntegrationCredentials> {
        const response = await http().get<IntegrationCredentials>(
            `/internal/integrations/accounts/${encodeURIComponent(accountId)}/credentials`
        );
        return unwrap<IntegrationCredentials>(response.data);
    },
};

/**
 * Audit log — best effort. Never throws; logs a warning on failure because
 * audit-trail fire-and-forget failures must not break user-facing requests.
 */
const audit = {
    async log(entry: AuditLogEntry): Promise<void> {
        try {
            await http().post('/internal/audit-logs', entry, { timeout: auditTimeoutMs() });
        } catch (error) {
            Logger.warn('Audit log dispatch failed (non-critical)', {
                action: entry.action,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    },
};

/**
 * Email / Slack notifications — service-to-service.
 */
const email = {
    async send(to: string[], subject: string, html: string): Promise<void> {
        await http().post('/internal/email/send', { to, subject, html });
        Logger.debug(`Email dispatched to ${to.length} recipient(s)`);
    },
};

const slack = {
    async sendToChannel(
        organizationId: string,
        channel: string,
        text: string,
        blocks?: unknown[]
    ): Promise<void> {
        await http().post('/internal/slack/send-to-channel', {
            organization_id: organizationId,
            channel,
            text,
            blocks,
        });
        Logger.debug(`Slack message dispatched to channel ${channel}`);
    },
};

export const corePlatform = {
    session,
    integrations,
    audit,
    email,
    slack,
};

export type CorePlatformClient = typeof corePlatform;

// Test helper — allow resetting the cached axios instance between tests.
export function __resetCorePlatformClient(): void {
    _http = null;
}

// Re-export the normalized error so callers don't need a second import.
export { CorePlatformError };
