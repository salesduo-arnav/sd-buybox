# Database Schema

The database relies on PostgreSQL, and the schema is designed using standard relational mapping with Sequelize ORM (TypeScript), following the same conventions as `sd-cohesity` (paranoid deletes, underscored naming, timestamp columns).

You can copy and paste the DBML code below into [dbdiagram.io](https://dbdiagram.io/) to visualize the schema.

> **Note:** `Organization` and `IntegrationAccount` are NOT stored locally. They live in `sd-core-platform`. We reference their UUIDs as foreign keys but fetch the actual data via internal API calls. This is the same pattern that `sd-cohesity` follows.

```dbml
Project AmazonVisibilityTracker {
  database_type: 'PostgreSQL'
  Note: 'Micro tool for tracking Buy Box status and sales impact'
}

// ═══════════════════════════════════════════════
// PRODUCT CATALOG
// ═══════════════════════════════════════════════

Table products {
  id uuid [pk, default: `gen_random_uuid()`]
  integration_account_id uuid [not null, note: 'FK to core-platform integration_accounts']
  organization_id uuid [not null, note: 'FK to core-platform organizations']
  asin varchar(20) [not null]
  sku varchar(100)
  parent_asin varchar(20)
  title varchar(500)
  image_url text
  brand varchar(200)
  category varchar(200)
  is_top_product boolean [default: false, note: 'Flagged via sales rank or manual tag']
  track_buybox boolean [default: true, note: 'Can be toggled per-product']
  estimated_daily_units decimal(10,2) [note: 'Average daily unit sales — used for Missed Sales calc']
  average_selling_price decimal(10,2) [note: 'Used with daily_units for revenue estimation']
  last_synced_at timestamptz [note: 'Last time catalog data was refreshed from SP-API']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  deleted_at timestamptz

  indexes {
    (integration_account_id, asin) [unique, name: 'idx_products_account_asin']
    organization_id [name: 'idx_products_org']
  }
}

// ═══════════════════════════════════════════════
// BUY BOX SNAPSHOTS (TIME-SERIES)
// ═══════════════════════════════════════════════

Table buybox_snapshots {
  id uuid [pk, default: `gen_random_uuid()`]
  product_id uuid [ref: > products.id, not null]
  organization_id uuid [not null]
  integration_account_id uuid [not null]
  scan_id uuid [ref: > scans.id, note: 'Which scan produced this snapshot']

  // Status
  has_buybox boolean [not null]
  is_suppressed boolean [default: false, note: 'True when Amazon suppresses the Buy Box entirely']

  // Pricing captured at snapshot time
  our_price decimal(10,2) [note: 'Our offer price at time of check']
  buybox_price decimal(10,2) [note: 'Current Buy Box price (null if suppressed)']
  lowest_3p_price decimal(10,2) [note: 'Cheapest competing 3P offer']
  external_price decimal(10,2) [note: 'Lowest external marketplace price found']
  num_competing_offers int [default: 0]

  // Classification
  winner_type varchar(30) [note: 'Enum: own, 3p_seller, amazon_retail, amazon_vc, suppressed, unknown']
  loss_reason varchar(30) [note: 'Enum: cheaper_3p, lower_external, lower_own_vc, price_suppressed, out_of_stock, null']
  winner_seller_id varchar(100) [note: 'Amazon seller ID of Buy Box winner, if not us']

  // Revenue impact
  est_missed_sales decimal(10,2) [default: 0, note: 'Missed sales for duration since previous snapshot']
  hours_since_last_snapshot decimal(6,2)

  snapshot_at timestamptz [not null, default: `now()`]

  indexes {
    (product_id, snapshot_at) [name: 'idx_snapshots_product_time']
    (organization_id, snapshot_at) [name: 'idx_snapshots_org_time']
    snapshot_at [name: 'idx_snapshots_time']
  }
}

// ═══════════════════════════════════════════════
// SCANS (Batch tracking run metadata)
// ═══════════════════════════════════════════════

Table scans {
  id uuid [pk, default: `gen_random_uuid()`]
  integration_account_id uuid [not null]
  organization_id uuid [not null]
  triggered_by varchar(20) [not null, note: 'Enum: scheduled, manual, event']
  status varchar(20) [not null, default: 'queued', note: 'Enum: queued, in_progress, completed, failed, cancelled']
  marketplace varchar(20) [not null, default: 'US']
  account_type varchar(5) [note: 'Enum: sc, vc']

  total_products int [default: 0]
  scanned_products int [default: 0]
  issues_found int [default: 0]
  progress_percent decimal(5,2) [default: 0]

  started_at timestamptz
  completed_at timestamptz
  error_message text
  job_id varchar(100) [note: 'pg-boss job id reference']

  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  deleted_at timestamptz

  indexes {
    (integration_account_id, status) [name: 'idx_scans_account_status']
  }
}

// ═══════════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════════

Table alerts {
  id uuid [pk, default: `gen_random_uuid()`]
  product_id uuid [ref: > products.id, not null]
  organization_id uuid [not null]
  integration_account_id uuid [not null]
  scan_id uuid [ref: > scans.id]
  alert_type varchar(50) [not null, note: 'Enum: buybox_lost, visibility_drop, new_competitor, price_undercut, buybox_suppressed, buybox_recovered']
  severity varchar(20) [not null, note: 'Enum: info, warning, critical']
  title varchar(300)
  message text
  metadata jsonb [note: 'Flexible data: competitor price, threshold crossed, etc.']
  is_read boolean [default: false]
  is_notified boolean [default: false, note: 'Whether email/slack has been sent']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  deleted_at timestamptz

  indexes {
    (organization_id, is_read, created_at) [name: 'idx_alerts_org_unread']
    (product_id, created_at) [name: 'idx_alerts_product']
  }
}

// ═══════════════════════════════════════════════
// TRACKER SETTINGS (per integration account)
// ═══════════════════════════════════════════════

Table tracker_configs {
  id uuid [pk, default: `gen_random_uuid()`]
  integration_account_id uuid [not null, unique]
  organization_id uuid [not null]

  // Tracking scope
  tracking_scope varchar(20) [default: 'all', note: 'Enum: all, selected']
  specific_asins jsonb [note: 'Array of ASINs when scope=selected']

  // Schedule
  schedule_enabled boolean [default: true]
  update_frequency varchar(20) [default: 'hourly', note: 'Enum: real_time, hourly, daily']
  schedule_time varchar(5) [note: 'HH:MM UTC — for daily frequency']
  last_scheduled_run_at timestamptz
  next_scheduled_run_at timestamptz

  // Notification preferences
  email_alerts_enabled boolean [default: true]
  slack_alerts_enabled boolean [default: false]
  critical_alerts_only boolean [default: false]
  notification_emails jsonb [note: 'Override emails; defaults to org member emails']
  slack_channel_id varchar(50) [note: 'Override channel; defaults to org default']

  // Alert thresholds
  visibility_warning_threshold int [default: 50, note: 'Alert when visibility % drops below this']
  visibility_critical_threshold int [default: 25, note: 'Critical alert threshold']

  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  deleted_at timestamptz
}

// ═══════════════════════════════════════════════
// NOTIFICATION CHANNELS (mirrors sd-cohesity pattern)
// ═══════════════════════════════════════════════

Table notification_channels {
  id uuid [pk, default: `gen_random_uuid()`]
  organization_id uuid [not null]
  channel_type varchar(20) [not null, note: 'Enum: email, slack, webhook']
  channel_name varchar(100) [not null]
  config jsonb [not null, note: 'e.g., {emails: [...]} or {url: "..."}']
  is_enabled boolean [default: true]
  events jsonb [not null, default: '["buybox_lost","visibility_drop"]', note: 'Which events trigger this channel']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  deleted_at timestamptz

  indexes {
    (organization_id, is_enabled) [name: 'idx_notif_channels_org']
  }
}

// ═══════════════════════════════════════════════
// DAILY AGGREGATES (pre-computed for dashboard performance)
// ═══════════════════════════════════════════════

Table daily_visibility_aggregates {
  id uuid [pk, default: `gen_random_uuid()`]
  product_id uuid [ref: > products.id, not null]
  organization_id uuid [not null]
  date date [not null]
  total_checks int [default: 0]
  buybox_wins int [default: 0]
  visibility_pct decimal(5,2)
  total_missed_sales decimal(10,2) [default: 0]
  primary_loss_reason varchar(30)
  created_at timestamptz [not null, default: `now()`]

  indexes {
    (product_id, date) [unique, name: 'idx_daily_agg_product_date']
    (organization_id, date) [name: 'idx_daily_agg_org_date']
  }
}

// ═══════════════════════════════════════════════
// SYSTEM CONFIGS (admin-managed global settings)
// ═══════════════════════════════════════════════

Table system_configs {
  id uuid [pk, default: `gen_random_uuid()`]
  config_key varchar(100) [unique, not null, note: 'e.g. default_cron_interval, supported_marketplaces, max_products_per_scan']
  config_value jsonb [not null]
  description text
  is_editable boolean [default: true, note: 'Some configs may be read-only system constants']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
}

// ═══════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════

Table audit_logs {
  id uuid [pk, default: `gen_random_uuid()`]
  actor_id uuid [note: 'User or system that performed the action']
  organization_id uuid
  action varchar(100) [not null, note: 'e.g. scan.triggered, alert.dismissed, config.updated']
  entity_type varchar(50)
  entity_id uuid
  details jsonb
  ip_address varchar(45)
  created_at timestamptz [not null, default: `now()`]
}
```

## Schema Design Decisions

### Why no local Organization / IntegrationAccount tables?
Following the `sd-cohesity` pattern, we store only the UUIDs that reference the core-platform. Actual organization names, integration credentials, and membership data are fetched on-demand via `GET /internal/integrations/accounts/:id/credentials` and similar endpoints. This prevents data drift between microservices.

### Why a separate `scans` table?
Each background job run is tracked as a "scan." This lets us:
- Show progress (scanned 45 of 120 products)
- Prevent duplicate concurrent scans per account
- Tie snapshots back to the specific job that created them
- Debug failures with error messages and timestamps

### Why `daily_visibility_aggregates`?
The `buybox_snapshots` table will grow very fast (products × checks per day). For dashboard queries like "visibility trend over 30 days," scanning raw snapshots is expensive. A nightly aggregation job pre-computes daily rollups per product, making the Overview dashboard fast.

### Why `notification_channels`?
Mirrors `sd-cohesity`'s `NotificationChannel` model exactly. This allows organizations to configure multiple notification destinations (different Slack channels, email lists, webhooks) and subscribe them to specific event types.

## Seed Data for SystemConfigs

The following config keys should be seeded during initial migration:

| config_key | config_value | description |
|---|---|---|
| `supported_marketplaces` | `["US","CA","UK","DE","FR","IT","ES","JP","AU","IN","MX","BR"]` | Marketplaces available for tracking |
| `default_update_frequency` | `"hourly"` | Default scan frequency for new accounts |
| `max_products_per_scan` | `500` | Max products processed in a single scan batch |
| `real_time_interval_minutes` | `15` | How often "real-time" actually polls |
| `snapshot_retention_days` | `90` | Snapshots older than this are archived |
| `daily_aggregation_cron` | `"0 2 * * *"` | When the daily aggregation job runs (2 AM UTC) |
| `visibility_warning_default` | `50` | Default warning threshold % |
| `visibility_critical_default` | `25` | Default critical threshold % |
| `missed_sales_min_velocity` | `0.5` | Minimum daily units to calculate missed sales (avoids noise) |
