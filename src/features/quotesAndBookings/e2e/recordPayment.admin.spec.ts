import { test, expect } from "@playwright/test";

// Seeded in supabase/seed.sql: a booked quote with two $2,700 installments, the
// first already paid by Stripe.
const QUOTE = "85b35a1c-8992-41c5-b051-409f33ee7fc5";
const BILLING = `/quotes-bookings/${QUOTE}?tab=billing`;

/**
 * Manual payment entry, end to end — the part that could never be tested before,
 * because a Stripe payment needs a redirect and a card and this one does not.
 *
 * docs/specs/manual-payment-entry.md §7 (S1, S3), §10.
 */

test.describe("Record Payment (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BILLING);
    await expect(page.getByRole("heading", { name: "Payment History" })).toBeVisible();
  });

  test("S1: records a check against an installment and closes it", async ({ page }) => {
    await page.getByRole("button", { name: "+ Record Payment" }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await page.getByLabel(/^Amount/).fill("2,700.00");
    await page.getByLabel("Check #").fill("1041");

    // The second installment — the first is already settled by the seeded
    // Stripe payment.
    await page.getByLabel("Apply To").selectOption({ index: 2 });

    await page.getByRole("button", { name: "Record Payment", exact: true }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("1041")).toBeVisible();
    // Both installments now settled: $5,400 of $5,400.
    await expect(page.getByText("$5,400.00").first()).toBeVisible();
  });

  test("S3: a negative amount reverses it, and says so before it is sent", async ({ page }) => {
    await page.getByRole("button", { name: "+ Record Payment" }).click();

    await page.getByLabel(/^Amount/).fill("-2,700.00");

    // The dialog must make it unmistakable that this is money going out.
    await expect(page.getByText(/records money going/i)).toBeVisible();
    const submit = page.getByRole("button", { name: "Record Refund / Adjustment" });
    await expect(submit).toBeVisible();

    await page.getByLabel("Check #").fill("1041 NSF");
    await submit.click();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("-$2,700.00")).toBeVisible();
  });

  test("S6: zero is refused and cannot be sent", async ({ page }) => {
    await page.getByRole("button", { name: "+ Record Payment" }).click();

    await page.getByLabel(/^Amount/).fill("0");

    await expect(page.getByText(/cannot be zero/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Record Payment", exact: true })).toBeDisabled();
  });

  test("a recorded payment offers no way to edit or delete it", async ({ page }) => {
    await expect(page.getByText(/record a negative amount/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Delete payment/ })).toHaveCount(0);
  });
});
