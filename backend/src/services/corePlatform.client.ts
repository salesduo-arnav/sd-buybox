import axios, { AxiosError, AxiosInstance } from 'axios';
import Logger from '../utils/logger';
import { env } from '../config/env';
import {
    AuditLogEntry,
    CorePlatformError,
    CorePlatformUser,
    IntegrationAccountSummary,
    SessionValidationContext,
} from '../types/corePlatform';

// Core-platform HTTP client.
//
// The ONLY place in the buybox backend that talks to sd-core-platform.
// Middlewares, controllers, and services all go through the narrow, typed
// methods exposed by `corePlatform`. No other file should import `axios`
// for core-platform URLs.
//
// Design notes:
//  - One axios instance, one baseURL, one place to configure timeouts.
//  - Service auth (`X-Service-Key`) is injected by an interceptor for any
//    request path whose URL starts with `/internal/`. Call sites never see it.
//  - Errors are normalized into `CorePlatformError` so callers can make
//    clean decisions (401 -> session expired, network/5xx -> upstream down).

const INTERNAL_PATH_PREFIX = '/internal/';

function buildAxiosInstance(): AxiosInstance {
    const instance = axios.create({
        baseURL: env.corePlatform.baseUrl,
        timeout: env.corePlatform.timeoutMs,
        headers: { 'Content-Type': 'application/json' },
    });

    // Inject service credentials on every /internal/* call. We check only
    // startsWith — `includes` would leak X-Service-Key if an attacker ever
    // convinced us to call a URL like `/public?next=/internal/x`.
    instance.interceptors.request.use((config) => {
        const requestPath = config.url ?? '';
        if (requestPath.startsWith(INTERNAL_PATH_PREFIX)) {
            config.headers = config.headers ?? {};
            config.headers['X-Service-Key'] = env.corePlatform.internalApiKey;
            config.headers['X-Service-Name'] = env.corePlatform.serviceName;
        }
        return config;
    });

    // Normalize errors into a single CorePlatformError shape.
    instance.interceptors.response.use(
        (response) => response,
        (error: AxiosError) => {
            const httpStatus = error.response?.status ?? null;
            const normalizedCode =
                httpStatus === 401 ? 'UNAUTHORIZED' :
                httpStatus === 403 ? 'FORBIDDEN' :
                httpStatus === 404 ? 'NOT_FOUND' :
                httpStatus === null ? 'NETWORK_ERROR' :
                httpStatus >= 500 ? 'UPSTREAM_ERROR' :
                'BAD_REQUEST';
            const upstreamMessage =
                (error.response?.data as { message?: string } | undefined)?.message ||
                error.message ||
                'Core-platform request failed';
            return Promise.reject(
                new CorePlatformError(upstreamMessage, { status: httpStatus, code: normalizedCode, cause: error })
            );
        }
    );

    return instance;
}

// Lazy singleton so unit tests (or missing env during tooling) don't crash
// at import time. Reset via __resetCorePlatformClient() if needed.
let httpInstance: AxiosInstance | null = null;
function http(): AxiosInstance {
    if (!httpInstance) httpInstance = buildAxiosInstance();
    return httpInstance;
}

// Some core-platform endpoints return `{ data: T }`, some return `T` directly.
// Peel the outer envelope so callers always see `T`.
function unwrap<T>(payload: unknown): T {
    if (payload && typeof payload === 'object' && 'data' in payload) {
        return (payload as { data: T }).data;
    }
    return payload as T;
}

// Session operations forward the browser's session cookie and do NOT use
// the service key — they run as the user.
const session = {
    async validate(sessionId: string, context: SessionValidationContext = {}): Promise<CorePlatformUser> {
        const cookieHeader = `${env.session.cookieName}=${sessionId}`;
        const forwardedHeaders: Record<string, string> = { Cookie: cookieHeader };
        if (context.userAgent) forwardedHeaders['User-Agent'] = context.userAgent;
        if (context.ip) forwardedHeaders['X-Forwarded-For'] = context.ip;

        const response = await http().get<CorePlatformUser>('/auth/me', {
            timeout: env.corePlatform.authTimeoutMs,
            headers: forwardedHeaders,
        });
        return unwrap<CorePlatformUser>(response.data);
    },

    async logout(sessionId: string): Promise<void> {
        await http().post(
            '/auth/logout',
            {},
            {
                timeout: env.corePlatform.authTimeoutMs,
                headers: { Cookie: `${env.session.cookieName}=${sessionId}` },
            }
        );
    },
};

// Integration operations — service-to-service (require X-Service-Key).
const integrations = {
    async listAccounts(organizationId: string): Promise<IntegrationAccountSummary[]> {
        const response = await http().get<IntegrationAccountSummary[]>('/internal/integrations/accounts', {
            timeout: env.corePlatform.authTimeoutMs,
            params: { org_id: organizationId },
        });
        return unwrap<IntegrationAccountSummary[]>(response.data) ?? [];
    },

    // Returns true if the given integration account belongs to the given org.
    // Source of truth is sd-core-platform — buybox does not own account records.
    async accountBelongsToOrg(accountId: string, organizationId: string): Promise<boolean> {
        const accounts = await integrations.listAccounts(organizationId);
        return accounts.some((account) => account.id === accountId);
    },
};

// Audit log — best effort. Never throws; logs a warning on failure so that
// an audit-trail blip can't break user-facing requests.
const audit = {
    async log(entry: AuditLogEntry): Promise<void> {
        try {
            await http().post('/internal/audit-logs', entry, { timeout: env.corePlatform.auditTimeoutMs });
        } catch (error) {
            Logger.warn('Audit log dispatch failed (non-critical)', {
                action: entry.action,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    },
};

// Email / Slack notifications — service-to-service.
const email = {
    async send(recipients: string[], subject: string, html: string): Promise<void> {
        await http().post('/internal/email/send', { to: recipients, subject, html });
        Logger.debug(`Email dispatched to ${recipients.length} recipient(s)`);
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
    httpInstance = null;
}

// Re-export the normalized error so callers don't need a second import.
export { CorePlatformError };
