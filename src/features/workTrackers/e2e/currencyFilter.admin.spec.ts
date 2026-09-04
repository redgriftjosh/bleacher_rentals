import { test, expect } from "@playwright/test";

/**
 * The weekly driver list can be narrowed to one pay currency, so an account
 * manager settling up in CAD is not scrolling past US drivers (and vice versa).
 *
 * Anchored on the Monday of the current week because the work tracker demo data
 * in seed.sql is generated relative to CURRENT_DATE.
 */

function mondayOfThisWeek(): string {
  const now = new Date();
  const dayFromMonday = (now.getUTCDay() + 6) % 7;
  const monday = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - dayFromMonday),
  );
  return monday.toISOString().slice(0, 10);
}

const PAY_IN_CAD = /\$[\d,.]+\s+CAD/;
const PAY_IN_USD = /\$[\d,.]+\s+USD/;

test.describe("Work tracker weekly driver list — currency filter (admin)", () => {
  test("narrows the driver list to the selected pay currency", async ({ page }) => {
    await page.goto(`/work-trackers/${mondayOfThisWeek()}`);

    const filter = page.getByLabel("Currency:");
    await expect(filter).toBeVisible({ timeout: 30_000 });

    // Unfiltered, the seeded week has drivers paid in both currencies.
    await expect(page.getByText(PAY_IN_CAD).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(PAY_IN_USD).first()).toBeVisible();

    await filter.selectOption("CAD");
    await expect(page.getByText(PAY_IN_CAD).first()).toBeVisible();
    await expect(page.getByText(PAY_IN_USD)).toHaveCount(0);

    await filter.selectOption("USD");
    await expect(page.getByText(PAY_IN_USD).first()).toBeVisible();
    await expect(page.getByText(PAY_IN_CAD)).toHaveCount(0);

    await filter.selectOption("ALL");
    await expect(page.getByText(PAY_IN_CAD).first()).toBeVisible();
    await expect(page.getByText(PAY_IN_USD).first()).toBeVisible();
  });
});
