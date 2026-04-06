# Buy Box Tracker — System Flow Diagrams

Paste these Mermaid diagrams into any Mermaid-compatible renderer (GitHub, Notion, Mermaid Live Editor, etc.).

---

## 1. End-to-End Scan Lifecycle (Sequence Diagram)

```mermaid
sequenceDiagram
    participant Tick as schedule:tick (pg-boss)
    participant DB as PostgreSQL
    participant AccountJob as buybox:account-scan
    participant Core as sd-core-platform
    participant ProductJob as buybox:product-check
    participant SPAPI as Amazon SP-API
    participant AlertJob as buybox:alert-dispatch

    Note over Tick: Runs every minute

    Tick->>DB: SELECT * FROM tracker_configs<br/>WHERE next_scheduled_run_at <= NOW()
    DB-->>Tick: [config_1, config_2, ...]

    loop For each due config
        Tick->>DB: Check scans WHERE status IN (queued, in_progress)<br/>AND integration_account_id = config.id
        alt No active scan
            Tick->>AccountJob: Enqueue { account_id, org_id }
            Tick->>DB: UPDATE tracker_configs SET<br/>next_scheduled_run_at = calculated_next
        else Active scan exists
            Note over Tick: Skip — prevent overlap
        end
    end

    AccountJob->>DB: INSERT INTO scans (status: in_progress)
    AccountJob->>Core: GET /internal/integrations/accounts/:id/credentials
    Core-->>AccountJob: { refresh_token, client_id, client_secret, marketplace }
    AccountJob->>DB: SELECT * FROM products<br/>WHERE track_buybox = true
    DB-->>AccountJob: [product_1, product_2, ..., product_n]

    loop Batch of 20 products
        AccountJob->>ProductJob: Enqueue { product_id, asin, scan_id }
    end

    ProductJob->>SPAPI: getCompetitivePricing(asin)
    SPAPI-->>ProductJob: { buyBoxPrice, offers[], isSupressed }

    alt Buy Box Won
        ProductJob->>DB: INSERT buybox_snapshot<br/>(has_buybox: true)
    else Buy Box Lost
        ProductJob->>ProductJob: classifyLossReason()
        ProductJob->>ProductJob: calculateMissedSales()
        ProductJob->>DB: INSERT buybox_snapshot<br/>(has_buybox: false, loss_reason, est_missed_sales)

        opt Threshold breached
            ProductJob->>DB: INSERT alert
            ProductJob->>AlertJob: Enqueue { alert_id }
        end
    end

    ProductJob->>DB: UPDATE scans SET scanned_products++

    AlertJob->>DB: SELECT alert, tracker_config, notification_channels
    AlertJob->>Core: POST /internal/email/send
    AlertJob->>Core: POST /internal/slack/send-to-channel
    AlertJob->>DB: UPDATE alert SET is_notified = true
```

---

## 2. Alert Notification Flow

```mermaid
graph TD
    subgraph "Detection (buybox:product-check)"
        A[Product Check Job] -->|Buy Box Lost| B{Threshold Check}
        B -->|visibility < warning_threshold| C[Create Alert Record]
        B -->|visibility < critical_threshold| D[Create Critical Alert]
        B -->|New competitor detected| E[Create Info Alert]
    end

    C --> F[Enqueue buybox:alert-dispatch]
    D --> F
    E --> F

    subgraph "Dispatch (buybox:alert-dispatch)"
        F --> G{Check tracker_config}
        G -->|critical_alerts_only = true<br/>AND severity != critical| H[Skip Notification]
        G -->|Passes filter| I[Fetch notification_channels]

        I --> J{Channel Type?}
        J -->|email| K["POST core-platform<br/>/internal/email/send"]
        J -->|slack| L["POST core-platform<br/>/internal/slack/send-to-channel"]
        J -->|webhook| M["POST channel.config.url"]
    end

    subgraph "Delivery"
        K --> N[Email Inbox]
        L --> O[Slack Channel]
        M --> P[External System]
    end
```

---

## 3. Dashboard Data Flow (API Request)

```mermaid
flowchart TD
    A["Frontend: GET /api/visibility/overview<br/>{period: 'last_30_days', account_id}"] --> B[Auth Middleware]
    B -->|Validate session_id cookie| CP[core-platform /auth/me]
    CP -->|User + org data| B
    B --> C[visibility.controller]

    C --> D[metrics.service.getOverview]

    D --> E[(daily_visibility_aggregates)]
    D --> F[(buybox_snapshots)]
    D --> G[(scans)]

    E -->|AVG visibility_pct per day| H[visibility_trend: point[]]
    E -->|AVG across all products| I[avg_visibility: 49%]
    F -->|SUM est_missed_sales WHERE has_buybox=false| J[total_missed_sales: $8865]
    F -->|COUNT DISTINCT product_id WHERE has_buybox=false| K[products_affected: 6]
    F -->|GROUP BY loss_reason| L[loss_reasons: pie chart data]
    G -->|MAX completed_at| M[last_updated: 2h ago]

    subgraph "Trend Calculation"
        N[current_period metrics]
        O[previous_period metrics]
        N --> P["trend_pct = ((current - previous) / previous) × 100"]
        O --> P
    end

    H --> Q[Compile JSON Response]
    I --> Q
    J --> Q
    K --> Q
    L --> Q
    M --> Q
    P --> Q

    Q --> A
```

---

## 4. Product Detail Drill-Down

```mermaid
flowchart LR
    A["Frontend: GET /api/products/:id<br/>{period: 'last_30_days'}"] --> B[product.controller]

    B --> C[product record]
    B --> D[snapshots for period]
    B --> E[alerts for product]
    B --> F[daily aggregates]

    C --> G["Product Info<br/>(title, ASIN, SKU, image)"]
    D --> H["Snapshot Timeline<br/>(buybox status changes over time)"]
    E --> I["Recent Alerts<br/>(severity, message, timestamp)"]
    F --> J["Visibility Chart<br/>(daily visibility % over period)"]

    G --> K[JSON Response]
    H --> K
    I --> K
    J --> K
```

---

## 5. Admin System Config Flow

```mermaid
sequenceDiagram
    participant Admin as Admin User (Browser)
    participant MW as Auth + Admin Middleware
    participant API as admin.controller
    participant DB as system_configs table

    Admin->>MW: GET /api/admin/configs
    MW->>MW: Validate session + check is_superuser
    MW->>API: Authorized
    API->>DB: SELECT * FROM system_configs
    DB-->>API: [{config_key, config_value, description}, ...]
    API-->>Admin: 200 OK [{...}]

    Admin->>MW: PUT /api/admin/configs/:key
    Note right of Admin: { config_value: 30 }
    MW->>MW: Validate session + check is_superuser
    MW->>API: Authorized
    API->>DB: UPDATE system_configs<br/>SET config_value = 30<br/>WHERE config_key = :key
    API->>DB: INSERT audit_log<br/>(action: config.updated)
    API-->>Admin: 200 OK { updated config }
```

---

## 6. Entity Relationship Overview

```mermaid
erDiagram
    PRODUCTS ||--o{ BUYBOX_SNAPSHOTS : "has many"
    PRODUCTS ||--o{ ALERTS : "has many"
    PRODUCTS ||--o{ DAILY_VISIBILITY_AGGREGATES : "has many"
    SCANS ||--o{ BUYBOX_SNAPSHOTS : "produces"
    SCANS ||--o{ ALERTS : "triggers"
    TRACKER_CONFIGS ||--|{ PRODUCTS : "governs tracking of"
    NOTIFICATION_CHANNELS ||--o{ ALERTS : "delivers"

    PRODUCTS {
        uuid id PK
        uuid integration_account_id
        uuid organization_id
        varchar asin
        varchar sku
        boolean track_buybox
    }

    BUYBOX_SNAPSHOTS {
        uuid id PK
        uuid product_id FK
        uuid scan_id FK
        boolean has_buybox
        decimal our_price
        decimal buybox_price
        varchar loss_reason
        decimal est_missed_sales
        timestamp snapshot_at
    }

    SCANS {
        uuid id PK
        uuid integration_account_id
        varchar status
        varchar triggered_by
        int total_products
        int scanned_products
    }

    ALERTS {
        uuid id PK
        uuid product_id FK
        uuid scan_id FK
        varchar alert_type
        varchar severity
        boolean is_notified
    }

    TRACKER_CONFIGS {
        uuid id PK
        uuid integration_account_id
        varchar update_frequency
        boolean email_alerts_enabled
        boolean slack_alerts_enabled
    }

    NOTIFICATION_CHANNELS {
        uuid id PK
        uuid organization_id
        varchar channel_type
        jsonb config
        jsonb events
    }

    DAILY_VISIBILITY_AGGREGATES {
        uuid id PK
        uuid product_id FK
        date date
        decimal visibility_pct
        decimal total_missed_sales
    }

    SYSTEM_CONFIGS {
        uuid id PK
        varchar config_key
        jsonb config_value
    }
```
