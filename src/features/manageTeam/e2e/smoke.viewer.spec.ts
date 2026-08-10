import { test, expect } from "@playwright/test";
import { waitForDamageReportsLoaded } from "./helpers/damageReportsPage";

test.describe("Smoke (viewer)", () => {
  test("viewer can open damage reports", async ({ page }) => {
    await page.goto("/damage-reports");
    await waitForDamageReportsLoaded(page);
  });
});
