import { test, expect } from "@playwright/test";

/**
 * A driver must not reach /driver-satisfaction.
 *
 * The page lists every driver's named score and the sentence they wrote to
 * explain it. The survey is deliberately not anonymous so the office can follow
 * up — which makes "the fleet cannot read each other's answers" a requirement
 * of the feature, not an incidental permission.
 *
 * The driver role has no web access at all, so the assertion is the same
 * blocked screen `access.driver.spec.ts` checks for — reached by asking for
 * this page directly.
 */

test.describe("Driver Satisfaction (driver)", () => {
  test("a driver asking for the page directly is blocked", async ({ page }) => {
    await page.goto("/driver-satisfaction");

    await expect(page.getByRole("heading", { name: "Welcome, Driver!" })).toBeVisible({
      timeout: 60_000,
    });

    // Nothing from the page itself leaked through.
    await expect(page.getByText("What drivers say about the app")).toHaveCount(0);
    await expect(page.locator("tbody tr")).toHaveCount(0);
  });
});
