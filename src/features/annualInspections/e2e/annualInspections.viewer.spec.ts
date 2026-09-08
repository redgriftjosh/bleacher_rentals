import { test, expect } from "@playwright/test";
import {
  daysFromToday,
  seedBleachersWithInspections,
  type InspectionFixture,
} from "./helpers/inspectionFixtures";

/**
 * A viewer reads the queue and cannot add to it. RLS refuses the write either
 * way (see supabase/tests/bleacher_annual_inspections.test.sql); this checks
 * they are never handed a form that would be refused — PowerSync drops an RLS
 * rejection silently, so an offered-then-discarded write is the worst version
 * of this bug.
 */
test.describe("Annual inspections (viewer)", () => {
  let fixture: InspectionFixture | null = null;

  test.afterEach(async () => {
    await fixture?.cleanup();
    fixture = null;
  });

  test("can read the queue but is offered no way to record an inspection", async ({ page }) => {
    fixture = await seedBleachersWithInspections([daysFromToday(3)]);
    const [bleacher] = fixture.bleachers;

    await page.goto("/annual-inspections");
    const row = page.locator(
      `[data-testid=inspection-row][data-bleacher="${bleacher.bleacherNumber}"]`,
    );
    await expect(row).toBeVisible({ timeout: 30_000 });
    await expect(row).toHaveAttribute("data-status", "critical");

    await row.click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Record inspection" })).toHaveCount(0);
    await expect(page.getByLabel("Next inspection due")).toHaveCount(0);
  });
});
