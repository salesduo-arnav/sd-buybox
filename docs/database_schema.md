# Database Schema

PostgreSQL with Sequelize ORM (TypeScript). Follows `sd-cohesity` conventions: `paranoid: true`, `underscored: true`, `timestamptz` columns.

Copy-paste the DBML below into [dbdiagram.io](https://dbdiagram.io/).

> **Note:** `Organization` and `IntegrationAccount` live in `sd-core-platform`. We store only their UUIDs. Credentials, org details, and membership are fetched on-demand via internal API. Audit logs are also delegated to core-platform (`POST /internal/audit-logs`).
>
> **Plans, features, subscriptions, and entitlements are NOT stored in buybox.** A superuser configures them via the core-platform admin UI; buybox reads them at runtime through `GET /internal/organizations/{id}/entitlements` and `POST /internal/organizations/{id}/entitlements/consume`. See [`docs/entitlements.md`](./entitlements.md) for the feature contract and setup guide.

```dbml
Project AmazonVisibilityTracker {
  database_type: 'PostgreSQL'
  Note: 'Buy Box tracking micro-tool'
}

// ═══════════════════════════════════════════════
// PRODUCTS — what we're tracking
// ═══════════════════════════════════════════════

Table products {
  id uuid [pk, default: `gen_random_uuid()`]
  integration_account_id uuid [not null, note: 'FK to core-platform']
  organization_id uuid [not null, note: 'FK to core-platform — denormalized for query speed']
  asin varchar(20) [not null]
  sku varchar(100)
  title varchar(500)
  image_url text
  is_top_product boolean [default: false]
  track_buybox boolean [default: true]
  estimated_daily_units decimal(10,2) [note: 'From SP-API Sales Report — refreshed by catalog-sync job']
  average_selling_price decimal(10,2) [note: 'From SP-API Sales Report']
  last_synced_at timestamptz
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  deleted_at timestamptz

  indexes {
    (integration_account_id, asin) [unique, name: 'idx_products_account_asin']
    organization_id [name: 'idx_products_org']
  }
}

// ═══════════════════════════════════════════════
// BUYBOX SNAPSHOTS — time-series core data
// One row per product per check
// ═══════════════════════════════════════════════

Table buybox_snapshots {
  id uuid [pk, default: `gen_random_uuid()`]
  product_id uuid [ref: > products.id, not null]
  scan_id uuid [ref: > scans.id, not null]
  organization_id uuid [not null, note: 'Denormalized — avoids join on heaviest table']
  integration_account_id uuid [not null, note: 'Denormalized']

  has_buybox boolean [not null]
  is_suppressed boolean [default: false, note: 'Buy Box suppressed entirely by Amazon']

  our_price decimal(10,2)
  buybox_price decimal(10,2) [note: 'Null if suppressed']
  lowest_3p_price decimal(10,2)

  winner_type varchar(20) [note: 'own | 3p_seller | amazon_vc | suppressed']
  loss_reason varchar(20) [note: 'cheaper_3p | lower_external | lower_own_vc | price_suppressed | out_of_stock | null']

  est_missed_sales decimal(10,2) [default: 0, note: 'Pre-computed at write time using product velocity at that moment']

  snapshot_at timestamptz [not null, default: `now()`]

  indexes {
    (product_id, snapshot_at) [name: 'idx_snapshots_product_time']
    (organization_id, snapshot_at) [name: 'idx_snapshots_org_time']
  }
}

// ═══════════════════════════════════════════════
// SCANS — one row per batch run
// ═══════════════════════════════════════════════

Table scans {
  id uuid [pk, default: `gen_random_uuid()`]
  integration_account_id uuid [not null]
  organization_id uuid [not null]
  triggered_by varchar(20) [not null, note: 'scheduled | manual']
  status varchar(20) [not null, default: 'queued', note: 'queued | in_progress | completed | failed']
  marketplace varchar(10) [not null, default: 'US']

  total_products int [default: 0]
  scanned_products int [default: 0]
  issues_found int [default: 0]

  started_at timestamptz
  completed_at timestamptz
  error_message text
  job_id varchar(100) [note: 'pg-boss job ID for tracing']

  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  deleted_at timestamptz

  indexes {
    (integration_account_id, status) [name: 'idx_scans_account_status']
  }
}

// ═══════════════════════════════════════════════
// ALERTS — user-facing notifications
// ═══════════════════════════════════════════════

Table alerts {
  id uuid [pk, default: `gen_random_uuid()`]
  product_id uuid [ref: > products.id, not null]
  organization_id uuid [not null]
  integration_account_id uuid [not null]
  alert_type varchar(30) [not null, note: 'buybox_lost | visibility_drop | new_competitor | buybox_recovered']
  severity varchar(10) [not null, note: 'info | warning | critical']
  title varchar(300)
  message text
  metadata jsonb [note: 'Flexible: {competitor_price, our_price, threshold_crossed, etc.}']
  is_read boolean [default: false]
  is_notified boolean [default: false, note: 'Set true after email/slack sent']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  deleted_at timestamptz

  indexes {
    (organization_id, is_read, created_at) [name: 'idx_alerts_org_unread']
    (product_id, created_at) [name: 'idx_alerts_product']
  }
}

// ═══════════════════════════════════════════════
// TRACKER CONFIGS — per-account settings
// Includes notification prefs inline (no separate channels table needed)
// ═══════════════════════════════════════════════

Table tracker_configs {
  id uuid [pk, default: `gen_random_uuid()`]
  integration_account_id uuid [not null, unique]
  organization_id uuid [not null]

  // What to track
  tracking_scope varchar(10) [default: 'all', note: 'all | selected']
  specific_asins jsonb [note: 'Used when scope = selected']

  // When to track
  schedule_enabled boolean [default: true]
  update_frequency varchar(10) [default: 'hourly', note: 'real_time | hourly | daily']
  schedule_time varchar(5) [note: 'HH:MM UTC for daily frequency']
  last_scheduled_run_at timestamptz
  next_scheduled_run_at timestamptz

  // How to notify
  email_alerts_enabled boolean [default: true]
  slack_alerts_enabled boolean [default: false]
  critical_alerts_only boolean [default: false]
  notification_emails jsonb [note: 'Custom email list; if null, defaults to org member emails']
  slack_channel_id varchar(50) [note: 'Custom Slack channel; if null, uses org default']

  // Alert thresholds
  visibility_warning_threshold int [default: 50]
  visibility_critical_threshold int [default: 25]

  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  deleted_at timestamptz
}

// ═══════════════════════════════════════════════
// SYSTEM CONFIGS — admin-managed constants
// ═══════════════════════════════════════════════

Table system_configs {
  id uuid [pk, default: `gen_random_uuid()`]
  config_key varchar(100) [unique, not null]
  config_value jsonb [not null]
  description text
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
}
```

## Table Count: 6
| Table | Purpose | Growth Pattern |
|---|---|---|
| `products` | What we monitor | Stable — grows with catalog |
| `buybox_snapshots` | Time-series check results | Fast — append-only, apply retention |
| `scans` | Batch run metadata | Moderate — one per scheduled check |
| `alerts` | User notifications | Moderate — only on state changes |
| `tracker_configs` | Per-account settings | Static — one per integration account |
| `system_configs` | Global admin knobs | Static — seed data + rare edits |

## Why This Is Minimal

### Removed: `notification_channels`
The mockup has two toggles: "Email Alerts" and "Slack Alerts", plus a  "Critical Alerts Only" flag. That's 3 booleans + an optional email list + optional Slack channel. All of this fits naturally as columns on `tracker_configs`. sd-cohesity needs a separate table because it supports arbitrary webhooks and complex per-event subscriptions — we don't.

### Removed: `daily_visibility_aggregates`
With the indexes defined on `buybox_snapshots`, PostgreSQL handles the dashboard queries directly:
```sql
-- Visibility % for a product over 30 days
SELECT COUNT(*) FILTER (WHERE has_buybox) * 100.0 / COUNT(*)
FROM buybox_snapshots
WHERE product_id = ? AND snapshot_at >= now() - interval '30 days';

-- Visibility timeline (chart)
SELECT snapshot_at::date AS date, COUNT(*) FILTER (WHERE has_buybox) * 100.0 / COUNT(*) AS pct
FROM buybox_snapshots
WHERE organization_id = ? AND snapshot_at >= now() - interval '30 days'
GROUP BY 1 ORDER BY 1;
```
At 500 products × 24 checks/day × 90 days = ~1M rows — well within PostgreSQL's comfort zone with an index on `(organization_id, snapshot_at)`. If we ever outgrow this, we add a materialized view — zero schema changes required.

### Removed: `audit_logs`
Core-platform already provides `POST /internal/audit-logs`. Storing audit logs locally duplicates data across microservices. We call core-platform's endpoint when admin configs change.

### Removed from snapshots: `hours_since_last_snapshot`, `num_competing_offers`, `winner_seller_id`, `external_price`
- `hours_since_last_snapshot`: derivable from `snapshot_at` differences at query time.
- `num_competing_offers`, `winner_seller_id`: not displayed anywhere in the mockups, not used in any metric calculation. Can be added later if product requirements evolve.
- `external_price`: external price checking (Walmart, Target) requires a separate data source we haven't confirmed. When/if it's added, we add this column — trivial ALTER TABLE.

### Removed from products: `brand`, `category`, `parent_asin`
None of these appear in the mockups or feed any metric. Adding unused columns creates maintenance burden.

### Why `est_missed_sales` IS stored (not derived)
This is pre-computed at snapshot-write time using the product's `estimated_daily_units` and `average_selling_price` at that moment. If we tried to derive it later, we'd need historical sales velocity per product — which we don't store. Snapshotting the calculated value is the correct approach.

### Why `organization_id` is denormalized on snapshots
Without it, the Overview dashboard query would be: `snapshots JOIN products ON ... WHERE products.organization_id = ?`. On a 1M+ row table, this join is measurably slower than a direct `WHERE organization_id = ?` with an index. sd-cohesity uses this exact denormalization on its `scan_issues` table.

## Seed Data for system_configs

| config_key | config_value | description |
|---|---|---|
| `supported_marketplaces` | `["US","CA","UK","DE","FR","IT","ES","JP","AU","IN","MX","BR"]` | Available marketplaces |
| `default_update_frequency` | `"hourly"` | Default for new accounts |
| `max_products_per_scan` | `500` | Batch size limit |
| `real_time_interval_minutes` | `15` | Polling interval for "real-time" mode |
| `snapshot_retention_days` | `90` | Auto-cleanup threshold |
| `visibility_warning_default` | `50` | Default warning threshold % |
| `visibility_critical_default` | `25` | Default critical threshold % |
| `missed_sales_min_velocity` | `0.5` | Min daily units to calculate missed sales |
