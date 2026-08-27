import { test, expect } from "@playwright/test";

/**
 * /driver-satisfaction as an admin.
 *
 * The page reads from the local PowerSync database rather than from an API, so
 * the first thing every test has to do is wait for rows to arrive — an empty
 * table here means "not synced yet", not "no data". `waitForRows` is that wait,
 * and it is why the assertions below are about relationships between numbers
 * rather than fixed values: the seed can grow without this file going stale.
 *
 * What is worth pinning down:
 *
 *  * the four KPI tiles agree with the table beneath them;
 *  * "needs a follow-up" and "with a written reason" describe the same
 *    answers — that equivalence is the entire return on making the survey
 *    undismissable, and it silently breaks if the page's band threshold and the
 *    question's `follow_up_max_score` ever drift apart;
 *  * the filters actually narrow the table;
 *  * the trend chart renders a point per month.
 */

const PAGE = "/driver-satisfaction";

/** Wait for PowerSync to deliver rows into the table. */
async function waitForRows(page: import("@playwright/test").Page) {
  await expect(page.getByText("Driver Satisfaction").first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 60_000 });
}

const rowCount = (page: import("@playwright/test").Page) => page.locator("tbody tr").count();

/** The number rendered in a StatTile, by its label. */
async function tileValue(page: import("@playwright/test").Page, label: string) {
  const tile = page
    .locator("div")
    .filter({ hasText: new RegExp(`^${label}$`) })
    .last();
  const card = tile.locator("xpath=ancestor-or-self::div[contains(@class,'rounded')][1]");
  return (await card.innerText()).trim();
}

test.describe("Driver Satisfaction (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test("renders the page, its four tiles and the answers table", async ({ page }) => {
    await waitForRows(page);

    await expect(page.getByText("What drivers say about the app")).toBeVisible();
    for (const label of ["Average score", "Needs a follow-up", "Promoters", "Drivers heard from"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    for (const header of ["Driver", "Score", "Question", "What they said", "Submitted", "App"]) {
      await expect(page.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
    }

    expect(await rowCount(page)).toBeGreaterThan(0);
  });

  test("the average tile shows a real score, not the empty dash", async ({ page }) => {
    await waitForRows(page);

    const average = await tileValue(page, "Average score");
    // "7.2" style, one decimal — and never the "—" the page shows for no data.
    expect(average).toMatch(/\d+\.\d/);
    expect(average).not.toContain("—");
  });

  test("the scored-answers hint matches the number of rows in the table", async ({ page }) => {
    await waitForRows(page);

    const rows = await rowCount(page);
    const tile = await tileValue(page, "Average score");
    const scored = Number(tile.match(/(\d+) scored answers/)?.[1]);

    expect(scored).toBe(rows);
  });

  test("'needs a follow-up' counts exactly the answers the filter shows", async ({ page }) => {
    await waitForRows(page);

    const tile = await tileValue(page, "Needs a follow-up");
    const detractors = Number(tile.match(/^\D*(\d+)/m)?.[1] ?? tile.match(/(\d+)/)?.[1]);

    await page.getByRole("combobox").last().selectOption("detractors");
    await expect(page.locator("tbody tr")).toHaveCount(detractors);
  });

  test("every low score carries a written reason — the point of the survey", async ({ page }) => {
    await waitForRows(page);

    // "6 and below" and "With a written reason" must select the same answers:
    // the app refuses to submit a low score without one.
    await page.getByRole("combobox").last().selectOption("detractors");
    const lowScores = await rowCount(page);

    await page.getByRole("combobox").last().selectOption("with_reason");
    const withReason = await rowCount(page);

    expect(lowScores).toBeGreaterThan(0);
    expect(withReason).toBeGreaterThanOrEqual(lowScores);

    // And each low-score row really has text in "What they said".
    await page.getByRole("combobox").last().selectOption("detractors");
    const reasons = await page.locator("tbody tr td:nth-child(4)").allInnerTexts();
    for (const reason of reasons) {
      expect(reason.trim()).not.toBe("");
      expect(reason.trim()).not.toBe("—");
    }
  });

  test("the filter narrows the table and 'All answers' restores it", async ({ page }) => {
    await waitForRows(page);
    const all = await rowCount(page);

    await page.getByRole("combobox").last().selectOption("detractors");
    const filtered = await rowCount(page);
    expect(filtered).toBeLessThan(all);

    await page.getByRole("combobox").last().selectOption("all");
    await expect(page.locator("tbody tr")).toHaveCount(all);
  });

  test("the trend chart renders a point for each month with answers", async ({ page }) => {
    await waitForRows(page);

    await expect(page.getByText("Average score by month")).toBeVisible();
    // Scoped to the recharts surface: the StatTile icons are svgs too, and the
    // page's first <svg> is one of them.
    const dots = page.locator(".recharts-line-dots circle");
    await expect(dots.first()).toBeVisible({ timeout: 30_000 });
    // One marker per month bucket; the seed spans several months.
    expect(await dots.count()).toBeGreaterThan(1);

    // The empty state must not be showing alongside a populated chart.
    await expect(page.getByText("No answers yet")).toHaveCount(0);
  });

  test("scores are shown with their severity colour", async ({ page }) => {
    await waitForRows(page);

    await page.getByRole("combobox").last().selectOption("detractors");
    // Low scores are the red band — the visual cue the page is scanned for.
    await expect(page.locator("tbody tr td .bg-red-100").first()).toBeVisible();
  });

  test("the page is reachable from the Scorecard menu", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByText("Scorecard", { exact: true }).first().click();
    await page.getByRole("link", { name: "Driver Satisfaction" }).click();
    await expect(page).toHaveURL(new RegExp(`${PAGE}$`));
    await waitForRows(page);
  });
});
