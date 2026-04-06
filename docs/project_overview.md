# Amazon Visibility (Buy Box) Tracker — Project Overview

**An executive summary for team leads, product managers, and stakeholders.**

---

## What Is This?

The Buy Box Tracker is a new micro-tool in our SaaS platform. It works alongside our existing tools (like Content Cohesity) to give Amazon sellers and vendors one critical piece of intelligence: **"Am I losing sales because of the Buy Box, and how much is it costing me?"**

### Quick Context: What Is the "Buy Box"?

On any Amazon product page, there's a prominent white box on the right side that contains the "Add to Cart" and "Buy Now" buttons. This is the **Buy Box**. When multiple sellers offer the same product, Amazon decides which seller gets this box. The winner gets the vast majority of sales — **over 80% of purchases on Amazon go through the Buy Box.**

If you lose the Buy Box, your product is still listed on the page, but buried in the "Other Sellers" section that most shoppers never click. Your visibility — and sales — plummet.

---

## The Problem We're Solving

Today, brand managers often discover Buy Box losses **after the damage is done**. A product's daily sales drop from $500 to $50, and the team spends hours manually checking Amazon listings to figure out why. Common causes include:

1. **A cheaper competitor appeared** — a third-party seller is undercutting the price.
2. **Price parity violations** — Amazon found the product cheaper on Walmart or Target and suppressed the listing.
3. **Internal cannibalization** — the brand's own Vendor Central and Seller Central accounts are competing against each other.

Without automated monitoring, these issues can persist for days or weeks, silently draining revenue.

---

## What the Tool Does

The Buy Box Tracker solves this by **automatically checking every product's Buy Box status throughout the day** and immediately alerting the team when something goes wrong.

### Core Capabilities

| Capability | What It Does | Why It Matters |
|---|---|---|
| **Visibility Monitoring** | Checks each product's Buy Box status on a schedule (hourly, daily, or near real-time) | No more manual checking |
| **Revenue Impact** | Calculates the estimated dollar amount of missed sales when the Buy Box is lost | Turns an abstract problem into a concrete financial number |
| **Root Cause Analysis** | Automatically identifies *why* the Buy Box was lost (competitor, external price, own account conflict) | Teams know exactly what action to take |
| **Smart Alerts** | Sends notifications via email and Slack when visibility drops below thresholds | Problems are caught in hours, not days |
| **Trend Tracking** | Shows visibility trends over time with comparisons to previous periods | Spot systemic issues vs. one-time blips |

### Dashboard Pages

The tool includes four main views, matching the designs shared in our mockups:

1. **Overview** — High-level stats: total missed sales, products affected, average visibility, trend charts, and a breakdown of loss reasons.
2. **Products** — A searchable, filterable table of all tracked products with per-product visibility percentages, loss reasons, estimated missed revenue, and last-checked timestamps.
3. **Alerts** — A feed of recent events (new competitor detected, visibility drop, Buy Box recovered) with severity levels (Info / Warning / Critical) and direct links to the affected product.
4. **Settings** — Configuration for which products to track, how often to check, and notification preferences (email on/off, Slack on/off, critical-only mode).

### Admin Panel
A dedicated admin section (for internal team members only) provides control over system-wide settings without requiring code deployments — things like which marketplaces are supported, default checking intervals, and data retention policies.

---

## How It Fits Into Our Platform

The Buy Box Tracker plugs directly into our existing infrastructure:

- **Authentication** is handled by our core platform — users log in once and access all tools.
- **Amazon account connections** are already set up through our core platform integrations (SP-API). No additional setup needed for sellers who are already connected.
- **Notifications** leverage our existing email and Slack infrastructure — no separate configuration required.
- **Billing and entitlements** work through the same subscription system as our other tools.

For end users, it feels like a natural extension of the dashboard they already know.

---

## Key Metrics We Track

| Metric | Example | How It's Calculated |
|---|---|---|
| Product Visibility | 49% | Percentage of checks where we held the Buy Box |
| Estimated Sales Missed | $8,865 | Lost sales estimated from time without Buy Box × daily sales rate |
| Products Affected | 6 | Number of products that lost the Buy Box in the period |
| Visibility Trend | ↓ 12% vs last period | Comparison with the same-length previous period |
| Loss Reason Breakdown | Cheaper 3P: 3, External: 2, Own VC: 1 | Classification of why each Buy Box was lost |

---

## Expected Impact

- **Faster response time**: From days of unnoticed losses → alerts within hours.
- **Revenue recovery**: A single recovered Buy Box on a top-selling product can recoup thousands per day.
- **Data-driven pricing decisions**: Clear visibility into competitor pricing enables strategic repricing.
- **Reduced internal cannibalization**: Detect VC vs. SC conflicts that most brands don't even realize exist.
