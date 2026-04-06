# Metrics Calculation Logic

This document defines how the core metrics for the Amazon Visibility (Buy Box) Tracker are calculated.

## Data Sources
To calculate these metrics, the microservice retrieves data via the `sd-core-platform`:
1. **Integration Credentials**: We fetch the decrypted Amazon SP-API credentials for each integration account by calling the internal `sd-core-platform` route (`GET /internal/integrations/accounts/:id/credentials` with a service key).
2. **Pricing & Buy Box Data**: Using the SP-API credentials, the worker polls the `getPricing` / `AnyOfferChanged` (SQS) Amazon SP-API endpoints. This gives us the real-time buy box price, our price, and competitive 3P/Amazon prices.
3. **Daily Sales Velocity**: Pulled from existing SP-API reports (e.g., Sales and Traffic reports) or the `sd-core-platform` baseline data to establish a velocity for the 'Missed Sales' calculation.

## 1. Product Visibility
**Definition**: The percentage of time a product successfully held the Buy Box.
**Calculation**:
- For a given time range (e.g., last 30 days):
  `Visibility %` = `(Count of Snapshots where has_buybox = true) / (Total Snapshots in the period) * 100`
- Alternately, using time-weighted calculation:
  Sum of duration where `has_buybox = true` / Total duration in the selected period.

## 2. Estimated Sales Missed
**Definition**: The estimated revenue lost during the time the product did not hold the Buy Box.
**Calculation**:
- We require a baseline **Estimated Daily Sales Velocity** for each product (e.g., 10 units/day) and its **Average Retail Price**.
- For each snapshot period where `has_buybox = false`:
  `Time Without Buy Box (Hours)` = `Current Snapshot Time - Previous Snapshot Time`
  `Missed Volume` = `(Daily Sales Velocity / 24) * Time Without Buy Box (Hours)`
  `Est. Sales Missed ($)` = `Missed Volume * Product Average Price`
- Over a period (e.g., last 30 days): Summarize `Est. Sales Missed ($)` for all `has_buybox = false` periods.

## 3. Products Affected
**Definition**: The number of unique products that have recently lost the Buy Box or experienced a visibility drop below the threshold (e.g., < 100%).
**Calculation**: 
`Count of distinct Product IDs` where `has_buybox = false` in the most recent snapshot, or where `Average Visibility < 100%` over the selected period.

## 4. Reasons for Sales Loss Classification
When `has_buybox = false`, the cron job analyzes the listing to determine the reason:
- **Cheaper 3P Seller**: Another 3rd-party seller is holding the buy box, and their `buybox_price` is lower than `our_price`.
- **Lower External Price**: The Buy Box is suppressed (no one has it) or lost to Amazon retail, and an external marketplace (e.g., Target, Walmart) has a lower price.
- **Lower Own VC/SC Price**: You possess both Vendor Central (VC) and Seller Central (SC) offers, and your own VC offer is winning the Buy Box because its price is lower, cannibalizing your SC sales.

## 5. Trend Percentage (vs previous period)
**Calculation**:
- Calculate Metric `M` for the Current Period (e.g., Last 30 days).
- Calculate Metric `M` for the Previous Period (e.g., Day -60 to Day -30).
- `Trend %` = `((M_current - M_previous) / M_previous) * 100`
- Displayed as a red downward arrow for decreases, green upward for increases.
