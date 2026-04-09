// Feature slugs buybox reads. Must match the feature rows a superuser
// creates in the core-platform admin UI. See docs/entitlements.md.

export const FEATURE = {
    SLACK_ALERTS: 'buybox.feature.slack_alerts',
    CUSTOM_THRESHOLDS: 'buybox.feature.custom_thresholds',
    CUSTOM_RECIPIENTS: 'buybox.feature.custom_recipients',
    SELECTED_TRACKING: 'buybox.feature.selected_tracking',
    ADVANCED_ANALYTICS: 'buybox.feature.advanced_analytics',
} as const;

export const TIER = {
    UPDATE_FREQUENCY: 'buybox.tier.update_frequency',
    HISTORY_RETENTION_DAYS: 'buybox.tier.history_retention_days',
} as const;

export const LIMIT = {
    TRACKED_ASINS: 'buybox.limit.tracked_asins',
    CONNECTED_ACCOUNTS: 'buybox.limit.connected_accounts',
    SCANS_PER_MONTH: 'buybox.limit.scans_per_month',
    ALERTS_PER_MONTH: 'buybox.limit.alerts_dispatched_per_month',
} as const;

export type FeatureSlug = (typeof FEATURE)[keyof typeof FEATURE];
export type TierSlug = (typeof TIER)[keyof typeof TIER];
export type LimitSlug = (typeof LIMIT)[keyof typeof LIMIT];
export type FlowSlug = typeof LIMIT.SCANS_PER_MONTH | typeof LIMIT.ALERTS_PER_MONTH;

export type Frequency = 'daily' | 'hourly' | 'real_time';
export const FREQUENCY_RANK: Record<Frequency, number> = { daily: 1, hourly: 2, real_time: 3 };
