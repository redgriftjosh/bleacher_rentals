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

test.describe("Manage Team DB + UI", () => {
  test.beforeEach(async ({ page }) => {
    // For these tests we focus on DB writes & UI rendering.
    // Avoid sending real invitation emails (we already have invite-email.spec.ts for that).
    await page.route("**/api/invite", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "e2e-invite-stub" }),
      });
    });
  });

  test("Create admin inserts Users row and shows in Admins list", async ({ page }) => {
    test.skip(!isSupabaseE2EConfigured(), "Supabase admin env vars not set");

    const supabase = getSupabaseAdmin();
    const email = makeE2EEmail("e2e-admin");

    try {
      await page.goto("/team");
      await page.getByRole("button", { name: "+ Add Team Member" }).click();

      await page.locator("#firstName").fill("E2E");
      await page.locator("#lastName").fill("Admin");
      await page.locator("#email").fill(email);
      await page.locator("#isAdmin").check();

      await page.getByRole("button", { name: "Send Invite" }).click();

      const user = await waitForUserByEmail({ supabase, email });
      expect(user.email).toBe(email.toLowerCase());
      expect(user.first_name).toBe("E2E");
      expect(user.last_name).toBe("Admin");
      expect(user.is_admin).toBe(true);
      expect(user.status_uuid).toBe(STATUSES.invited);

      const driver = await getDriverByUserUuid({ supabase, userUuid: user.id });
      expect(driver).toBeNull();

      const am = await getAccountManagerByUserUuid({ supabase, userUuid: user.id });
      expect(am).toBeNull();

      // UI: should appear in Admins list
      await page.getByPlaceholder("Search by name or email...").fill(email);
      await expect(page.getByText(email)).toBeVisible({ timeout: 90_000 });
      await expect(page.getByText("Pending")).toBeVisible();
    } finally {
      await cleanupE2EUserByEmail({ supabase, email });
    }
  });

  test("Create driver inserts Drivers row and shows in Drivers list", async ({ page }) => {
    test.skip(!isSupabaseE2EConfigured(), "Supabase admin env vars not set");

    const supabase = getSupabaseAdmin();
    const email = makeE2EEmail("e2e-driver");

    try {
      await page.goto("/team");
      await page.getByRole("button", { name: "+ Add Team Member" }).click();

      await page.locator("#firstName").fill("E2E");
      await page.locator("#lastName").fill("Driver");
      await page.locator("#email").fill(email);

      await page.getByRole("button", { name: "Make Driver" }).click();

      // Tax (InputPercents)
      await page.locator('input[placeholder="0%"]').first().fill("5");

      // Pay Rate
      await page.locator("#payRate").fill("12.34");

      await page.getByRole("button", { name: "Send Invite" }).click();

      const user = await waitForUserByEmail({ supabase, email });
      expect(user.is_admin).toBe(false);
      expect(user.status_uuid).toBe(STATUSES.invited);

      const driver = await getDriverByUserUuid({ supabase, userUuid: user.id });
      expect(driver).not.toBeNull();
      expect(driver?.is_active).toBe(true);
      expect(driver?.tax).toBe(5);
      expect(driver?.pay_rate_cents).toBe(1234);
      expect(driver?.pay_currency).toBe("CAD");
      expect(driver?.pay_per_unit).toBe("KM");

      const am = await getAccountManagerByUserUuid({ supabase, userUuid: user.id });
      expect(am).toBeNull();

      // UI: Drivers tab shows the new driver
      await page.getByRole("button", { name: "Drivers" }).click();
      await page.getByPlaceholder("Search by name or email...").fill(email);
      await expect(page.getByText(email)).toBeVisible({ timeout: 90_000 });
      await expect(page.getByText("Pending")).toBeVisible();
      await expect(page.getByText("$12.34")).toBeVisible();
    } finally {
      await cleanupE2EUserByEmail({ supabase, email });
    }
  });

  test("Create account manager assigns selected bleachers", async ({ page }) => {
    test.skip(!isSupabaseE2EConfigured(), "Supabase admin env vars not set");

    const supabase = getSupabaseAdmin();
    const email = makeE2EEmail("e2e-am");

    // Pick bleachers that are currently unassigned so we don't fight seed data.
    const [summerBleacher] = await pickUnassignedBleachers({
      supabase,
      season: "summer",
      limit: 1,
    });
    const [winterBleacher] = await pickUnassignedBleachers({
      supabase,
      season: "winter",
      limit: 1,
    });

    test.skip(!summerBleacher || !winterBleacher, "No unassigned bleachers available to test with");

    try {
      await page.goto("/team");
      await page.getByRole("button", { name: "+ Add Team Member" }).click();

      await page.locator("#firstName").fill("E2E");
      await page.locator("#lastName").fill("Manager");
      await page.locator("#email").fill(email);

      await page.getByRole("button", { name: "Make Account Manager" }).click();

      // Summer bleachers: open the popover trigger, search, select
      await page.getByTestId("manage-team-summer-bleachers").click();
      await page
        .getByPlaceholder("Search bleacher number...")
        .fill(String(summerBleacher.bleacher_number));
      await page
        .getByRole("button", { name: new RegExp(`#${summerBleacher.bleacher_number}\\b`) })
        .click();
      await page.keyboard.press("Escape");

      // Winter bleachers
      await page.getByTestId("manage-team-winter-bleachers").click();
      await page
        .getByPlaceholder("Search bleacher number...")
        .fill(String(winterBleacher.bleacher_number));
      await page
        .getByRole("button", { name: new RegExp(`#${winterBleacher.bleacher_number}\\b`) })
        .click();
      await page.keyboard.press("Escape");

      await page.getByRole("button", { name: "Send Invite" }).click();

      const user = await waitForUserByEmail({ supabase, email });
      expect(user.status_uuid).toBe(STATUSES.invited);

      const am = await getAccountManagerByUserUuid({ supabase, userUuid: user.id });
      expect(am).not.toBeNull();
      expect(am?.is_active).toBe(true);

      // Verify bleachers updated to point at AccountManagers.id (not Users.id)
      const bleachers = await getBleachersByIds({
        supabase,
        ids: [summerBleacher.id, winterBleacher.id],
      });

      const summerRow = bleachers.find((b) => b.id === summerBleacher.id);
      const winterRow = bleachers.find((b) => b.id === winterBleacher.id);

      expect(summerRow?.summer_account_manager_uuid).toBe(am!.id);
      expect(winterRow?.winter_account_manager_uuid).toBe(am!.id);

      // UI: Account Managers tab shows new manager
      await page.getByRole("button", { name: "Account Managers" }).click();
      await page.getByPlaceholder("Search by name or email...").fill(email);
      await expect(page.getByText(email)).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText("Pending")).toBeVisible();
      await expect(page.getByText("No drivers")).toBeVisible();
    } finally {
      await cleanupE2EUserByEmail({ supabase, email });
    }
  });
});
