import { test, expect } from "@playwright/test";
import {
  daysFromToday,
  seedBleachersWithInspections,
  type InspectionFixture,
} from "./helpers/inspectionFixtures";

/**
 * The Maintainer role, end to end.
 *
 * This project only exists once E2E_MAINTAINER_EMAIL is configured (see
 * playwright.config.ts), so the file is inert until the Clerk user is created
 * and starts running the day it is.
 *
 * The write in the second test is the one that matters: it is the only proof
 * that RLS accepts a maintainer. PowerSync drops an RLS refusal silently, so a
 * broken policy looks exactly like a working one until the page is reloaded.
 *
 * Spec: docs/specs/maintainer-role.md §2.3, §7.5
 */
test.describe("Annual inspections (maintainer)", () => {
  let fixture: InspectionFixture | null = null;

  test.afterEach(async () => {
    await fixture?.cleanup();
    fixture = null;
  });

  test("lands on the queue and sees the fleet ordered by what is due soonest", async ({ page }) => {
    fixture = await seedBleachersWithInspections([daysFromToday(200), daysFromToday(-20)]);
    const [ok, overdue] = fixture.bleachers;

    await page.goto("/annual-inspections");

    const overdueRow = page.locator(
      `[data-testid=inspection-row][data-bleacher="${overdue.bleacherNumber}"]`,
    );
    await expect(overdueRow).toBeVisible({ timeout: 30_000 });
    await expect(overdueRow).toHaveAttribute("data-status", "overdue");

    const numbers = await page
      .locator("[data-testid=inspection-row]")
      .evaluateAll((rows) => rows.map((r) => (r as HTMLElement).dataset.bleacher));
    expect(numbers.indexOf(String(overdue.bleacherNumber))).toBeLessThan(
      numbers.indexOf(String(ok.bleacherNumber)),
    );
  });

  test("records an inspection that survives a reload — the write really reached the database", async ({
    page,
  }) => {
    fixture = await seedBleachersWithInspections([null]);
    const [bleacher] = fixture.bleachers;

    await page.goto("/annual-inspections");
    const row = page.locator(
      `[data-testid=inspection-row][data-bleacher="${bleacher.bleacherNumber}"]`,
    );
    await expect(row).toBeVisible({ timeout: 30_000 });
    await row.click();

    const nextDue = page.getByLabel("Next inspection due");
    await expect(nextDue).toBeVisible({ timeout: 15_000 });

    const typed = daysFromToday(300);
    await nextDue.fill(typed);
    await page.getByRole("button", { name: "Record inspection" }).click();

    await page.reload();
    await expect(row).toContainText(typed, { timeout: 30_000 });
    await expect(row).toHaveAttribute("data-status", "ok");
  });

  test("sees Quality Assurance with only the annual inspections under it", async ({ page }) => {
    await page.goto("/annual-inspections");

    await page.getByRole("button", { name: "Quality Assurance" }).click();
    await expect(page.getByRole("link", { name: "Annual Inspections" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("link", { name: "Damage Reports" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Repairs" })).toHaveCount(0);
  });
});
