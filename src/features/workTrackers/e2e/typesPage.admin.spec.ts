import { test, expect } from "@playwright/test";

/**
 * /work-tracker-types replaced the old free-form EditWorkTrackerTypesModal —
 * it shows exactly the 3 fixed types (no add/rename/delete) and lets an admin
 * assign a QuickBooks account per connection for each. See
 * docs/specs/work-tracker-fixed-types.md.
 */

test.describe("Work tracker types page (admin)", () => {
  test("shows exactly the 3 fixed types with no way to add or remove one", async ({ page }) => {
    await page.goto("/work-tracker-types");

    await expect(page.getByRole("heading", { name: "Work Tracker Types" })).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.getByText("Trip", { exact: true })).toBeVisible();
    await expect(page.getByText("Repair / Maintenance", { exact: true })).toBeVisible();
    await expect(page.getByText("Site Visit / Cleaning / Other", { exact: true })).toBeVisible();

    // No free-form type management left on this page.
    await expect(page.getByRole("button", { name: /add type/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /delete/i })).toHaveCount(0);
    await expect(page.locator('input[placeholder="Type name"]')).toHaveCount(0);
  });
});
