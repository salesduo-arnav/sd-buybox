/**
 * Type definitions mirroring the shapes returned by sd-core-platform.
 *
 * These are the authoritative shapes for everything the buybox backend
 * consumes from core-platform over HTTP. They live in one file so every
 * middleware, controller, and service imports from a single source of truth.
 *
 * Reference endpoints (sd-core-platform):
 *   - GET  /auth/me                                     -> CorePlatformUser
 *   - POST /auth/logout                                 -> void
 *   - GET  /internal/integrations/accounts?org_id=...   -> IntegrationAccountSummary[]
 *   - GET  /internal/integrations/accounts/:id/credentials -> IntegrationCredentials
 *   - POST /internal/audit-logs                         -> void
 *   - POST /internal/email/send                         -> void
 *   - POST /internal/slack/send-to-channel              -> void
 */

export interface Organization {
    id: string;
    name: string;
    slug?: string;
    status?: string;
}

export interface Role {
    id: number;
    name: string;
    slug?: string;
    description?: string;
}

export interface Membership {
    organization: Organization;
    role: Role;
}

export interface CorePlatformUser {
    id: string;
    email: string;
    full_name: string;
    is_superuser?: boolean;
    has_password?: boolean;
    memberships: Membership[];
}

export interface IntegrationAccountSummary {
    id: string;
    organization_id: string;
    account_name: string;
    marketplace?: string;
    region?: string;
    integration_type: string;
    status: string;
    connected_at?: string;
}

export interface IntegrationCredentials {
    refresh_token: string;
    client_id: string;
    client_secret: string;
    marketplace_id: string;
    seller_id: string;
    region: string;
}

export interface AuditLogEntry {
    actor_id: string;
    organization_id: string;
    action: string;
    entity_type?: string;
    entity_id?: string;
    details?: Record<string, unknown>;
}

export interface SessionValidationContext {
    userAgent?: string;
    ip?: string;
}

/**
 * Normalized error class for all core-platform client failures.
 * Callers can distinguish upstream 4xx/5xx from network errors via `status`.
 */
export class CorePlatformError extends Error {
    readonly status: number | null;
    readonly code: string;
    readonly cause?: unknown;

    constructor(message: string, opts: { status: number | null; code: string; cause?: unknown }) {
        super(message);
        this.name = 'CorePlatformError';
        this.status = opts.status;
        this.code = opts.code;
        this.cause = opts.cause;
    }

    get isUpstreamUnavailable(): boolean {
        return this.status === null || this.status >= 500;
    }

    get isUnauthorized(): boolean {
        return this.status === 401;
    }
}
