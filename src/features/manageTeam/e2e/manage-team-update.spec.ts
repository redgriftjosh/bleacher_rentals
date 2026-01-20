import { test, expect } from "@playwright/test";
import { STATUSES } from "../constants";
import {
  cleanupE2EUserByEmail,
  getAccountManagerByUserUuid,
  getDriverByUserUuid,
  getSupabaseAdmin,
  isSupabaseE2EConfigured,
  makeE2EEmail,
  pickUnassignedBleachers,
  waitForUserByEmail,
  getBleachersByIds,
} from "./utils/supabaseAdmin";

test.describe.configure({ mode: "serial" });

test.describe("Manage Team updates", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/invite", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "e2e-invite-stub" }),
      });
    });
  });

  test("Disabling Driver/Account Manager updates DB and UI", async ({ page }) => {
    test.skip(!isSupabaseE2EConfigured(), "Supabase admin env vars not set");

    const supabase = getSupabaseAdmin();
    const email = makeE2EEmail("e2e-update");

    const [summerBleacher] = await pickUnassignedBleachers({ supabase, season: "summer", limit: 1 });
    const [winterBleacher] = await pickUnassignedBleachers({ supabase, season: "winter", limit: 1 });

    test.skip(!summerBleacher || !winterBleacher, "No unassigned bleachers available to test with");

    try {
      // Create user with Driver + Account Manager roles.
      await page.goto("/team");
      await page.getByRole("button", { name: "+ Add Team Member" }).click();

      await page.locator("#firstName").fill("E2E");
      await page.locator("#lastName").fill("Update");
      await page.locator("#email").fill(email);

      await page.getByRole("button", { name: "Make Driver" }).click();
      await page.locator('input[placeholder="0%"]').first().fill("7");
      await page.locator("#payRate").fill("9.99");

      await page.getByRole("button", { name: "Make Account Manager" }).click();

      // Summer
      await page.getByTestId("manage-team-summer-bleachers").click();
      await page.getByPlaceholder("Search bleacher number...").fill(String(summerBleacher.bleacher_number));
      await page.getByRole("button", { name: new RegExp(`#${summerBleacher.bleacher_number}\\b`) }).click();
      await page.keyboard.press("Escape");

      // Winter
      await page.getByTestId("manage-team-winter-bleachers").click();
      await page.getByPlaceholder("Search bleacher number...").fill(String(winterBleacher.bleacher_number));
      await page.getByRole("button", { name: new RegExp(`#${winterBleacher.bleacher_number}\\b`) }).click();
      await page.keyboard.press("Escape");

      await page.getByRole("button", { name: "Send Invite" }).click();

      const user = await waitForUserByEmail({ supabase, email });
      expect(user.status_uuid).toBe(STATUSES.invited);

      const driverBefore = await getDriverByUserUuid({ supabase, userUuid: user.id });
      expect(driverBefore?.is_active).toBe(true);

      const amBefore = await getAccountManagerByUserUuid({ supabase, userUuid: user.id });
      expect(amBefore?.is_active).toBe(true);

      // UI: open edit modal from Drivers tab
      await page.getByRole("button", { name: "Drivers" }).click();
      await page.getByPlaceholder("Search by name or email...").fill(email);
      const driverRowEmail = page.locator("tbody").getByText(email);
      await expect(driverRowEmail).toBeVisible({ timeout: 90_000 });
      await driverRowEmail.click();

      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("button", { name: "Update User" })).toBeVisible();

      // Disable driver role
      await page.getByRole("button", { name: "Driver" }).click();
      await page.getByRole("button", { name: "Update User" }).click();

      const driverAfter = await getDriverByUserUuid({ supabase, userUuid: user.id });
      expect(driverAfter).not.toBeNull();
      expect(driverAfter?.is_active).toBe(false);

      // UI should no longer show in Drivers tab
      await page.getByRole("button", { name: "Drivers" }).click();
      await page.getByPlaceholder("Search by name or email...").fill(email);
      await expect(page.locator("tbody").getByText(email)).toHaveCount(0, { timeout: 90_000 });

      // UI: open edit modal from Account Managers tab
      await page.getByRole("button", { name: "Account Managers" }).click();
      await page.getByPlaceholder("Search by name or email...").fill(email);
      const amRowEmail = page.locator("tbody").getByText(email);
      await expect(amRowEmail).toBeVisible({ timeout: 90_000 });
      await amRowEmail.click();

      await expect(page.getByRole("dialog")).toBeVisible();

      // Disable account manager role
      await page.getByRole("button", { name: "Account Manager" }).click();
      await page.getByRole("button", { name: "Update User" }).click();

      const amAfter = await getAccountManagerByUserUuid({ supabase, userUuid: user.id });
      expect(amAfter).not.toBeNull();
      expect(amAfter?.is_active).toBe(false);

      // Bleachers should be unassigned for this AM
      const bleachers = await getBleachersByIds({ supabase, ids: [summerBleacher.id, winterBleacher.id] });
      const summerRow = bleachers.find((b) => b.id === summerBleacher.id);
      const winterRow = bleachers.find((b) => b.id === winterBleacher.id);

      expect(summerRow?.summer_account_manager_uuid).toBeNull();
      expect(winterRow?.winter_account_manager_uuid).toBeNull();

      // UI should no longer show in Account Managers tab
      await page.getByRole("button", { name: "Account Managers" }).click();
      await page.getByPlaceholder("Search by name or email...").fill(email);
      await expect(page.locator("tbody").getByText(email)).toHaveCount(0, { timeout: 90_000 });
    } finally {
      await cleanupE2EUserByEmail({ supabase, email });
    }
  });
});
