// Type definitions mirroring the shapes returned by sd-core-platform.
//
// Reference endpoints:
//   GET  /auth/me                                         -> CorePlatformUser
//   POST /auth/logout                                     -> void
//   GET  /internal/organizations/:id/entitlements         -> RawEntitlement[]
//   POST /internal/organizations/:id/entitlements/consume -> ConsumeEntitlementResult
//   GET  /internal/integrations/accounts?org_id=...       -> IntegrationAccountSummary[]
//   POST /internal/audit-logs                             -> void
//   POST /internal/email/send                             -> void
//   POST /internal/slack/send-to-channel                  -> void

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

export interface AuditLogEntry {
    actor_id: string;
    organization_id: string;
    action: string;
    entity_type?: string;
    entity_id?: string;
    details?: Record<string, unknown>;
}

// One row from GET /internal/organizations/:id/entitlements.
// `limit_amount = null` means unlimited, `0` means disabled.
export interface RawEntitlement {
    id: string;
    organization_id: string;
    tool_id: string;
    feature_id: string;
    limit_amount: number | null;
    usage_amount: number;
    reset_period: 'monthly' | 'yearly' | 'never';
    feature: { id: string; name: string; slug: string };
    tool: { id: string; name: string; slug: string };
}

// Response body from POST /internal/organizations/:id/entitlements/consume.
export interface ConsumeEntitlementResult {
    allowed: boolean;
    reason?: 'limit_exceeded' | 'no_entitlement';
    usage_amount?: number;
    limit_amount?: number | null;
}

export interface SessionValidationContext {
    userAgent?: string;
    ip?: string;
}

// Normalized error class for all core-platform client failures.
// Callers distinguish upstream 4xx/5xx from network errors via `status`.
export class CorePlatformError extends Error {
    readonly status: number | null;
    readonly code: string;
    readonly cause?: unknown;

    constructor(message: string, options: { status: number | null; code: string; cause?: unknown }) {
        super(message);
        this.name = 'CorePlatformError';
        this.status = options.status;
        this.code = options.code;
        this.cause = options.cause;
    }

    get isUpstreamUnavailable(): boolean {
        return this.status === null || this.status >= 500;
    }

    get isUnauthorized(): boolean {
        return this.status === 401;
    }
}
