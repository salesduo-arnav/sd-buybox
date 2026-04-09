import { test as base, expect } from "@playwright/test";
import { test } from "./fixtures";
import {
  mockAuthenticatedApi,
  MOCK_ENTITLEMENTS_HEALTHY,
  MOCK_ENTITLEMENTS_LOCKED,
  MOCK_ENTITLEMENTS_STARTER,
} from "./fixtures";

// Entitlement gating end-to-end.
//
// All scenarios go through the same boot path:
//   1. /api/auth/me succeeds
//   2. /api/entitlements/me returns the snapshot under test
//   3. ProtectedRoute either renders the app shell, the locked shell, or
//      the loading skeleton based on the snapshot's `has_any_entitlement`.

// ─────────────────────────────────────────────────────────────────────
// Healthy snapshot — default fixture
// ─────────────────────────────────────────────────────────────────────

test.describe("Entitlements — healthy plan", () => {
  test("renders the app shell when the org has active entitlements", async ({
    authenticatedPage: page,
  }) => {
    // The default `authenticatedPage` fixture already mocks
    // /entitlements/me with MOCK_ENTITLEMENTS_HEALTHY.
    await expect(page.getByRole("heading", { name: /buy box overview/i })).toBeVisible();
  });

  test("does not render the locked shell hero when entitlements are healthy", async ({
    authenticatedPage: page,
  }) => {
    await expect(
      page.getByRole("heading", { name: /unlock the full power of buybox/i })
    ).toHaveCount(0);
  });

  test("calls GET /api/entitlements/me on boot", async ({ page }) => {
    // mockAuthenticatedApi must run FIRST so its routes are in place;
    // then we layer a tracking handler over the entitlements endpoint
    // (Playwright matches the most-recently-registered route first).
    await mockAuthenticatedApi(page);

    let snapshotRequested = false;
    await page.route("**/api/entitlements/me", (route) => {
      snapshotRequested = true;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "success", data: MOCK_ENTITLEMENTS_HEALTHY }),
      });
    });

    await page.goto("/overview");
    await page.waitForURL("**/overview");

    expect(snapshotRequested).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Locked snapshot — has_any_entitlement: false
// ─────────────────────────────────────────────────────────────────────

base.describe("Entitlements — locked organisation", () => {
  base("renders the LockedShell hero on a protected route", async ({ page }) => {
    await mockAuthenticatedApi(page, { entitlements: MOCK_ENTITLEMENTS_LOCKED });
    await page.goto("/overview");
    await page.waitForURL("**/overview");

    await expect(
      page.getByRole("heading", { name: /unlock the full power of buybox/i })
    ).toBeVisible();
  });

  base("does NOT render the regular overview heading when locked", async ({ page }) => {
    await mockAuthenticatedApi(page, { entitlements: MOCK_ENTITLEMENTS_LOCKED });
    await page.goto("/overview");
    await page.waitForURL("**/overview");

    await expect(page.getByRole("heading", { name: /buy box overview/i })).toHaveCount(0);
  });

  base("renders the Buybox Premium pill", async ({ page }) => {
    await mockAuthenticatedApi(page, { entitlements: MOCK_ENTITLEMENTS_LOCKED });
    await page.goto("/overview");
    await page.waitForURL("**/overview");

    await expect(page.getByText(/buybox premium/i).first()).toBeVisible();
  });

  base("renders the four feature highlights", async ({ page }) => {
    await mockAuthenticatedApi(page, { entitlements: MOCK_ENTITLEMENTS_LOCKED });
    await page.goto("/overview");
    await page.waitForURL("**/overview");

    await expect(page.getByText(/real-time buy box visibility tracking/i)).toBeVisible();
    await expect(page.getByText(/loss-reason analytics/i)).toBeVisible();
    await expect(page.getByText(/email \+ slack alerts/i)).toBeVisible();
    await expect(page.getByText(/unlimited asins/i)).toBeVisible();
  });

  base("Choose your plan CTA links to the core-platform billing flow", async ({ page }) => {
    await mockAuthenticatedApi(page, { entitlements: MOCK_ENTITLEMENTS_LOCKED });
    await page.goto("/overview");
    await page.waitForURL("**/overview");

    const cta = page.getByRole("link", { name: /choose your plan/i });
    await expect(cta).toBeVisible();
    const href = await cta.getAttribute("href");
    expect(href).toBeTruthy();
    expect(href).toContain("/billing");
    expect(href).toContain("tool=buybox");
    expect(href).toContain(`org=${MOCK_ENTITLEMENTS_LOCKED.organization_id}`);
  });

  base("locked shell still renders when navigating to other gated routes", async ({ page }) => {
    await mockAuthenticatedApi(page, { entitlements: MOCK_ENTITLEMENTS_LOCKED });

    for (const path of ["/overview", "/products", "/alerts", "/settings"]) {
      await page.goto(path);
      await page.waitForURL(`**${path}`);
      await expect(
        page.getByRole("heading", { name: /unlock the full power of buybox/i })
      ).toBeVisible();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// Restricted (Starter) snapshot — paid but feature-limited
// ─────────────────────────────────────────────────────────────────────

base.describe("Entitlements — restricted (Starter) plan", () => {
  base("renders the app shell, NOT the locked hero", async ({ page }) => {
    await mockAuthenticatedApi(page, { entitlements: MOCK_ENTITLEMENTS_STARTER });
    await page.goto("/overview");
    await page.waitForURL("**/overview");

    await expect(page.getByRole("heading", { name: /buy box overview/i })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /unlock the full power of buybox/i })
    ).toHaveCount(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Failure modes
// ─────────────────────────────────────────────────────────────────────

base.describe("Entitlements — boot failure modes", () => {
  base("treats /entitlements/me 500 as locked (safe-default)", async ({ page }) => {
    // Need the full mocked API (auth + integrations) so the global 401
    // interceptor doesn't redirect us before the test can run. Then
    // overlay a 500 on the entitlements endpoint.
    await mockAuthenticatedApi(page);
    await page.route("**/api/entitlements/me", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ status: "error", error: { code: "INTERNAL_ERROR", message: "boom" } }),
      })
    );

    await page.goto("/overview");
    await page.waitForURL("**/overview");

    // Snapshot=null + isLoading=false -> useIsLocked returns true ->
    // ProtectedRoute renders LockedShell.
    await expect(
      page.getByRole("heading", { name: /unlock the full power of buybox/i })
    ).toBeVisible();
  });
});
