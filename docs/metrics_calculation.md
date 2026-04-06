# Metrics Calculation Logic

This document defines how every metric shown on the Amazon Visibility (Buy Box) Tracker dashboard is calculated, what data feeds each one, and the exact formulas used.

---

## Data Sources & Retrieval

### 1. Integration Credentials (from `sd-core-platform`)
The scanner worker fetches decrypted SP-API credentials for each integration account using the internal service-to-service API:

```
GET /internal/integrations/accounts/{account_id}/credentials
Headers: X-Service-Key: {INTERNAL_API_KEY}, X-Service-Name: buybox
```

This returns refresh tokens, client ID/secret, and marketplace region — everything needed to authenticate with Amazon's SP-API.

### 2. Buy Box & Pricing Data (from Amazon SP-API)
Using the credentials above, the worker calls:

| SP-API Endpoint | Purpose |
|---|---|
| `GET /products/pricing/v0/price` (`getCompetitivePricing`) | Our landed price, list price, and competitive summary |
| `GET /products/pricing/v0/competitivePrice` | Current Buy Box price and who holds it |
| `GET /notifications/v1` (`AnyOfferChanged` subscription) | Real-time SQS events when any offer on our ASIN changes (for "real-time" mode) |
| `GET /catalog/2022-04-01/items` | Product title, image, brand, category for catalog sync |

The response tells us:
- **Is our offer the Buy Box winner?** (condition + seller ID match)
- **Current Buy Box price** (the winning offer's landed price)
- **Our price** (what we're currently listing at)
- **Number of competing offers** and their price spread
- **Whether the Buy Box is suppressed** (no winner at all)

### 3. External Price Data
External price checking (Walmart, Target, etc.) can be done via:
- **Keepa API** or **CamelCamelCamel API** for historical pricing
- **Custom scraper service** if already available in the ecosystem
- Initial MVP: skip external price checking and mark as `loss_reason: unknown` when Buy Box is lost but no cheaper 3P exists. This can be phased in later.

### 4. Daily Sales Velocity (from SP-API Reports)
```
POST /reports/2021-06-30/reports  (reportType: GET_SALES_AND_TRAFFIC_REPORT)
```
This gives us `orderedUnits` and `orderedProductSales` per ASIN over a date range. We compute:
```
estimated_daily_units = sum(orderedUnits over last 30 days) / 30
average_selling_price = sum(orderedProductSales) / sum(orderedUnits)
```
These values are stored on the `products` table and refreshed periodically (e.g., weekly via a dedicated `CATALOG_SYNC` job).

---

## Metric Definitions & Formulas

### 1. Product Visibility (%)

**What the user sees:** "49%" with a progress bar on the product row.

**Definition:** The percentage of checks in the selected time range where the product held the Buy Box.

**Formula:**
```
visibility_pct = (buybox_wins / total_checks) × 100
```

Where:
- `buybox_wins` = count of `buybox_snapshots` where `has_buybox = true`
- `total_checks` = total count of `buybox_snapshots` in the period

**For the dashboard "Average Product Visibility" KPI card:**
```
avg_visibility = AVG(visibility_pct) across all tracked products
```

**Why snapshot-based, not time-weighted?**
Time-weighted calculation is more accurate but significantly more complex. With consistent polling intervals (hourly), snapshot-based counting provides a reliable approximation (each snapshot represents ~1 hour of status). If polling is inconsistent we can fall back to:
```
time_weighted_visibility = SUM(duration_with_buybox) / total_period_duration
```

---

### 2. Estimated Sales Missed ($)

**What the user sees:** "$8,865" on the Overview card, "$2,450" per product row.

**Definition:** Estimated revenue lost during periods when the product did NOT hold the Buy Box.

**Formula (per snapshot where `has_buybox = false`):**
```
hours_without_bb = (current snapshot_at - previous snapshot_at) in hours
missed_units = (estimated_daily_units / 24) × hours_without_bb
missed_revenue = missed_units × average_selling_price
```

This `missed_revenue` is stored as `est_missed_sales` on each snapshot.

**Aggregation for a period (e.g., last 30 days):**
```sql
SELECT SUM(est_missed_sales)
FROM buybox_snapshots
WHERE product_id = ? AND has_buybox = false
  AND snapshot_at BETWEEN <period_start> AND <period_end>
```

**Guard rails:**
- If `estimated_daily_units < missed_sales_min_velocity` (SystemConfig, default 0.5), skip the calculation — product sells too slowly to estimate meaningfully.
- If the gap between consecutive snapshots exceeds 48 hours, cap at 48 — larger gaps likely indicate system downtime, not genuine Buy Box loss.

---

### 3. Products Affected (count)

**What the user sees:** "6" on the Overview card.

**Formula:**
```sql
SELECT COUNT(DISTINCT product_id)
FROM buybox_snapshots
WHERE organization_id = ?
  AND has_buybox = false
  AND snapshot_at BETWEEN <start> AND <end>
```

---

### 4. Reasons for Sales Loss Classification

**What the user sees:** A donut chart with segments + badges per product row.

When a snapshot records `has_buybox = false`, the worker classifies the reason:

| `loss_reason` | Condition | Description |
|---|---|---|
| `cheaper_3p` | Buy Box is held by another 3P seller with a lower price | A competitor is undercutting on price |
| `lower_external` | Buy Box is suppressed AND external price < our price | Amazon found it cheaper elsewhere (MAP violation) |
| `lower_own_vc` | Buy Box is held by our own VC/Amazon Retail offer | Our Vendor Central and Seller Central are cannibalizing |
| `price_suppressed` | No Buy Box winner at all | Amazon has suppressed the listing entirely |
| `out_of_stock` | Our offer is out of stock | We can't win if we have no inventory |
| `unknown` | Buy Box lost but none of the above conditions match | Needs manual investigation |

**Classification logic (pseudocode):**
```typescript
function classifyLossReason(data: BuyBoxCheckResult): string {
  if (data.ourOffer.isOutOfStock) return 'out_of_stock';
  if (data.isSuppressed) return 'price_suppressed';
  if (data.buyboxWinner.sellerId === ourVcSellerId) return 'lower_own_vc';
  if (data.externalPrice && data.externalPrice < data.ourPrice) return 'lower_external';
  if (data.buyboxWinner.price < data.ourPrice) return 'cheaper_3p';
  return 'unknown';
}
```

**Donut chart aggregation:**
```sql
SELECT loss_reason, COUNT(*) as count
FROM buybox_snapshots
WHERE organization_id = ? AND has_buybox = false
  AND snapshot_at BETWEEN <start> AND <end>
GROUP BY loss_reason
```

---

### 5. Trend Percentage (vs previous period)

**What the user sees:** "↓ 12% vs previous period" in red, or "↑ 8%" in green.

**Formula:**
```
current_value  = metric calculated for the selected period (e.g., last 30 days)
previous_value = same metric for the immediately preceding period of equal length
trend_pct = ((current_value - previous_value) / previous_value) × 100
```

**Edge cases:**
- If `previous_value = 0` and `current_value > 0` → show "New" or "+∞"
- If `previous_value = 0` and `current_value = 0` → show "No change"
- Trend applies to: Sales Missed, Products Affected, Average Visibility

---

### 6. Visibility Over Time (line chart)

**What the user sees:** A line chart spanning 14 days on the Overview page.

**Data source:** Direct query on `buybox_snapshots` with the `(organization_id, snapshot_at)` index.

```sql
SELECT snapshot_at::date AS date,
       COUNT(*) FILTER (WHERE has_buybox) * 100.0 / COUNT(*) AS avg_visibility
FROM buybox_snapshots
WHERE organization_id = ?
  AND snapshot_at BETWEEN <start> AND <end>
GROUP BY 1
ORDER BY 1
```

Returns an array of `{ date, avg_visibility }` points for the chart.

---

### 7. Last Updated

**What the user sees:** "2 hours ago" on the Overview card.

```sql
SELECT MAX(completed_at) FROM scans
WHERE organization_id = ? AND status = 'completed'
```

Format as relative time (e.g., "2 hours ago", "15 minutes ago").
