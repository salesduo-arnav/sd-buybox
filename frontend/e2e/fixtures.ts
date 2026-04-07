import { test as base, Page } from "@playwright/test";

// Mock data matching the sd-buybox backend response shapes.
// Backend envelope is { status: "success", data: ... } — `Api.ts` unwraps it.

export const MOCK_USER = {
  id: "60ea16c3-23fd-4058-a987-1aab33385179",
  email: "test@salesduo.com",
  full_name: "Test User",
  name: "Test User",
  organization_id: "5270a594-0078-4abb-a6b6-e1f79416aa13",
  organization_name: "SalesDuo",
  role: "Owner",
  memberships: [
    {
      organization: { id: "5270a594-0078-4abb-a6b6-e1f79416aa13", name: "SalesDuo" },
      role: { id: 1, name: "Owner" },
    },
  ],
};

export const MOCK_ACCOUNT = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  organization_id: "5270a594-0078-4abb-a6b6-e1f79416aa13",
  platform: "amazon",
  account_type: "sc",
  marketplace_region: "US",
  marketplace_id: "ATVPDKIKX0DER",
  account_name: "Test SC Account",
  seller_id: "A1SELLER123",
  selling_partner_id: null,
  vendor_code: null,
  status: "connected",
};

export const MOCK_SECONDARY_ACCOUNT = {
  ...MOCK_ACCOUNT,
  id: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
  account_name: "Test VC Account",
  account_type: "vc",
  vendor_code: "VC1234",
};

export const MOCK_VISIBILITY_OVERVIEW = {
  period: "last_14_days",
  avg_visibility_pct: 78.5,
  est_missed_sales: 8865.42,
  products_affected: 6,
  visibility_trend_pct: -12.3,
  last_updated_at: "2026-04-07T10:30:00.000Z",
  loss_reason_breakdown: [
    { reason: "cheaper_3p", count: 3 },
    { reason: "lower_external", count: 2 },
    { reason: "lower_own_vc", count: 1 },
  ],
  visibility_timeline: [
    { date: "2026-03-25", avg_visibility: 92.1 },
    { date: "2026-03-26", avg_visibility: 88.4 },
    { date: "2026-03-27", avg_visibility: 81.0 },
  ],
};

export const MOCK_PRODUCT = {
  id: "p-001",
  integration_account_id: MOCK_ACCOUNT.id,
  organization_id: MOCK_ACCOUNT.organization_id,
  asin: "B00BUYBOX01",
  sku: "SKU-BB-001",
  title: "Test Product One",
  image_url: null,
  visibility_pct: 49.0,
  est_missed_sales: 1200.5,
  loss_reasons: ["cheaper_3p"],
  last_checked_at: "2026-04-07T10:00:00.000Z",
};

export const MOCK_ALERT = {
  id: "alert-001",
  product_id: MOCK_PRODUCT.id,
  organization_id: MOCK_ACCOUNT.organization_id,
  integration_account_id: MOCK_ACCOUNT.id,
  alert_type: "buybox_lost",
  severity: "critical",
  title: "Buy Box lost on B00BUYBOX01",
  message: "A cheaper third-party seller is now winning the Buy Box.",
  metadata: { asin: "B00BUYBOX01", loss_reason: "cheaper_3p" },
  is_read: false,
  is_notified: true,
  created_at: "2026-04-07T09:45:00.000Z",
};

/**
 * Sets up API route mocking for an authenticated session.
 * Intercepts the auth, account, and buybox endpoints and returns mock data
 * matching the backend's `{ status: "success", data: ... }` envelope.
 */
export async function mockAuthenticatedApi(page: Page) {
  // Auth
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success", data: MOCK_USER }),
    })
  );

  await page.route("**/api/auth/logout", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success" }),
    })
  );

  // Integration accounts (served by sd-buybox backend, sourced from sd-core-platform)
  await page.route("**/api/settings/accounts", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: [MOCK_ACCOUNT, MOCK_SECONDARY_ACCOUNT],
        }),
      });
    }
    return route.continue();
  });

  // Visibility overview (Overview page)
  await page.route("**/api/visibility/overview*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success", data: MOCK_VISIBILITY_OVERVIEW }),
    })
  );

  // Products (Products page) — paginated
  await page.route(/\/api\/products(\?|$)/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: [MOCK_PRODUCT],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasMore: false },
      }),
    })
  );

  // Alerts (Alerts page)
  await page.route(/\/api\/alerts(\?|$)/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success", data: [MOCK_ALERT] }),
    })
  );

  // Tracker config (Settings page)
  await page.route("**/api/settings/" + MOCK_ACCOUNT.id, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: {
            integration_account_id: MOCK_ACCOUNT.id,
            tracking_scope: "all",
            schedule_enabled: true,
            update_frequency: "hourly",
            email_alerts_enabled: true,
            slack_alerts_enabled: false,
            critical_alerts_only: false,
            visibility_warning_threshold: 50,
            visibility_critical_threshold: 25,
          },
        }),
      });
    }
    return route.continue();
  });
}

/**
 * Extended test fixture that provides an authenticated page with mocked APIs.
 * Navigates straight to /overview (which is behind ProtectedRoute) so the
 * mocked /auth/me response gates rendering of the app shell.
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await mockAuthenticatedApi(page);
    await page.goto("/overview");
    await page.waitForURL("**/overview");
    await use(page);
  },
});

export { expect } from "@playwright/test";
