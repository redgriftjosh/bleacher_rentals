import { test, expect, type Page } from "@playwright/test";

// Seeded in supabase/seed.sql: a Lakeland, Florida driver (USA — so the medical
// card applies) with all three documents already uploaded.
const USA_DRIVER_USER_UUID = "e44cdd00-6fde-46f2-869f-7a854f013e0c";
// Seeded without a home address, so the medical card is not required for them.
const NO_ADDRESS_DRIVER_USER_UUID = "129c8f2c-bce1-4a21-9e79-666938eb6027";

const driverSetupUrl = (userUuid: string) => `/team/${userUuid}/edit/driver`;

/**
 * The Driver Setup fields render before `loadExistingUser` resolves, so a save
 * fired too early fails validation on a still-empty name. The phone number is
 * only populated from the loaded Drivers row, which makes it a reliable signal
 * that the form actually holds this driver's data. Generous timeout: the first
 * hit compiles the route and may go through a Clerk handshake redirect.
 */
async function gotoLoadedDriverSetup(page: Page, userUuid: string) {
  await page.goto(driverSetupUrl(userUuid));
  await expect(page.getByRole("heading", { name: "Document Uploads" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.locator('input[type="tel"]')).not.toHaveValue("", { timeout: 60_000 });
}

test.describe("Driver Setup — document uploads (admin)", () => {
  test("shows a card per document with a preview and an expiry field", async ({ page }) => {
    await gotoLoadedDriverSetup(page, USA_DRIVER_USER_UUID);

    for (const label of ["Driver's License", "Insurance", "Medical Card"]) {
      await expect(page.getByLabel(`${label} expiry date`)).toBeVisible();
      await expect(page.getByLabel(`Replace ${label}`)).toBeAttached();
    }

    // Each card links out to the stored file it is previewing. (The seeded paths
    // are not in local storage, so the thumbnail itself falls back to a file
    // chip — DriverDocumentCard.test.tsx covers the image case.)
    for (const stored of [
      /^license_\d+\.jpg$/,
      /^insurance_\d+\.jpg$/,
      /^medical_card_\d+\.jpg$/,
    ]) {
      await expect(page.getByRole("link", { name: stored })).toBeVisible();
    }
  });

  test("saves an expiry date and reloads it", async ({ page }) => {
    await gotoLoadedDriverSetup(page, USA_DRIVER_USER_UUID);

    // Far enough out that the badge reads "Valid" rather than counting down.
    await page.getByLabel("Driver's License expiry date").fill("2030-06-15");
    await page.getByRole("button", { name: "Save Changes" }).click();
    // Don't reload until the write has actually landed.
    await expect(page.getByText("User updated successfully")).toBeVisible();

    await gotoLoadedDriverSetup(page, USA_DRIVER_USER_UUID);
    await expect(page.getByLabel("Driver's License expiry date")).toHaveValue("2030-06-15");
    await expect(page.getByText("Valid").first()).toBeVisible();
  });

  test("flags a date in the past as expired", async ({ page }) => {
    await gotoLoadedDriverSetup(page, USA_DRIVER_USER_UUID);

    await page.getByLabel("Insurance expiry date").fill("2020-01-01");

    await expect(page.getByText(/^Expired \d+ days ago$/)).toBeVisible();
  });

  test("clears a date back to empty", async ({ page }) => {
    await gotoLoadedDriverSetup(page, USA_DRIVER_USER_UUID);

    const expiry = page.getByLabel("Medical Card expiry date");
    await expiry.fill("2029-02-02");
    await expiry.fill("");

    await expect(expiry).toHaveValue("");
    await expect(page.getByText("No expiry date").first()).toBeVisible();
  });

  test("replaces the medical card with a not-required notice outside the USA", async ({ page }) => {
    await page.goto(driverSetupUrl(NO_ADDRESS_DRIVER_USER_UUID));

    await expect(page.getByRole("heading", { name: "Document Uploads" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText("Medical Card not required")).toBeVisible();
    await expect(page.getByLabel("Medical Card expiry date")).toHaveCount(0);

    // The two universally-required documents still get full cards.
    await expect(page.getByLabel("Driver's License expiry date")).toBeVisible();
    await expect(page.getByLabel("Insurance expiry date")).toBeVisible();
  });
});
