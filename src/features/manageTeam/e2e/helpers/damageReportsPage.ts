import { expect, type Page } from "@playwright/test";

/** Wait for PowerSync-backed damage reports list to finish loading. */
export async function waitForDamageReportsLoaded(page: Page) {
  await expect(page.getByRole("heading", { name: "Damage Reports" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole("button", { name: "Create Damage Report" })).toBeVisible({
    timeout: 60_000,
  });
  const spinner = page.locator(".border-t-darkBlue.animate-spin");
  await spinner.waitFor({ state: "hidden", timeout: 120_000 }).catch(() => undefined);
}

export async function openFirstOpenDamageReportCard(page: Page) {
  const openCard = page.locator(".border-red-300.bg-red-50\\/30").first();
  const hasOpen = await openCard.isVisible().catch(() => false);
  if (!hasOpen) return false;
  await openCard.click();
  await expect(page.getByRole("dialog").getByText("Edit Damage Report")).toBeVisible({
    timeout: 15_000,
  });
  return true;
}

export async function showResolvedReports(page: Page) {
  const toggle = page.getByRole("button", { name: /Showing Open/i });
  if (await toggle.isVisible()) {
    await toggle.click();
    await expect(page.getByRole("button", { name: /Showing Resolved/i })).toBeVisible();
  }
}
