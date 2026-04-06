# Queues and Cron System

Following the established architecture built on `pg-boss` logic used in the `sd-cohesity` backend, the Buy Box tracking system relies on asynchronous job scheduling to effectively monitor the Amazon catalog without burdening the core API.

## System Components

### 1. The Clock (Tick Scheduler)
A recurring `schedule:tick` pg-boss job operates every minute. It queries the `TrackerSettings` to identify accounts whose update frequency threshold has been reached (e.g., hourly, daily).
- If an account is due for an update, the Tick Scheduler pushes an `ACCOUNT_SCAN_TRIGGER` job to the queue.

### 2. Job Queue (`pg-boss` managed via PostgreSQL)

We define three main queue jobs:

#### A. `ACCOUNT_SCAN_TRIGGER`
- **Payload**: `integration_account_id`, `organization_id`
- **Function**: Retrieves all active products (`track_status = true`) for the given account. For each product or batch of products, it queues `PRODUCT_VISIBILITY_CHECK` jobs.

#### B. `PRODUCT_VISIBILITY_CHECK`
- **Payload**: `product_id`, `asin`, `marketplace_region`
- **Function**: The workhorse of the application.
    1. Fetches Amazon listing data (via API or scraping service).
    2. Identifies current Buy Box status, Buy Box price, external prices, and competing offers.
    3. Triggers calculation logic to determine `loss_reason` if Buy Box is missing.
    4. Records the result to the `BuyBoxSnapshot` table.
    5. Analyzes if a new `Alert` should be generated (e.g. visibility drops below 50% or new 3P seller appears).

#### C. `ALERT_DISPATCHER`
- **Payload**: `alert_id`
- **Function**: Reads an alert, checks the user's `TrackerSettings` (e.g., are emails enabled? are critical only enabled?), and sends out an email notification or push notification if it aligns with the preferences.

## Retry and Backoff Strategies
- **API Limits / Throttling**: Since the `PRODUCT_VISIBILITY_CHECK` communicates with Amazon endpoints, rate limits are expected. `pg-boss` supports automatic retry with backoff.
  - `retryLimit`: 5
  - `retryDelay`: 60 (seconds)
  - `retryBackoff`: true
- **Failed Jobs**: If maximum retries fail, the job is moved to the dead-letter queue, and an internal error is logged. The next tick/run will try tracking it again based on schedule frequency.

## Managing Frequencies
The `TrackerSettings` allows combinations like 'Real-time', 'Hourly', and 'Daily':
- **Real-time**: Leverages Amazon SQS/EventBridge event subscriptions if achievable, otherwise checks in 15-minute intervals.
- **Hourly**: Calculates `NextRun = LastRun + 1 Hour`.
- **Daily**: Calculates `NextRun = LastRun + 24 Hours`.
