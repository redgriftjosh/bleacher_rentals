import { test, expect } from "@playwright/test";
import {
  openFirstOpenDamageReportCard,
  showResolvedReports,
  waitForDamageReportsLoaded,
} from "./helpers/damageReportsPage";

test.describe("Damage Reports (admin)", () => {
  test("lists page and resolve flow UI", async ({ page }) => {
    await page.goto("/damage-reports");
    await waitForDamageReportsLoaded(page);

    const opened = await openFirstOpenDamageReportCard(page);
    if (opened) {
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("button", { name: "Create Maintenance to Resolve" }),
      ).toBeVisible();
      await expect(dialog.getByText("Resolved", { exact: true })).not.toBeVisible();
      await page.keyboard.press("Escape");
    }

    await showResolvedReports(page);
    const resolvedCard = page.locator(".border-gray-200").filter({ hasText: "Resolved" }).first();
    if (await resolvedCard.isVisible().catch(() => false)) {
      await resolvedCard.click();
      await expect(
        page.getByRole("dialog").getByText("Resolved — linked to a maintenance event."),
      ).toBeVisible();
    }
  });
});
