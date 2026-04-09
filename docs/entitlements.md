# Buybox Entitlements — Feature Contract & Setup Guide

Buybox enforces gating purely by reading `organization_entitlements` from
sd-core-platform. This file is the single source of truth for the feature
slugs buybox's code checks — create matching `features` rows in the
core-platform admin UI to activate gating.

Nothing in buybox is hardcoded or seeded. Nothing in core-platform needs a
migration. A superuser configures everything through the existing admin UI.

---

## Feature Contract

Buybox code reads exactly these slugs. They MUST match the constants in
[`backend/src/services/entitlements/entitlements.types.ts`](../backend/src/services/entitlements/entitlements.types.ts)
exactly — casing and punctuation included. If a slug is missing from
core-platform, buybox treats it as disabled / zero / safe-default, so the
app keeps running while the configuration is incomplete.

### A. Boolean capability gates

`limit_amount = null` (or any positive integer) means enabled.
`limit_amount = 0` or a missing row means disabled.

| Slug                                 | Name                           | Purpose                                                                                               |
|--------------------------------------|--------------------------------|-------------------------------------------------------------------------------------------------------|
| `buybox.feature.slack_alerts`        | Slack alerts                   | Gates the Slack leg of alert dispatch and the Slack toggle in Settings                                |
| `buybox.feature.custom_thresholds`   | Custom visibility thresholds   | Gates editing of `visibility_warning_threshold` / `visibility_critical_threshold`                     |
| `buybox.feature.custom_recipients`   | Custom notification recipients | Gates `tracker_config.notification_emails` and `slack_channel_id`                                     |
| `buybox.feature.selected_tracking`   | Selected ASIN tracking         | Gates `tracker_config.tracking_scope = 'selected'`                                                    |
| `buybox.feature.advanced_analytics`  | Advanced analytics             | Gates loss-reason donut, visibility timeline, and trend % on `/visibility/overview`                   |

### B. Tier gates (integer rank)

`limit_amount` is an integer; higher means more privilege.
`null` means unlimited (highest possible).

| Slug                                   | Encoding                                                                                    |
|----------------------------------------|----------------------------------------------------------------------------------------------|
| `buybox.tier.update_frequency`         | `1 = daily`, `2 = hourly`, `3 = real_time`. `null` = real_time. Missing = no scheduled scans.|
| `buybox.tier.history_retention_days`   | Integer days (e.g. `30`, `90`, `180`). `null` = keep forever (clamped to 3650 at read).      |

### C. Derived limits (count-from-DB, no consume API)

Buybox counts live rows and compares to `limit_amount`. No `usage_amount` drift.

| Slug                              | Counted as                                                                               |
|-----------------------------------|-------------------------------------------------------------------------------------------|
| `buybox.limit.tracked_asins`      | `COUNT(*) FROM products WHERE organization_id=? AND deleted_at IS NULL`                   |
| `buybox.limit.connected_accounts` | `COUNT(DISTINCT integration_account_id) FROM tracker_configs WHERE organization_id=?`     |

### D. Flow limits (consume API, monthly reset)

Buybox calls `POST /internal/organizations/:id/entitlements/consume` so
core-platform is the atomic arbiter. Set `reset_period = monthly`.

| Slug                                         | Consumed on                                                                               |
|----------------------------------------------|-------------------------------------------------------------------------------------------|
| `buybox.limit.scans_per_month`               | `POST /api/scans/trigger` — only manual triggers, not scheduled scans                     |
| `buybox.limit.alerts_dispatched_per_month`   | Inside the `buybox:alert-dispatch` worker before every email / Slack send                 |

> "Monthly" in core-platform means calendar month UTC, not the org's billing
> period. Surface this in the upgrade dialog so users are not surprised.

---

## Example Plan Grid

Reference only — the superuser picks whatever plan names, numbers, and
pricing strategy they want. Buybox does not care how many plans exist, what
they are called, whether there is a free tier, or how long any trial runs.

| Feature                                | Free  | Starter | Pro    | Enterprise |
|----------------------------------------|-------|---------|--------|------------|
| `buybox.limit.tracked_asins`           | 25    | 250     | 2500   | null       |
| `buybox.limit.connected_accounts`      | 1     | 1       | 5      | null       |
| `buybox.tier.update_frequency`         | 1     | 2       | 3      | 3          |
| `buybox.tier.history_retention_days`   | 30    | 90      | 180    | null       |
| `buybox.limit.scans_per_month`         | 5     | 50      | 500    | null       |
| `buybox.limit.alerts_dispatched_per_month` | 50| 500     | 5000   | null       |
| `buybox.feature.selected_tracking`     | 0     | null    | null   | null       |
| `buybox.feature.slack_alerts`          | 0     | 0       | null   | null       |
| `buybox.feature.custom_thresholds`     | 0     | null    | null   | null       |
| `buybox.feature.custom_recipients`     | 0     | null    | null   | null       |
| `buybox.feature.advanced_analytics`    | 0     | null    | null   | null       |

---

## Superuser Setup

1. Open core-platform admin → **Tools** → `buybox`.
2. Go to the **Features** tab. For every slug in the tables above, click
   "Add Feature" and paste the slug, name, and description.
3. Go to the **Plans** tab. Create whatever plans you want — any names,
   any prices, any number of tiers.
4. For each plan, open it and set **Plan Limits** against each feature
   with whatever numbers make sense. `null` = unlimited, `0` = disabled.
5. (Optional) Mark one plan as `is_trial_plan` and set `tools.trial_days`
   if you want a trial-then-paid flow.
6. Subscribe the dev org (`c6a73355-947c-438c-ae5e-a6beeaed4af5`) to any
   plan via admin so it does not get locked out when enforcement flips on.

Changes take effect within ~60 seconds (snapshot cache TTL) for all active
orgs, or immediately when the user hits
`POST /api/entitlements/refresh` (triggered automatically when the browser
returns from the billing flow).

---

## Rollout Checklist

Before flipping `ENTITLEMENTS_ENFORCE=true` in the buybox backend:

- [ ] All feature slugs above have rows in core-platform `features`
- [ ] At least one plan exists with `plan_limits` for every feature
- [ ] The dev org is subscribed to that plan
- [ ] Shadow-mode logs (`enforced: false, would_deny: ...`) show no
      unexpected denies for 24 hours
- [ ] Flip `ENTITLEMENTS_ENFORCE=true` and redeploy

## Gotchas

- Slugs are **case-sensitive**. A typo means the feature silently stays
  disabled — buybox's safe-default behaviour masks the bug.
- A missing feature row is NOT the same as `limit_amount = 0`. Both mean
  "disabled" from buybox's point of view.
- `connected_accounts` and `tracked_asins` are counted live from buybox's
  DB. Archiving a product or deleting a tracker_config frees up quota on
  the next request, without any explicit release API.
