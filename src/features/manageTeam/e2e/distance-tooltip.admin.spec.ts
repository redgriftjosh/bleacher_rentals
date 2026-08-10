import { test } from "@playwright/test";
import { gotoDashboard, setTooltip, expectTooltipChecked } from "./helpers/dashboardOptions";

/**
 * Distance Tooltip option: toggle, persistence, and mutual exclusivity with the
 * Address Tooltip. Hovering the PixiJS canvas to render the tooltip itself is covered
 * by unit tests (resolveAddress) — it is not deterministic enough to assert in E2E.
 */
test.describe("Distance Tooltip option (admin)", () => {
  // These tests all mutate the same user's DashboardFilterSettings row, so they must
  // not run in parallel against each other.
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await gotoDashboard(page);
    // Reset to a known state: both tooltips off.
    await setTooltip(page, "Show Address Tooltip", false);
    await setTooltip(page, "Show Distance Tooltip", false);
  });

  test("toggles on and off and persists across reload", async ({ page }) => {
    await setTooltip(page, "Show Distance Tooltip", true);
    await expectTooltipChecked(page, "Show Distance Tooltip", true);

    // Persisted to DashboardFilterSettings → survives a reload. Allow extra time for
    // the user context to re-resolve after reload before the value reflects.
    await page.reload();
    await gotoDashboard(page);
    await expectTooltipChecked(page, "Show Distance Tooltip", true, 60_000);

    await setTooltip(page, "Show Distance Tooltip", false);
    await expectTooltipChecked(page, "Show Distance Tooltip", false);
  });

  test("enabling Distance disables Address", async ({ page }) => {
    await setTooltip(page, "Show Address Tooltip", true);
    await expectTooltipChecked(page, "Show Address Tooltip", true);

    await setTooltip(page, "Show Distance Tooltip", true);
    await expectTooltipChecked(page, "Show Distance Tooltip", true);
    await expectTooltipChecked(page, "Show Address Tooltip", false);
  });

  test("enabling Address disables Distance", async ({ page }) => {
    await setTooltip(page, "Show Distance Tooltip", true);
    await expectTooltipChecked(page, "Show Distance Tooltip", true);

    await setTooltip(page, "Show Address Tooltip", true);
    await expectTooltipChecked(page, "Show Address Tooltip", true);
    await expectTooltipChecked(page, "Show Distance Tooltip", false);
  });

  test("both can be off at once", async ({ page }) => {
    await setTooltip(page, "Show Distance Tooltip", true);
    await expectTooltipChecked(page, "Show Distance Tooltip", true);

    await setTooltip(page, "Show Distance Tooltip", false);
    await expectTooltipChecked(page, "Show Distance Tooltip", false);
    await expectTooltipChecked(page, "Show Address Tooltip", false);
  });
});
