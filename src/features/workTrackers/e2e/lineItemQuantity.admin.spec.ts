import { test, expect } from "@playwright/test";

/**
 * A line item quantity is a decimal: half a day of setup, 2.5 hours of
 * maintenance. It is stored in `qty_decimal`; the integer `quantity` column is
 * a deprecated mirror the database keeps updated for shipped driver-app builds.
 *
 * This walks the seam the change actually moved — the Qty field in the work
 * tracker's Line Items tab — and checks the value survives a save and a reload,
 * which it can only do if it reached `qty_decimal` and came back from it.
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

test.describe("Work tracker line items — decimal quantity (admin)", () => {
  test("stores and reloads a fractional quantity", async ({ page }) => {
    const monday = mondayOfThisWeek();

    // Weekly list → the seeded E2E driver → that driver's trip list. Picking the
    // driver by name rather than by position skips the filter-control row that
    // sits at the top of the same tbody.
    await page.goto(`/work-trackers/${monday}`);
    const driverRow = page.getByRole("row", { name: /E2E Driver/ });
    await expect(driverRow).toBeVisible({ timeout: 30_000 });
    await driverRow.click();

    await expect(page).toHaveURL(new RegExp(`/work-trackers/${monday}/.+`), { timeout: 30_000 });

    // Opening a trip opens the work tracker modal.
    const tripRow = page.locator("tbody tr").first();
    await expect(tripRow).toBeVisible({ timeout: 30_000 });
    await tripRow.click();

    await page.getByRole("tab", { name: "Line Items" }).click();

    // Add a new custom line rather than editing the first one: the Hauling and
    // Deadhead lines at the top are recalculated from the trip's pay breakdown
    // every time the modal opens, so a quantity typed into them is transient by
    // design and would make this a test of the wrong thing.
    const newQty = page.getByLabel("New line item quantity");
    await expect(newQty).toBeVisible({ timeout: 15_000 });

    await newQty.fill("");
    await newQty.pressSequentially("2.5");
    await expect(newQty).toHaveValue("2.5");

    await page.getByRole("button", { name: "Add", exact: true }).click();

    // The added line is the last row, and its Qty field carries the decimal.
    const addedQty = page.getByLabel("Quantity", { exact: true }).last();
    await expect(addedQty).toHaveValue("2.5");

    // Saving is gated on a *work tracker field* having changed: line items are
    // not part of the change snapshot, so a line-item-only edit is refused with
    // "No changes to save." (pre-existing, and not what this spec is about).
    // Touching Internal Notes makes the save legitimate.
    await page.getByRole("tab", { name: "Details" }).click();
    await page.getByPlaceholder("Internal Notes").fill(`qty spec ${Date.now()}`);

    await page.getByRole("button", { name: "Save", exact: true }).click();

    // Saving may route through the status-change confirmation dialog. `isVisible`
    // does not retry, so wait for the dialog before asking.
    const confirm = page.getByRole("button", { name: "Confirm Save" });
    await confirm.waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
    if (await confirm.isVisible()) await confirm.click();

    // The modal closes only after the save resolves — without this the reload
    // below could race an unfinished write and silently prove nothing.
    await expect(page.getByRole("tab", { name: "Line Items" })).toBeHidden({ timeout: 30_000 });

    // Reopen from a cold load: the value can only come back from qty_decimal.
    await page.reload();
    const reloadedTrip = page.locator("tbody tr").first();
    await expect(reloadedTrip).toBeVisible({ timeout: 30_000 });
    await reloadedTrip.click();
    await page.getByRole("tab", { name: "Line Items" }).click();

    await expect(page.getByLabel("Quantity", { exact: true }).last()).toHaveValue("2.5", {
      timeout: 15_000,
    });
  });
});
