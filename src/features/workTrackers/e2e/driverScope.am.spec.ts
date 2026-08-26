import { test, expect } from "@playwright/test";

/**
 * Preflight test 5 for release 1.6.0.
 *
 * Drivers are no longer attached to an account manager directly — both are
 * attached to zones, and a driver is "mine" when we share one (driverZoneScope.ts).
 * The seed deliberately leaves the E2E driver OUT of the AM's zone, so an AM must
 * not see them in the work tracker driver list.
 *
 * Expected to PASS.
 */

test.describe("Work tracker driver list (account manager)", () => {
  test("account manager sees only drivers sharing a zone", async ({ page }) => {
    await page.goto("/work-trackers");

    // The seeded driver is in no zone the AM holds — see seed.sql, AccountManagerZones.
    await expect(page.getByText("E2E Driver")).toHaveCount(0, { timeout: 30_000 });
  });
});
