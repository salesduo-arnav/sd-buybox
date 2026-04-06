// ── Job Queue Names ──────────────────────────────────────────
export const JOB_NAMES = {
    SCHEDULE_TICK: 'buybox:schedule-tick',
    ACCOUNT_SCAN: 'buybox:account-scan',
    PRODUCT_CHECK: 'buybox:product-check',
    ALERT_DISPATCH: 'buybox:alert-dispatch',
    SNAPSHOT_CLEANUP: 'buybox:snapshot-cleanup',
    CATALOG_SYNC: 'buybox:catalog-sync',
} as const;

// ── Scan Statuses ────────────────────────────────────────────
export const SCAN_STATUSES = {
    QUEUED: 'queued',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    FAILED: 'failed',
} as const;

export type ScanStatus = (typeof SCAN_STATUSES)[keyof typeof SCAN_STATUSES];

// ── Scan Triggers ────────────────────────────────────────────
export const SCAN_TRIGGERS = {
    SCHEDULED: 'scheduled',
    MANUAL: 'manual',
} as const;

export type ScanTrigger = (typeof SCAN_TRIGGERS)[keyof typeof SCAN_TRIGGERS];

// ── Update Frequencies ───────────────────────────────────────
export const UPDATE_FREQUENCIES = {
    REAL_TIME: 'real_time',
    HOURLY: 'hourly',
    DAILY: 'daily',
} as const;

export type UpdateFrequency = (typeof UPDATE_FREQUENCIES)[keyof typeof UPDATE_FREQUENCIES];

// ── Tracking Scopes ──────────────────────────────────────────
export const TRACKING_SCOPES = {
    ALL: 'all',
    SELECTED: 'selected',
} as const;

export type TrackingScope = (typeof TRACKING_SCOPES)[keyof typeof TRACKING_SCOPES];

// ── Winner Types ─────────────────────────────────────────────
export const WINNER_TYPES = {
    OWN: 'own',
    THIRD_PARTY: '3p_seller',
    AMAZON_VC: 'amazon_vc',
    SUPPRESSED: 'suppressed',
} as const;

export type WinnerType = (typeof WINNER_TYPES)[keyof typeof WINNER_TYPES];

// ── Loss Reasons ─────────────────────────────────────────────
export const LOSS_REASONS = {
    CHEAPER_3P: 'cheaper_3p',
    LOWER_EXTERNAL: 'lower_external',
    LOWER_OWN_VC: 'lower_own_vc',
    PRICE_SUPPRESSED: 'price_suppressed',
    OUT_OF_STOCK: 'out_of_stock',
} as const;

export type LossReason = (typeof LOSS_REASONS)[keyof typeof LOSS_REASONS];

// ── Alert Types ──────────────────────────────────────────────
export const ALERT_TYPES = {
    BUYBOX_LOST: 'buybox_lost',
    VISIBILITY_DROP: 'visibility_drop',
    NEW_COMPETITOR: 'new_competitor',
    BUYBOX_RECOVERED: 'buybox_recovered',
} as const;

export type AlertType = (typeof ALERT_TYPES)[keyof typeof ALERT_TYPES];

// ── Severity Levels ──────────────────────────────────────────
export const SEVERITIES = {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical',
} as const;

export type Severity = (typeof SEVERITIES)[keyof typeof SEVERITIES];
