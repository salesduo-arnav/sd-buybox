import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders the hero section with both CTAs", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /see when you're losing sales on amazon/i }),
    ).toBeVisible();

    await expect(
      page.getByText(/a simple way to understand when your products aren't shown/i),
    ).toBeVisible();

    await expect(page.getByTestId("landing-cta-primary")).toBeVisible();
    await expect(page.getByTestId("landing-cta-secondary")).toBeVisible();
  });

  test("renders the dashboard preview centerpiece", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("landing-dashboard-preview")).toBeVisible();
    await expect(page.getByText(/sales missed/i)).toBeVisible();
    await expect(page.getByText(/products affected/i)).toBeVisible();
  });

  test("renders the four feature cards", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /visibility to customers/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /reason for sales loss/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /cheaper seller detection/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /missed sales estimate/i }),
    ).toBeVisible();
  });

  test("renders the How It Works section with three steps", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /^how it works$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /track products/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /understand issues/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /monitor impact/i })).toBeVisible();
  });

  test("CTAs link to /overview", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("landing-cta-primary")).toHaveAttribute("href", "/overview");
    await expect(page.getByTestId("landing-cta-secondary")).toHaveAttribute("href", "/overview");
  });

  test("does not render the app sidebar shell", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("nav-overview")).toHaveCount(0);
    await expect(page.getByTestId("nav-products")).toHaveCount(0);
  });
});
