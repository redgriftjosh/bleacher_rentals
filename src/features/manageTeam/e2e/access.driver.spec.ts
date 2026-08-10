import { test, expect } from "@playwright/test";

test.describe("Web access (driver)", () => {
  test("driver-only user is blocked from the web app", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Welcome, Driver!" })).toBeVisible({
      timeout: 60_000,
    });
  });
});
