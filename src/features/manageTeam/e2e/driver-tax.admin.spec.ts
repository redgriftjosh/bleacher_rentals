import { test, expect, type Page } from "@playwright/test";

// Seeded in supabase/seed.sql: a Lakeland, Florida driver with a full profile.
const DRIVER_USER_UUID = "e44cdd00-6fde-46f2-869f-7a854f013e0c";

const driverSetupUrl = `/team/${DRIVER_USER_UUID}/edit/driver`;

/**
 * The pay fields render before the driver's row arrives, and a value typed too
 * early is replaced by the loaded one. The phone number only comes from that
 * row, which makes it a reliable "this form holds real data now" signal.
 */
async function gotoLoadedDriverSetup(page: Page) {
  await page.goto(driverSetupUrl);
  await expect(page.getByRole("heading", { name: "Document Uploads" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.locator('input[type="tel"]')).not.toHaveValue("", { timeout: 60_000 });
}

/**
 * Types the rate the way a person does.
 *
 * Not `fill()`: the field is controlled and re-formats on every keystroke (it
 * owns the trailing "%"), and a one-shot `fill` on it silently leaves the old
 * value in place.
 */
async function typeTaxRate(page: Page, percent: string) {
  const tax = page.getByLabel("Tax rate percent");
  await tax.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type(percent);
  await expect(tax).toHaveValue(`${percent}%`);
}

test.describe("Driver Setup — tax rate (admin)", () => {
  test("saves a three-decimal rate and reloads it", async ({ page }) => {
    await gotoLoadedDriverSetup(page);

    // Quebec's combined rate. The integer column this replaced stored it as 14,
    // which is why the field, the write and the column all had to change.
    await typeTaxRate(page, "14.975");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("User updated successfully")).toBeVisible();

    await gotoLoadedDriverSetup(page);
    await expect(page.getByLabel("Tax rate percent")).toHaveValue("14.975%", { timeout: 60_000 });

    // The rate is left on the row, the way driver-documents leaves an expiry
    // date behind: nothing else in the suite reads this driver's tax, and
    // `npx supabase db reset` puts the seed back.
  });

  test("caps the fraction at three digits and clamps above 100", async ({ page }) => {
    await gotoLoadedDriverSetup(page);

    const tax = page.getByLabel("Tax rate percent");

    await tax.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("9.87654");
    await expect(tax).toHaveValue("9.876%");

    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("250");
    await expect(tax).toHaveValue("100%");

    // Nothing is saved here, so the seeded rate is left as it was found.
  });
});
