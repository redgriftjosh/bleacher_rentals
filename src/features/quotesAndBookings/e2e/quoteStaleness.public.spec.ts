import { test, expect } from "@playwright/test";
import {
  createQuote,
  bumpLineItemPrice,
  assignTerms,
  activeSignatureCount,
  cleanupQuote,
  CreatedQuote,
} from "./helpers/quoteTestData";

// Public, anonymous page — no storageState (see the `anon` project in playwright.config.ts).
// Timings are shortened with dev-only query params (?pollMs / ?idleMs) so the REAL timers,
// fetches, hashes and modals are exercised quickly. Nothing is stubbed. See spec §14.

const loaded = (invoiceNumber: number) => new RegExp(`E2E Staleness ${invoiceNumber}`);

test.describe("Public quote — staleness & presence", () => {
  test("shows the update modal when the quote changes", async ({ page }) => {
    let quote: CreatedQuote | null = null;
    try {
      quote = await createQuote();
      await page.goto(`/quote/${quote.invoiceNumber}?pollMs=400`);
      await expect(page.getByText(loaded(quote.invoiceNumber)).first()).toBeVisible();
      await expect(page.getByText("This quote has been updated")).toHaveCount(0);

      // Manager edits the price → trigger recomputes content_hash → next poll detects it.
      await bumpLineItemPrice(quote.eventId);

      await expect(page.getByText("This quote has been updated")).toBeVisible();
      await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();
    } finally {
      if (quote) await cleanupQuote(quote.eventId);
    }
  });

  test("does NOT show the update modal when nothing changes", async ({ page }) => {
    let quote: CreatedQuote | null = null;
    try {
      quote = await createQuote();
      await page.goto(`/quote/${quote.invoiceNumber}?pollMs=400`);
      await expect(page.getByText(loaded(quote.invoiceNumber)).first()).toBeVisible();

      await page.waitForTimeout(2500); // several real poll cycles, no DB change
      await expect(page.getByText("This quote has been updated")).toHaveCount(0);
    } finally {
      if (quote) await cleanupQuote(quote.eventId);
    }
  });

  test("prompts 'Are you still here?' after the idle threshold", async ({ page }) => {
    let quote: CreatedQuote | null = null;
    try {
      quote = await createQuote();
      await page.goto(`/quote/${quote.invoiceNumber}?idleMs=1500`);
      await expect(page.getByText(loaded(quote.invoiceNumber)).first()).toBeVisible();
      await expect(page.getByText("Are you still here?")).toHaveCount(0);

      await expect(page.getByText("Are you still here?")).toBeVisible({ timeout: 10_000 });
      await page.getByRole("button", { name: "Yes" }).click();
      await expect(page.getByText("Are you still here?")).toHaveCount(0);
    } finally {
      if (quote) await cleanupQuote(quote.eventId);
    }
  });

  test("pauses polling while inactive and resumes on focus", async ({ page }) => {
    let quote: CreatedQuote | null = null;
    try {
      quote = await createQuote();
      let versionCalls = 0;
      page.on("request", (r) => {
        if (r.url().includes("/version")) versionCalls++;
      });

      await page.goto(`/quote/${quote.invoiceNumber}?pollMs=400`);
      await expect(page.getByText(loaded(quote.invoiceNumber)).first()).toBeVisible();

      // Active → polls fire.
      await expect.poll(() => versionCalls, { timeout: 5_000 }).toBeGreaterThan(0);

      // Blur → inactive → no further polls.
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
      const afterBlur = versionCalls;
      await page.waitForTimeout(1500);
      expect(versionCalls).toBe(afterBlur);

      // Focus → immediate resume poll.
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expect.poll(() => versionCalls, { timeout: 5_000 }).toBeGreaterThan(afterBlur);
    } finally {
      if (quote) await cleanupQuote(quote.eventId);
    }
  });

  test("sign-time guard: signing a changed quote is rejected and records no signature", async ({
    page,
  }) => {
    let quote: CreatedQuote | null = null;
    let termsId: string | undefined;
    try {
      quote = await createQuote();
      termsId = await assignTerms(quote.eventId);

      await page.goto(`/quote/${quote.invoiceNumber}`);
      await page.getByRole("button", { name: "Signed Contract" }).click();
      // Tabs stay mounted (hidden), so scope to the visible signer input.
      await page.locator('input[placeholder="Full name"]:visible').fill("Jane Client");

      // Manager changes a contract-material field after the client loaded the page.
      await bumpLineItemPrice(quote.eventId);

      await page.getByRole("button", { name: "Sign Contract" }).click();

      // Server returns 409 → shared update modal, and NO active signature is created.
      await expect(page.getByText("This quote has been updated")).toBeVisible();
      expect(await activeSignatureCount(quote.eventId)).toBe(0);
    } finally {
      if (quote) await cleanupQuote(quote.eventId, termsId);
    }
  });
});
