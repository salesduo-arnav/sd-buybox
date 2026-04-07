import { test, expect } from "./fixtures";

test.describe("Navigation and layout shell", () => {
  test("renders the layout shell with sidebar and header on the overview page", async ({
    authenticatedPage: page,
  }) => {
    // Sidebar app name
    await expect(page.getByText("Buy Box Tracker").first()).toBeVisible();

    // Header breadcrumb
    await expect(page.getByText(/overview/i).first()).toBeVisible();

    // Placeholder body content
    await expect(page.getByRole("heading", { name: /buy box overview/i })).toBeVisible();
  });

  test("navigates between all four buybox routes via the sidebar", async ({
    authenticatedPage: page,
  }) => {
    await page.getByTestId("nav-products").click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByRole("heading", { name: /products/i }).first()).toBeVisible();

    await page.getByTestId("nav-alerts").click();
    await expect(page).toHaveURL(/\/alerts$/);
    await expect(page.getByRole("heading", { name: /alerts/i }).first()).toBeVisible();

    await page.getByTestId("nav-settings").click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole("heading", { name: /settings/i }).first()).toBeVisible();

    await page.getByTestId("nav-overview").click();
    await expect(page).toHaveURL(/\/overview$/);
    await expect(page.getByRole("heading", { name: /buy box overview/i })).toBeVisible();
  });

  test("renders the integration account switcher with mocked accounts", async ({
    authenticatedPage: page,
  }) => {
    // Active account name should show in the sidebar account switcher
    await expect(page.getByText("Test SC Account").first()).toBeVisible({ timeout: 5000 });

    // Open the dropdown and verify the second account is listed
    await page.getByTestId("account-switcher-trigger").click();
    await expect(page.getByText("Test VC Account").first()).toBeVisible({ timeout: 5000 });
  });
});
