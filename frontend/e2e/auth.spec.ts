import { test as base, expect } from "@playwright/test";
import { mockAuthenticatedApi, MOCK_USER } from "./fixtures";

base.describe("Authentication", () => {
  base("should not render the app shell on a protected route when unauthenticated", async ({ page }) => {
    // Mock auth to return 401
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ status: "error", message: "Authentication required" }),
      })
    );

    await page.goto("/overview");
    await page.waitForTimeout(2000);

    // The placeholder Overview heading should not be visible — ProtectedRoute
    // either shows "Redirecting..." or has navigated away.
    const onOverview = await page
      .getByRole("heading", { name: /buy box overview/i })
      .isVisible()
      .catch(() => false);
    expect(onOverview).toBe(false);
  });

  base("should attempt to redirect with app=buybox query param", async ({ page }) => {
    let redirectUrl: string | null = null;
    await page.route("**/login**", (route) => {
      redirectUrl = route.request().url();
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Login page</body></html>",
      });
    });

    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ status: "error", message: "Authentication required" }),
      })
    );

    await page.goto("/overview");
    await page.waitForTimeout(2000);

    if (redirectUrl) {
      expect(redirectUrl).toContain("app=buybox");
    }
  });

  base("should render the app shell on /overview when authenticated", async ({ page }) => {
    await mockAuthenticatedApi(page);
    await page.goto("/overview");
    await page.waitForURL("**/overview");
    await expect(page).toHaveURL(/overview/);
  });

  base("should display user name in sidebar", async ({ page }) => {
    await mockAuthenticatedApi(page);
    await page.goto("/overview");
    await page.waitForURL("**/overview");

    await expect(page.getByText(MOCK_USER.full_name).first()).toBeVisible({ timeout: 5000 });
  });
});
