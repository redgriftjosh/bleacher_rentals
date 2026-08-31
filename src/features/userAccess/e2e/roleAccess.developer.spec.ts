import { test, expect } from "@playwright/test";

/**
 * Preflight test 3 for release 1.6.0.
 *
 * The developer role existed in determineAccess but had no Playwright session
 * until this release, so nothing ever checked what it can reach. Per
 * permissionPageData.ts, a developer sees the product roadmap and nothing else:
 * "Unable to even access the pages where they can see work trackers".
 *
 * Expected to PASS — this asserts the code already behaves.
 */

test.describe("Role access (developer)", () => {
  test("developer is kept out of operational pages", async ({ page }) => {
    for (const path of ["/companies-contacts", "/work-trackers"]) {
      // A client-side redirect aborts the navigation. That is a refusal, not an
      // error — swallow it and judge on where we ended up.
      await page.goto(path).catch(() => {});

      await expect
        .poll(
          async () => {
            const onPage = page.url().includes(path);
            const heading = await page
              .getByRole("heading", { name: /Companies & Contacts|Work Trackers/ })
              .count();
            return onPage && heading > 0;
          },
          { timeout: 30_000, message: `developer reached ${path}` },
        )
        .toBe(false);
    }
  });
});
