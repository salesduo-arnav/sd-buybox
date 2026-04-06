# Database Schema

The database relies on PostgreSQL, and the schema is designed using standard relational mapping. It assumes the use of an ORM like Sequelize (similar to the `sd-cohesity` micro-tool).

You can copy and paste the DBML code below into [dbdiagram.io](https://dbdiagram.io/) to visualize the schema.

```dbml
Project AmazonVisibilityTracker {
  database_type: 'PostgreSQL'
  Note: 'Micro tool for tracking Buy Box status and sales impact'
}

Table Organization {
  id uuid [primary key]
  name varchar
  created_at timestamp
  updated_at timestamp
}

Table IntegrationAccount {
  id uuid [primary key]
  organization_id uuid [ref: > Organization.id]
  marketplace_id varchar
  credentials json
  created_at timestamp
}

Table Product {
  id uuid [primary key]
  integration_account_id uuid [ref: > IntegrationAccount.id]
  asin varchar(20)
  sku varchar(100)
  title varchar(500)
  image_url varchar
  is_top_product boolean
  track_status boolean [default: true]
  estimated_daily_sales decimal [note: 'Used for Missed Sales calculations']
  created_at timestamp
  updated_at timestamp
}

Table BuyBoxSnapshot {
  id uuid [primary key]
  product_id uuid [ref: > Product.id]
  has_buybox boolean
  buybox_price decimal
  our_price decimal
  external_price decimal
  winner_type varchar [note: 'Enum: own, 3p_seller, amazon_vc, external']
  loss_reason varchar [note: 'Enum: cheaper_3p, lower_external, lower_own_vc, null']
  est_missed_sales_in_period decimal [note: 'Missed sales for the duration since last snapshot']
  snapshot_time timestamp [default: `now()`]
}

Table Alert {
  id uuid [primary key]
  product_id uuid [ref: > Product.id]
  severity varchar [note: 'Enum: info, warning, critical']
  message text
  is_read boolean [default: false]
  created_at timestamp [default: `now()`]
}

Table TrackerSettings {
  id uuid [primary key]
  integration_account_id uuid [ref: - IntegrationAccount.id]
  track_all_products boolean [default: true]
  update_frequency varchar [note: 'Enum: real_time, hourly, daily']
  email_alerts_enabled boolean [default: true]
  critical_alerts_only boolean [default: false]
  updated_at timestamp
}

Table SystemConfigs {
  id uuid [primary key]
  setting_key varchar [unique, note: 'e.g., default_cron_period, active_marketplaces']
  setting_value json
  description text
  created_at timestamp
  updated_at timestamp
}
```

## Schema Description:
1. **Organization / IntegrationAccount**: Handles multi-tenancy and the Amazon Seller/Vendor accounts integration.
2. **Product**: Maintains the catalog of items to be tracked.
3. **BuyBoxSnapshot**: A time-series table. Every time the cron/queue processes a product, it inserts a record here showing the current status, identifying whether the buybox is won or lost and precisely why.
4. **Alert**: Holds generated notifications about status drops and new competitors.
5. **TrackerSettings**: Custom user preferences for how frequently tracking should occur.
6. **SystemConfigs**: A dedicated table for Admin users to manage global application settings dynamically (e.g., cron interval options, marketplace lists) without hardcoding values in the database or requiring code changes.
