import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders the hero section with both CTAs", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /stop losing the buy box/i })
    ).toBeVisible();

    await expect(
      page.getByText(/track buy box ownership across every asin/i)
    ).toBeVisible();

    await expect(page.getByTestId("landing-cta-primary")).toBeVisible();
    await expect(page.getByTestId("landing-cta-secondary")).toBeVisible();
  });

  test("renders the four feature cards", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /visibility tracking/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /revenue impact/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /root-cause analysis/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /smart alerts/i })).toBeVisible();
  });

  test("CTAs link to /overview", async ({ page }) => {
    await page.goto("/");

    // Verify both CTAs route to /overview without exercising the redirect-on-unauth
    // flow that ProtectedRoute triggers (the actual auth wiring is covered by auth.spec.ts).
    await expect(page.getByTestId("landing-cta-primary")).toHaveAttribute("href", "/overview");
    await expect(page.getByTestId("landing-cta-secondary")).toHaveAttribute("href", "/overview");
  });

  test("does not render the app sidebar shell", async ({ page }) => {
    await page.goto("/");

    // Sidebar nav items live inside the app Layout, which the landing page does not use
    await expect(page.getByTestId("nav-overview")).toHaveCount(0);
    await expect(page.getByTestId("nav-products")).toHaveCount(0);
  });
});
