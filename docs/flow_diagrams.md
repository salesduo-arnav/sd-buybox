# Buy Box Tracker System Flow Diagrams

This document contains detailed flowcharts tracing the entire logic from data ingestion to alerting, to be utilized for understanding the integration between components.

## Buy Box Polling & Calculation Flow

```mermaid
sequenceDiagram
    participant TS as Tick Scheduler (pg-boss)
    participant Worker as Scanner Worker (pg-boss)
    participant Core as Core Platform API
    participant SPAPI as Amazon SP-API
    participant DB as App DB (PostgreSQL)

    TS->>DB: Query `TrackerSettings` for due accounts
    DB-->>TS: Return list of due Organization/Integration IDs
    TS->>Worker: Enqueue ACCOUNT_SCAN_TRIGGER
    
    rect rgb(240, 248, 255)
        note right of Worker: Per Account Loop
        Worker->>DB: Fetch active tracked Products
        Worker->>Core: GET /internal/integrations/accounts/:id/credentials
        Core-->>Worker: Decrypted SP-API Credentials
        Worker->>Worker: Build Batches of ASINs
    end
    
    rect rgb(255, 245, 238)
        note right of Worker: Tracking Execution Job
        Worker->>SPAPI: `getPricing` / `AnyOfferChanged` polling
        SPAPI-->>Worker: Pricing/Buy Box Data (BuyBox Winner, Prices)
        
        alt Buy Box Won
            Worker->>DB: Insert `BuyBoxSnapshot` (has_buybox: true)
        else Buy Box Lost
            Worker->>Worker: Determine `loss_reason` (Cheaper 3P, Lower External, Lower VC)
            Worker->>Worker: Estimate Missed Sales (Baseline Velocity × Time without BuyBox)
            Worker->>DB: Insert `BuyBoxSnapshot` (has_buybox: false, reason, missed sales)
            Worker->>DB: Check if Drop crosses Threshold -> Insert `Alert` Record
        end
    end
```

## Alert Notification Routing

```mermaid
graph LR
    subgraph Data Capture
        Scanner[Scanner Worker] -->|Discovers Issue| DB[(Alerts Table)]
    end

    subgraph Job Execution
        DB -->|Trigger Enqueued| Dispatcher[Notification Worker]
    end

    subgraph Core Platform Integration
        Dispatcher -->|Check Settings| DB2[(Tracker Settings)]
        Dispatcher -->|POST Slack Payload| CoreAPI[Core Platform Internal Routes]
        Dispatcher -->|POST Email Payload| CoreAPI
    end

    subgraph Destinations
        CoreAPI --> Slack[Slack Channel Notification]
        CoreAPI --> Email[Seller E-mail Inbox]
    end
```

## Missed Sales Aggregation Flow (UI Dashboard)

```mermaid
flowchart TD
    A[Frontend React Dashboard] -->|GET /api/visibility/overview| B(Express Controller)
    B --> C{Metrics Service}
    
    C -->|Fetch Last 30 Days Snapshots| D[(PostgreSQL)]
    C -->|Fetch Prev 30 Days Snapshots| D
    
    D --> E[Metrics Crunching]
    
    E --> F[Calculate Average Visibility %]
    E --> G[Sum Total Missed Sales]
    E --> H[Group Products by Loss Reason]
    E --> I[Calculate +/- Trends]
    
    F --> J[Compile JSON Response]
    G --> J
    H --> J
    I --> J
    
    J --> A
```
