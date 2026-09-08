import { test, expect, type Page } from "@playwright/test";

/**
 * The Type selector always offers exactly the 3 fixed types, and picking one
 * toggles the Details tab between Trip's split Pickup/Dropoff layout and
 * everything else's single generic field set. See
 * docs/specs/work-tracker-fixed-types.md.
 *
 * Anchored on the Monday of the current week because the work tracker demo
 * data in seed.sql is generated relative to CURRENT_DATE.
 */

function mondayOfThisWeek(): string {
  const now = new Date();
  const dayFromMonday = (now.getUTCDay() + 6) % 7;
  const monday = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - dayFromMonday),
  );
  return monday.toISOString().slice(0, 10);
}

// Opens the Type dropdown and picks `name`, waiting for the menu to fully
// close before returning — Radix's close animation/unmount otherwise races
// the next `.click()` on the trigger and the reopen is silently swallowed.
async function selectType(page: Page, name: string) {
  await page.getByTestId("work-tracker-type-select-trigger").click();
  const menu = page.getByRole("menu");
  await menu.getByRole("menuitem", { name, exact: true }).click();
  await expect(menu).toBeHidden();
}

test.describe("Work tracker type selector (admin)", () => {
  test("offers exactly the 3 fixed types and toggles the field layout between them", async ({
    page,
  }) => {
    const monday = mondayOfThisWeek();

    await page.goto(`/work-trackers/${monday}`);
    const driverRow = page.getByRole("row", { name: /E2E Driver/ });
    await expect(driverRow).toBeVisible({ timeout: 30_000 });
    await driverRow.click();

    await expect(page).toHaveURL(new RegExp(`/work-trackers/${monday}/.+`), { timeout: 30_000 });

    const tripRow = page.locator("tbody tr").first();
    await expect(tripRow).toBeVisible({ timeout: 30_000 });
    await tripRow.click();

    // Scoped to the modal — the weekly driver list behind it has its own
    // "Time" column headers that would otherwise collide with these
    // assertions.
    const modal = page.getByTestId("work-tracker-modal");
    await expect(modal.getByTestId("work-tracker-type-select-trigger")).toBeVisible({
      timeout: 15_000,
    });

    // The seeded demo trip may already be on a legacy (no-code) type left over
    // in seed.sql — getSelectableWorkTrackerTypes correctly appends that as a
    // 4th "currently selected" option rather than hiding it, so the menu can
    // briefly show 4 here, and one of those legacy rows is even named "Trip"
    // too (an old un-migrated duplicate), so "Trip" alone can be ambiguous
    // right now. "Repair / Maintenance" (the final, spaced label) only ever
    // matches the one real canonical row, so use it to normalize onto a
    // canonical type first — the *next* time the menu opens it's back to
    // exactly 3, with "Trip" unambiguous from then on.
    await selectType(page, "Repair / Maintenance");

    // Now: exactly the 3 fixed types, never more, regardless of what else is
    // in the DB.
    await page.getByTestId("work-tracker-type-select-trigger").click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem")).toHaveCount(3);
    await expect(menu.getByRole("menuitem", { name: "Trip", exact: true })).toBeVisible();
    await expect(
      menu.getByRole("menuitem", { name: "Repair / Maintenance", exact: true }),
    ).toBeVisible();
    await expect(
      menu.getByRole("menuitem", { name: "Site Visit / Cleaning / Other", exact: true }),
    ).toBeVisible();
    await menu.getByRole("menuitem", { name: "Trip", exact: true }).click();
    await expect(menu).toBeHidden();

    // Trip: separate Pickup/Dropoff sections.
    await expect(modal.getByText("Pickup Time", { exact: true })).toBeVisible();
    await expect(modal.getByText("Dropoff Time", { exact: true })).toBeVisible();
    await expect(modal.getByText("Time", { exact: true })).toHaveCount(0);

    // Repair / Maintenance: Pickup section gone, generic single field set.
    await selectType(page, "Repair / Maintenance");
    await expect(modal.getByText("Pickup Time", { exact: true })).toHaveCount(0);
    await expect(modal.getByText("Dropoff Time", { exact: true })).toHaveCount(0);
    await expect(modal.getByText("Time", { exact: true })).toBeVisible();
    await expect(modal.getByText("Address", { exact: true })).toBeVisible();
    await expect(modal.getByText("Setup Required", { exact: true })).toBeVisible();
    await expect(modal.getByText("Teardown Required", { exact: true })).toBeVisible();

    // Site Visit / Cleaning / Other: same single-field-set layout.
    await selectType(page, "Site Visit / Cleaning / Other");
    await expect(modal.getByText("Pickup Time", { exact: true })).toHaveCount(0);
    await expect(modal.getByText("Time", { exact: true })).toBeVisible();

    // Switching back to Trip restores the split layout.
    await selectType(page, "Trip");
    await expect(modal.getByText("Pickup Time", { exact: true })).toBeVisible();
    await expect(modal.getByText("Dropoff Time", { exact: true })).toBeVisible();
  });
});
