import { test, expect, type Page } from "@playwright/test";

// Seeded in supabase/seed.sql: a Lakeland, Florida driver with a full profile
// and a tax rate of 0.
const DRIVER_USER_UUID = "e44cdd00-6fde-46f2-869f-7a854f013e0c";

const driverSetupUrl = `/team/${DRIVER_USER_UUID}/edit/driver`;

/**
 * The pay fields render before the driver's row arrives, and the form keeps
 * re-hydrating from PowerSync afterwards — a value typed too early is replaced
 * by the loaded one. The phone number only comes from that row, which makes it
 * a reliable "this form holds real data now" signal.
 */
async function gotoLoadedDriverSetup(page: Page) {
  await page.goto(driverSetupUrl);
  await expect(page.getByRole("heading", { name: "Document Uploads" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.locator('input[type="tel"]')).not.toHaveValue("", { timeout: 60_000 });
}

test.describe("Driver Setup — tax rate (admin)", () => {
  test("saves a three-decimal rate and reloads it", async ({ page }) => {
    await gotoLoadedDriverSetup(page);

    // Quebec's combined rate. The integer column this replaced stored it as 14,
    // which is why the field, the write and the column all had to change.
    const tax = page.getByLabel("Tax rate percent");
    await tax.fill("14.975");
    await expect(tax).toHaveValue("14.975%");

    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("User updated successfully")).toBeVisible();

    await gotoLoadedDriverSetup(page);
    await expect(page.getByLabel("Tax rate percent")).toHaveValue("14.975%", { timeout: 60_000 });

    // The rate is deliberately left on the row, the way driver-documents leaves
    // an expiry date: nothing else in the suite reads this driver's tax, and
    // restoring it here is unreliable — see the note in the spec doc about the
    // form re-hydrating over an unsaved edit.
  });
});
