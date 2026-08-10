import { test, expect } from "@playwright/test";
import { waitForDamageReportsLoaded } from "./helpers/damageReportsPage";

test.describe("Damage Reports (account manager)", () => {
  test("can open damage reports page", async ({ page }) => {
    await page.goto("/damage-reports");
    await waitForDamageReportsLoaded(page);
    await expect(page.getByRole("button", { name: /Showing Open/i })).toBeVisible();
  });
});
