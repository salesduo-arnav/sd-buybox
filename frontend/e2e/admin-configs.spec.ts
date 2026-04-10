import { test as base, expect } from "@playwright/test";
import { mockAuthenticatedApi, MOCK_USER } from "./fixtures";

const MOCK_SUPERUSER = {
  ...MOCK_USER,
  is_superuser: true,
};

const MOCK_CONFIGS = [
  { key: "max_products_per_scan", value: 500, type: "integer", category: "scanning", description: "Maximum products processed in a single scan batch" },
  { key: "default_marketplace", value: "US", type: "select", category: "scanning", description: "Default marketplace for scan requests" },
  { key: "default_update_frequency", value: "hourly", type: "select", category: "scanning", description: "Default scan frequency for new accounts" },
  { key: "visibility_warning_default", value: 50, type: "integer", category: "thresholds", description: "Default warning threshold percentage" },
  { key: "visibility_critical_default", value: 25, type: "integer", category: "thresholds", description: "Default critical threshold percentage" },
  { key: "missed_sales_min_velocity", value: 0.5, type: "decimal", category: "thresholds", description: "Minimum daily units to calculate missed sales" },
  { key: "snapshot_retention_days", value: 90, type: "integer", category: "data_retention", description: "Snapshots older than this are deleted by cleanup job" },
  { key: "supported_marketplaces", value: ["US", "CA", "UK"], type: "json", category: "scanning", description: "Available marketplaces for tracking" },
];

/** Mock all APIs with a superuser session + admin configs endpoint. */
async function mockSuperuserApi(page: import("@playwright/test").Page) {
  // Override auth to return a superuser.
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success", data: MOCK_SUPERUSER }),
    })
  );

  // Admin configs list.
  await page.route("**/api/admin/configs", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "success", data: { configs: MOCK_CONFIGS } }),
      });
    }
    return route.continue();
  });

  // Admin config update (PUT /api/admin/configs/:key).
  await page.route("**/api/admin/configs/*", (route) => {
    if (route.request().method() === "PUT") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "success", data: {} }),
      });
    }
    return route.continue();
  });

  // Set up remaining mock APIs (entitlements, accounts, etc.).
  await mockAuthenticatedApi(page);
}

base.describe("Admin Configs page", () => {
  base("non-superuser is redirected away from /admin/configs", async ({ page }) => {
    await mockAuthenticatedApi(page);
    await page.goto("/admin/configs");
    // Should redirect to /overview since MOCK_USER is not a superuser.
    await expect(page).toHaveURL(/\/overview$/);
  });

  base("superuser can access the admin configs page", async ({ page }) => {
    await mockSuperuserApi(page);
    await page.goto("/admin/configs");
    await page.waitForURL("**/admin/configs");

    await expect(page.getByRole("heading", { name: /system configurations/i })).toBeVisible();
  });

  base("renders configs grouped by category", async ({ page }) => {
    await mockSuperuserApi(page);
    await page.goto("/admin/configs");
    await page.waitForURL("**/admin/configs");

    // Category headers
    await expect(page.getByText("Scanning").first()).toBeVisible();
    await expect(page.getByText("Thresholds").first()).toBeVisible();
    await expect(page.getByText("Data Retention").first()).toBeVisible();
  });

  base("displays config descriptions", async ({ page }) => {
    await mockSuperuserApi(page);
    await page.goto("/admin/configs");
    await page.waitForURL("**/admin/configs");

    await expect(page.getByText("Maximum products processed in a single scan batch")).toBeVisible();
  });

  base("search filters configs by key and description", async ({ page }) => {
    await mockSuperuserApi(page);
    await page.goto("/admin/configs");
    await page.waitForURL("**/admin/configs");

    const searchInput = page.getByPlaceholder("Search configurations...");
    await searchInput.fill("retention");

    // Retention config should be visible.
    await expect(page.getByText("Snapshot Retention Days")).toBeVisible();
    // Non-matching configs should be hidden.
    await expect(page.getByText("Max Products Per Scan")).not.toBeVisible();
  });

  base("shows Unsaved badge when a value is modified", async ({ page }) => {
    await mockSuperuserApi(page);
    await page.goto("/admin/configs");
    await page.waitForURL("**/admin/configs");

    // Find the integer input for max_products_per_scan and modify it.
    const input = page.locator("#max_products_per_scan");
    await input.fill("200");

    await expect(page.getByText("Unsaved").first()).toBeVisible();
  });

  base("superuser sees admin nav in sidebar", async ({ page }) => {
    await mockSuperuserApi(page);
    await page.goto("/admin/configs");
    await page.waitForURL("**/admin/configs");

    await expect(page.getByTestId("nav-admin-configs")).toBeVisible();
    await expect(page.getByText("System Configs").first()).toBeVisible();
  });

  base("non-superuser does not see admin nav in sidebar", async ({ page }) => {
    await mockAuthenticatedApi(page);
    await page.goto("/overview");
    await page.waitForURL("**/overview");

    await expect(page.getByTestId("nav-admin-configs")).not.toBeVisible();
  });
});
