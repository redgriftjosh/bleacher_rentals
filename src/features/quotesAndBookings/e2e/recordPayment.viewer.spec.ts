import { test, expect } from "@playwright/test";

const QUOTE = "85b35a1c-8992-41c5-b051-409f33ee7fc5";
const BILLING = `/quotes-bookings/${QUOTE}?tab=billing`;

/**
 * S9 — a viewer reads the ledger and is offered nothing to press.
 *
 * The button is absent rather than disabled: the RLS insert policy names only
 * admin and account_manager, so a viewer's write would be refused by the server
 * anyway, and a control that could never work is worse than no control.
 *
 * docs/specs/manual-payment-entry.md §6.1, §7, §10.
 */

test.describe("Record Payment (viewer)", () => {
  test("S9: the history is readable and the button is not there at all", async ({ page }) => {
    await page.goto(BILLING);

    await expect(page.getByRole("heading", { name: "Payment History" })).toBeVisible();

    // The seeded Stripe payment is fully visible…
    await expect(page.getByText("$2,700.00").first()).toBeVisible();
    await expect(page.getByText("Stripe").first()).toBeVisible();

    // …and there is nothing to press.
    await expect(page.getByRole("button", { name: "+ Record Payment" })).toHaveCount(0);
  });
});
