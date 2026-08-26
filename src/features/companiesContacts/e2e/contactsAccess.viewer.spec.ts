import { test, expect } from "@playwright/test";
import {
  readContactByName,
  findContactByLastName,
  deleteContacts,
} from "./helpers/contactTestData";

/**
 * Preflight tests 1 and 2 for release 1.6.0.
 *
 * THESE ARE EXPECTED TO FAIL TODAY. They document a real hole rather than
 * assuming it is not there.
 *
 * /companies-contacts is open to admin, account_manager AND viewer
 * (accessConfig.ts), but neither the page nor any of the six write functions
 * (createContact, updateContact, softDeleteContact and the company equivalents)
 * checks a role. A viewer can create, edit and delete contacts today — including
 * the Quote Language that decides which language a client's quote is sent in.
 *
 * That contradicts the viewer role's own definition in permissionPageData.ts:
 * "Read-only access to operational data. Cannot create, edit, or delete
 * anything."
 *
 * The viewer here CARRIES OUT the forbidden action and the test then reads the
 * database to see whether it landed. Asserting that a button is hidden would
 * prove far less: hiding the button later would turn such a test green while the
 * write path stayed wide open. The failure has to be "the row changed", not
 * "the control was visible".
 *
 * Confirmed a bug by the owner, 2026-08-26. The fix is a separate PR; when it
 * lands these tests turn green with no change. See preflight/1.6.0.md.
 */

const PREFIX = "Preflight";

/**
 * TextField renders <label> and <input> as siblings with no htmlFor/id between
 * them, so getByLabel cannot find these fields (an accessibility gap in its own
 * right — noted in the preflight human list). Address the input by its label's
 * adjacency instead.
 */
const field = (page: import("@playwright/test").Page, label: string) =>
  page.locator(`label:has-text("${label}") + input`);

test.afterAll(async () => {
  await deleteContacts(PREFIX);
});

test.describe("Companies & Contacts access (viewer)", () => {
  test("viewer cannot create a contact", async ({ page }) => {
    const lastName = `${PREFIX} Created ${Date.now()}`;

    await page.goto("/companies-contacts");
    await page.getByRole("tab", { name: "Contacts" }).click();

    await page.getByRole("button", { name: "New Contact" }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });

    await field(page, "First Name").fill("Viewer");
    await field(page, "Last Name").fill(lastName);
    await field(page, "Email").fill("viewer-should-not@example.com");

    await page.getByRole("button", { name: "Save Contact" }).click();

    // The database is the judge. A read-only role must not have written a row.
    await expect
      .poll(async () => (await findContactByLastName(lastName)) !== null, {
        timeout: 15_000,
        message: "viewer created a contact",
      })
      .toBe(false);
  });

  test("viewer cannot change a contact's quote language", async ({ page }) => {
    await page.goto("/companies-contacts");
    await page.getByRole("tab", { name: "Contacts" }).click();

    // Use a contact already synced to this client rather than seeding one — a row
    // inserted straight into Postgres has to travel through PowerSync first, and
    // waiting on that would test the sync, not the permission.
    const row = page.locator("tbody tr").first();
    await expect(row).toBeVisible({ timeout: 30_000 });
    const name = (await row.locator("td").first().innerText()).trim();
    await row.click();

    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Edit" }).click();

    const before = await readContactByName(name);
    const target = before?.preferred_language === "french" ? "English" : "French";
    const current = before?.preferred_language === "french" ? "French" : "English";

    await page.getByRole("dialog").getByText(current, { exact: true }).click();
    await page.getByText(target, { exact: true }).click();
    await page.getByRole("button", { name: "Save" }).click();

    // The stored value is the judge, not the toast.
    await expect
      .poll(async () => (await readContactByName(name))?.preferred_language, {
        timeout: 15_000,
        message: "viewer changed a contact's quote language",
      })
      .toBe(before?.preferred_language);
  });
});
