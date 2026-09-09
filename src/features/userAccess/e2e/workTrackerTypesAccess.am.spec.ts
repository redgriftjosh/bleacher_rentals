import { test, expect } from "@playwright/test";

/**
 * /work-tracker-types is admin-only (accessConfig.ts, useSidebarItems.ts) — it
 * assigns the QuickBooks account for each of the 3 fixed work tracker types,
 * which per permissionPageData.ts an account manager should not be able to
 * see or touch. See docs/specs/work-tracker-fixed-types.md.
 *
 * Expected to PASS — this asserts the code already behaves.
 */

test.describe("Work tracker types page access (account manager)", () => {
  test("account manager is kept out of /work-tracker-types", async ({ page }) => {
    // A client-side redirect aborts the navigation. That is a refusal, not an
    // error — swallow it and judge on where we ended up.
    await page.goto("/work-tracker-types").catch(() => {});

    await expect
      .poll(
        async () => {
          const onPage = page.url().includes("/work-tracker-types");
          const heading = await page.getByRole("heading", { name: "Work Tracker Types" }).count();
          return onPage && heading > 0;
        },
        { timeout: 30_000, message: "account manager reached /work-tracker-types" },
      )
      .toBe(false);
  });
});
