import { expect, type Page } from "@playwright/test";

/**
 * Helpers for driving the dashboard "Options" Radix Menubar.
 *
 * Tooltip toggles write through PowerSync-backed settings, which only persist once the
 * user context has synced. Early clicks are silently no-ops, so `setTooltip` polls —
 * re-clicking through the sync warm-up until the reactive `aria-checked` matches.
 */

type TooltipName = "Show Address Tooltip" | "Show Distance Tooltip";

const ANCHOR = "Show Address Tooltip"; // always present; used to detect an open menu
// Generous: a fresh E2E context does a cold PowerSync sync (~30s) before the user
// context resolves and settings writes start to persist.
const SETTLE_TIMEOUT = 90_000;

export async function gotoDashboard(page: Page) {
  await page.goto("/dashboard");
  // Cold dashboard render can be slow, so allow well past the default expect timeout.
  await expect(page.getByRole("menuitem", { name: "Options" })).toBeVisible({ timeout: 60_000 });
}

async function openMenu(page: Page) {
  await page.getByRole("menuitem", { name: "Options" }).click();
  await expect(page.getByRole("menuitemcheckbox", { name: ANCHOR })).toBeVisible();
}

async function closeMenu(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menuitemcheckbox", { name: ANCHOR })).toBeHidden();
}

async function readChecked(page: Page, name: TooltipName): Promise<boolean> {
  const value = await page.getByRole("menuitemcheckbox", { name }).getAttribute("aria-checked");
  return value === "true";
}

/**
 * Drive a tooltip to the desired checked state, retrying clicks until it sticks
 * (tolerates the PowerSync sync warm-up during which writes are no-ops).
 */
export async function setTooltip(page: Page, name: TooltipName, desired: boolean) {
  await expect
    .poll(
      async () => {
        await openMenu(page);
        const checked = await readChecked(page, name);
        if (checked === desired) {
          await closeMenu(page);
        } else {
          await page.getByRole("menuitemcheckbox", { name }).click(); // toggles + closes menu
        }
        return checked;
      },
      { timeout: SETTLE_TIMEOUT },
    )
    .toBe(desired);
}

/** Assert (with auto-retry) a tooltip's checked state, then close the menu. */
export async function expectTooltipChecked(
  page: Page,
  name: TooltipName,
  checked: boolean,
  timeout?: number,
) {
  await openMenu(page);
  await expect(page.getByRole("menuitemcheckbox", { name })).toHaveAttribute(
    "aria-checked",
    checked ? "true" : "false",
    timeout ? { timeout } : undefined,
  );
  await closeMenu(page);
}
