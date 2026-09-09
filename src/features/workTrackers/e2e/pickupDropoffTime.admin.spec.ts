import { test, expect } from "@playwright/test";

/**
 * Pickup/dropoff time is one of three deliberate states — Exact, Flexible, or
 * Any Time — with no timezone or date involved (plain wall-clock text
 * everyone reads the same). This covers setting Flexible on pickup, saving,
 * reloading, and reading the value back from both the modal and the trip
 * list. See docs/specs/work-tracker-pickup-dropoff-time.md.
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

test.describe("Pickup/dropoff time picker (admin)", () => {
  test("setting Flexible on pickup persists across a reload and shows on the trip list", async ({
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

    const modal = page.getByTestId("work-tracker-modal");
    await expect(modal.getByTestId("pickup-time-mode-flexible")).toBeVisible({ timeout: 15_000 });

    await modal.getByTestId("pickup-time-mode-flexible").click();
    await modal.getByTestId("pickup-time-start").fill("09:00");
    await modal.getByTestId("pickup-time-end").fill("11:30");

    await modal.getByRole("button", { name: "Save" }).click();
    // Saving closes (or settles) the modal; a fresh reload is the least
    // brittle way to assert the value actually round-tripped through Postgres
    // rather than only living in local component state.
    await page.reload();

    const tripRowAfterReload = page.locator("tbody tr").first();
    await expect(tripRowAfterReload).toContainText("09:00 AM - 11:30 AM", { timeout: 30_000 });

    await tripRowAfterReload.click();
    await expect(modal.getByTestId("pickup-time-mode-flexible")).toHaveAttribute(
      "aria-checked",
      "true",
      { timeout: 15_000 },
    );
    await expect(modal.getByTestId("pickup-time-start")).toHaveValue("09:00");
    await expect(modal.getByTestId("pickup-time-end")).toHaveValue("11:30");
  });
});
