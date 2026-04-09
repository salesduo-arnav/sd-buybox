// Types mirroring the backend `GET /api/entitlements/me` response.

export type Frequency = 'daily' | 'hourly' | 'real_time';

export type FeatureKey =
  | 'slack_alerts'
  | 'custom_thresholds'
  | 'custom_recipients'
  | 'selected_tracking'
  | 'advanced_analytics';

export type LimitKey = 'tracked_asins' | 'connected_accounts';

export interface LimitView {
  used: number;
  limit: number | null;
  atCap: boolean;
}

export interface EntitlementSnapshot {
  organization_id: string;
  has_any_entitlement: boolean;
  features: Record<FeatureKey, boolean>;
  tiers: {
    max_frequency: Frequency;
    retention_days: number;
  };
  limits: Record<LimitKey, LimitView>;
}
