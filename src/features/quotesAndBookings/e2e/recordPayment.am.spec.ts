import { test, expect } from "@playwright/test";

const QUOTE = "85b35a1c-8992-41c5-b051-409f33ee7fc5";
const BILLING = `/quotes-bookings/${QUOTE}?tab=billing`;

/**
 * S13 — a lead account manager may record a payment on a quote they did not
 * create.
 *
 * **The seeded E2E account manager is a lead** (`AccountManagerZones.is_lead`
 * is true on the row added for driver-zones.am.spec.ts), so this project
 * exercises S13 and not S8. If this ever starts failing with a disabled button,
 * check that seed row before changing anything here — the rule is that a lead
 * edits everything, and `canEditOwnedEntity` decides it for every control on
 * the page, not just this one.
 *
 * S8 — the junior AM who may not — has no e2e home until a second, non-lead
 * account manager is seeded. It is covered in BillingTab.test.tsx, where lead
 * status is an input rather than a fixture.
 *
 * docs/specs/manual-payment-entry.md §6.1, §7, §10.
 */

test.describe("Record Payment (lead account manager)", () => {
  test("S13: the button is offered on someone else's quote", async ({ page }) => {
    await page.goto(BILLING);
    await expect(page.getByRole("heading", { name: "Payment History" })).toBeVisible();

    const button = page.getByRole("button", { name: "+ Record Payment" });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });

  test("S13: and the payment they record is attributed to them", async ({ page }) => {
    await page.goto(BILLING);

    await page.getByRole("button", { name: "+ Record Payment" }).click();
    await page.getByRole("button", { name: "ACH Payment" }).click();
    await page.getByLabel(/^Amount/).fill("500");
    await page.getByLabel("ACH trace").fill("TRACE-77");
    await page.getByRole("button", { name: "Record Payment", exact: true }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("TRACE-77")).toBeVisible();
    await expect(page.getByText("E2E AM")).toBeVisible();
  });
});
