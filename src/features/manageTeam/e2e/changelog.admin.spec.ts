import { test, expect } from "@playwright/test";

// Seeded in supabase/seed.sql: 1.0.0 (2026-01-01) and 1.1.0 (2026-02-01).
const OLDER = "1.0.0";
const NEWER = "1.1.0";

test.describe("Changelog (admin)", () => {
  test("renders seeded releases newest first", async ({ page }) => {
    await page.goto("/changelog");

    const entries = page.getByTestId("changelog-entry");
    await expect(entries.first()).toBeVisible();

    // Newest release must come first.
    await expect(entries.first()).toHaveAttribute("data-version", NEWER);
    await expect(entries.nth(1)).toHaveAttribute("data-version", OLDER);
  });

  test("renders markdown as HTML, not literal characters", async ({ page }) => {
    await page.goto("/changelog");

    const newest = page
      .getByTestId("changelog-entry")
      .filter({ has: page.locator("h2") })
      .first();
    await expect(newest).toBeVisible();

    // "## Second release" becomes a heading, "- Newer bullet" becomes a list item.
    await expect(page.getByRole("heading", { name: /Second release/ })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Newer bullet" })).toBeVisible();

    // The raw markdown syntax must not survive into the rendered text.
    await expect(page.getByText("## Second release", { exact: true })).toHaveCount(0);
    await expect(page.getByText("- Newer bullet", { exact: true })).toHaveCount(0);
  });

  test("emoji in release notes render", async ({ page }) => {
    await page.goto("/changelog");
    await expect(page.getByRole("heading", { name: /🎉/ })).toBeVisible();
  });

  test("unread indicator clears after visiting and stays cleared", async ({ page }) => {
    // Land somewhere else first so the sidebar renders without marking as read.
    await page.goto("/dashboard");

    const indicator = page.getByTestId("sidebar-unread-indicator");
    const changelogLink = page.getByRole("link", { name: /What's New/ });

    // The seeded user has never opened the page, and releases exist.
    await expect(indicator).toBeVisible();

    await changelogLink.click();
    await expect(page).toHaveURL(/\/changelog/);
    await expect(page.getByTestId("changelog-page")).toBeVisible();

    // Marking as read is a local write; the dot should go away without a reload.
    await expect(indicator).toHaveCount(0);

    // And it must stay gone once the write has synced.
    await page.goto("/dashboard");
    await expect(page.getByTestId("sidebar")).toBeVisible();
    await expect(indicator).toHaveCount(0);
  });
});
