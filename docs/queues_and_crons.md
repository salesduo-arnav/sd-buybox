# Queues and Cron System

The background processing system uses `pg-boss` (PostgreSQL-backed job queue), following the exact same pattern as `sd-cohesity`. All job definitions, retry strategies, and scheduling are managed through pg-boss's built-in features.

## pg-boss Configuration

```typescript
const boss = new PgBoss({
  connectionString,
  retryLimit: 3,
  retryDelay: 30,
  retryBackoff: true,
  expireInMinutes: 60,
  archiveCompletedAfterSeconds: 86400,  // 24h
  deleteAfterDays: 7,
});
```

---

## Job Definitions

### 1. `buybox:schedule-tick` (Recurring — every minute)

The heartbeat of the system. Registered via `boss.schedule()` to run every minute.

**Logic:**
```
1. Query tracker_configs WHERE schedule_enabled = true
     AND next_scheduled_run_at <= NOW()
2. For each due config:
   a. Check if account already has an active scan (status in [queued, in_progress])
      → If yes, skip (prevents overlap)
   b. Enqueue buybox:account-scan { integration_account_id, organization_id }
   c. Calculate next_scheduled_run_at based on update_frequency:
      - "real_time" → now + real_time_interval_minutes (from SystemConfig, default 15 min)
      - "hourly"    → now + 1 hour
      - "daily"     → tomorrow at schedule_time (HH:MM UTC)
   d. Update tracker_config with last_scheduled_run_at and next_scheduled_run_at
```

**Error handling:** If a scan fails to enqueue, log the error but don't update the timestamps (it will retry next tick).

---

### 2. `buybox:account-scan`

The orchestrator job. Takes an account and fans out individual product checks.

**Payload:**
```json
{
  "integration_account_id": "uuid",
  "organization_id": "uuid",
  "triggered_by": "scheduled | manual"
}
```

**Logic:**
```
1. Create a `scan` record (status: in_progress)
2. Fetch SP-API credentials from core-platform:
     GET /internal/integrations/accounts/{id}/credentials
3. Fetch products WHERE integration_account_id = ? AND track_buybox = true
   - If tracker_config.tracking_scope = 'selected', filter by specific_asins
4. Update scan.total_products = product count
5. Batch products into groups of 20 (SP-API rate limit consideration)
6. For each batch, enqueue buybox:product-check jobs:
     { product_id, asin, scan_id, credentials_cache_key, batch_index }
7. Enqueue a buybox:scan-completion-check job with a 5-minute delay
   to periodically check if all product checks have finished
```

**Retry config:** `retryLimit: 2, retryDelay: 120` (credential fetch might fail temporarily)

---

### 3. `buybox:product-check`

The workhorse. Checks a single product's Buy Box status.

**Payload:**
```json
{
  "product_id": "uuid",
  "asin": "B08X1ABC23",
  "scan_id": "uuid",
  "marketplace": "US"
}
```

**Logic:**
```
1. Fetch credentials (from cache or core-platform)
2. Call SP-API getCompetitivePricing for the ASIN
3. Parse response to determine:
   - has_buybox: boolean
   - buybox_price, our_price, lowest_3p_price
   - winner_type, winner_seller_id
   - is_suppressed
4. If has_buybox = false:
   a. Run classification logic → loss_reason
   b. Fetch previous snapshot for this product
   c. Calculate hours_since_last_snapshot
   d. Calculate est_missed_sales using product.estimated_daily_units
5. INSERT into buybox_snapshots
6. UPDATE scan: increment scanned_products, issues_found
7. Check alert thresholds:
   a. Compare current visibility against tracker_config thresholds
   b. If new issue detected → INSERT alert + enqueue buybox:alert-dispatch
```

**Retry config:** `retryLimit: 5, retryDelay: 60, retryBackoff: true`

This is aggressive because Amazon SP-API throttling (HTTP 429) is expected. pg-boss's exponential backoff handles it naturally: 60s → 120s → 240s → 480s → 960s.

---

### 4. `buybox:alert-dispatch`

Delivers notifications for a specific alert.

**Payload:**
```json
{
  "alert_id": "uuid",
  "organization_id": "uuid"
}
```

**Logic:**
```
1. Fetch alert record (includes product info, severity, message)
2. Fetch tracker_config for the integration account
3. Apply filters:
   - If critical_alerts_only = true AND severity != 'critical' → skip
4. Fetch notification_channels for the organization WHERE is_enabled = true
   AND events array contains the alert_type
5. For each matching channel:
   - email:   POST core-platform /internal/email/send
              { to: channel.config.emails, subject, html }
   - slack:   POST core-platform /internal/slack/send-to-channel
              { organization_id, channel: channel.config.channel_id, text, blocks }
   - webhook: POST to channel.config.url with JSON payload
6. Update alert.is_notified = true
```

**Retry config:** `retryLimit: 3, retryDelay: 30`

---

### 5. `buybox:daily-aggregate` (Recurring — nightly)

Pre-computes daily rollups for dashboard performance.

**Schedule:** Driven by `daily_aggregation_cron` SystemConfig (default: `0 2 * * *` = 2 AM UTC).

**Logic:**
```
1. For yesterday's date:
2. For each product that has snapshots from yesterday:
   a. total_checks = COUNT(snapshots)
   b. buybox_wins = COUNT(snapshots WHERE has_buybox = true)
   c. visibility_pct = (buybox_wins / total_checks) × 100
   d. total_missed_sales = SUM(est_missed_sales WHERE has_buybox = false)
   e. primary_loss_reason = MODE(loss_reason) — most frequent reason
3. UPSERT into daily_visibility_aggregates
```

**Retry config:** `retryLimit: 2, retryDelay: 300`

---

### 6. `buybox:catalog-sync` (Recurring — weekly)

Refreshes product metadata and sales velocity from SP-API.

**Schedule:** Weekly, e.g., `0 3 * * 0` (3 AM UTC on Sundays).

**Logic:**
```
1. For each active integration account:
2. Fetch SP-API credentials from core-platform
3. Call listCatalogItems → update product titles, images, categories
4. Fetch Sales & Traffic Report → update estimated_daily_units + average_selling_price
5. Detect new ASINs → create product records (if tracking_scope = 'all')
```

---

## Rate Limiting & Amazon SP-API Considerations

| Concern | Strategy |
|---|---|
| SP-API throttle (HTTP 429) | pg-boss retryBackoff handles natural backoff |
| Burst limits (max 10 req/sec for pricing) | Batch jobs with `startAfter` stagger (1s delay between batches) |
| Daily quota limits | Track API call counts; pause scans if approaching limits |
| Credential refresh | SP-API refresh tokens are long-lived; LWA token refresh is handled by the SP-API client |

## Concurrency Controls

- **One active scan per account:** The `schedule:tick` job checks for existing active scans before enqueuing. The `scans` table + status column enforces this.
- **Job deduplication:** pg-boss's `singletonKey` can be used with `product_id` to prevent duplicate product checks.
- **Graceful shutdown:** `boss.stop({ graceful: true, timeout: 10000 })` — waits for in-flight jobs to complete.

## Dead Letter Queue

Failed jobs (after all retries exhausted) are automatically archived by pg-boss. A periodic health check (admin dashboard or monitoring alert) should scan for:
```sql
SELECT name, COUNT(*) FROM pgboss.archive
WHERE state = 'failed' AND created_on > NOW() - INTERVAL '24 hours'
GROUP BY name
```
