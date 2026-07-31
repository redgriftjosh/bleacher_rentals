import { test, expect } from "@playwright/test";

// E2E Driver user (seeded in supabase/seed.sql). The seeded AM manages "Zone 1" but the
// driver is intentionally NOT in it, so the driver profile opens in "zones-only" mode.
const DRIVER_USER_UUID = "cb6b755e-53b1-41ae-b4ea-aa412c1ce951";
const ZONE_NAME = "Zone 1";
const ZONES_ONLY_BANNER = /only assign this driver to your zones/i;

test.describe("Driver zones assignment (account manager)", () => {
  test("adding an out-of-zone driver to a zone unlocks and saves the other fields in one submit", async ({
    page,
  }) => {
    await page.goto(`/team/${DRIVER_USER_UUID}/edit/driver`);

    // The driver is outside the AM's zones → form opens locked, only zones editable.
    await expect(page.getByText(ZONES_ONLY_BANNER)).toBeVisible();

    const phone = page.getByPlaceholder("(123) 456-7890");
    await expect(phone).toBeVisible();

    // Assign the driver to the AM's zone.
    await page.getByText("Select zones...").click();
    await page.getByRole("option", { name: ZONE_NAME }).click();
    await page.keyboard.press("Escape");

    // Sharing a zone flips access to full → the lock banner disappears.
    await expect(page.getByText(ZONES_ONLY_BANNER)).toHaveCount(0);

    // Edit a field that was locked a moment ago, then save everything together.
    const newPhone = "(555) 010-2034";
    await phone.fill(newPhone);
    await page.getByRole("button", { name: /Save Changes/i }).click();
    await page.waitForURL("**/team");

    // Reopen: both the zone AND the phone edit must have persisted.
    await page.goto(`/team/${DRIVER_USER_UUID}/edit/driver`);
    await expect(page.getByText(ZONES_ONLY_BANNER)).toHaveCount(0);
    await expect(page.getByText(ZONE_NAME)).toBeVisible();
    await expect(page.getByPlaceholder("(123) 456-7890")).toHaveValue(newPhone);
  });
});
