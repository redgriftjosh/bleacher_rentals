import { test, expect, type Page } from "@playwright/test";
import {
  readContactByName,
  findContactByLastName,
  deleteContacts,
} from "./helpers/contactTestData";

/**
 * Preflight tests 1 and 2 for release 1.6.0.
 *
 * The viewer CARRIES OUT the forbidden action and the test then reads Postgres
 * to see whether it landed. Asserting that a button is hidden would prove far
 * less: hiding the button later would turn such a test green while the write
 * path stayed open. The failure has to be "the row changed", not "the control
 * was visible" — and here the screen actively lies, showing a success toast for
 * a write the server goes on to reject.
 *
 * See preflight/1.6.0.md.
 */

const PREFIX = "Preflight";

/**
 * TextField renders <label> and <input> as siblings with no htmlFor/id between
 * them, so getByLabel cannot find these fields (an accessibility gap in its own
 * right — it is on the preflight human list). Address the input by its label's
 * adjacency instead.
 */
const field = (page: Page, label: string) => page.locator(`label:has-text("${label}") + input`);

/** Long enough to read the state on the recording before the next step moves on. */
const BEAT = 800;
const HOLD = 2500;

test.afterAll(async () => {
  await deleteContacts(PREFIX);
});

test.describe("Companies & Contacts access (viewer)", () => {
  test("viewer cannot create a contact", async ({ page }) => {
    test.info().annotations.push({ type: "role", description: "viewer — read-only" });
    test.info().annotations.push({
      type: "proves",
      description:
        "A viewer's contact insert never reaches Postgres. The page shows success anyway, so only the stored row settles it.",
    });

    const lastName = `${PREFIX} Created ${Date.now()}`;

    await test.step("Open the Contacts tab as a viewer", async () => {
      await page.goto("/companies-contacts");
      await page.getByRole("tab", { name: "Contacts" }).click();
      await page.waitForTimeout(BEAT);
    });

    await test.step("Open the New Contact form", async () => {
      await page.getByRole("button", { name: "New Contact" }).click();
      await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(BEAT);
    });

    await test.step("Fill in a name and an email", async () => {
      await field(page, "First Name").fill("Viewer");
      await field(page, "Last Name").fill(lastName);
      await field(page, "Email").fill("viewer-should-not@example.com");
      await test.info().attach("form filled in", {
        body: await page.screenshot(),
        contentType: "image/png",
      });
      await page.waitForTimeout(BEAT);
    });

    await test.step("Save — the page will say it worked", async () => {
      await page.getByRole("button", { name: "Save Contact" }).click();
      await page.waitForTimeout(HOLD);
      await test.info().attach("what the viewer sees after saving", {
        body: await page.screenshot(),
        contentType: "image/png",
      });
    });

    await test.step("Read Postgres — this is the judge, not the toast", async () => {
      const row = await findContactByLastName(lastName);
      await test.info().attach("contact row in Postgres after save", {
        body: JSON.stringify(row ?? null, null, 2),
        contentType: "application/json",
      });

      if (row) {
        await test.info().attach("what went wrong", {
          body:
            `Expected no row: a viewer is read-only, and row-level security on ` +
            `Contacts admits only admin and account_manager for INSERT. ` +
            `A row was written instead, so the block is gone.`,
          contentType: "text/plain",
        });
      }
      expect(row, "a viewer created a contact").toBeNull();
    });
  });

  test("viewer cannot change a contact's quote language", async ({ page }) => {
    test.info().annotations.push({ type: "role", description: "viewer — read-only" });
    test.info().annotations.push({
      type: "proves",
      description:
        "Contacts.preferred_language is unchanged after a viewer edits and saves it — the field that decides which language a client's quote is sent in.",
    });

    let name = "";
    let before: Awaited<ReturnType<typeof readContactByName>> = null;

    await test.step("Open the first contact in the list", async () => {
      await page.goto("/companies-contacts");
      await page.getByRole("tab", { name: "Contacts" }).click();

      // Use a contact already synced to this client rather than seeding one — a
      // row inserted straight into Postgres has to travel through PowerSync
      // first, and waiting on that would test the sync, not the permission.
      //
      // Skip anything a preflight spec created: the admin spec edits its own
      // contacts, and if both specs grabbed the same row the admin's write would
      // be blamed on the viewer. That exact collision happened once.
      const row = page.locator("tbody tr").filter({ hasNotText: PREFIX }).first();
      await expect(row).toBeVisible({ timeout: 30_000 });
      name = (await row.locator("td").first().innerText()).trim();
      await row.click();
      await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(BEAT);
    });

    await test.step("Switch the contact to edit mode", async () => {
      before = await readContactByName(name);
      await test.info().attach("stored value before the edit", {
        body: JSON.stringify(before ?? null, null, 2),
        contentType: "application/json",
      });
      await page.getByRole("button", { name: "Edit" }).click();
      await page.waitForTimeout(BEAT);
    });

    await test.step("Change the quote language and save", async () => {
      const current = before?.preferred_language === "french" ? "French" : "English";
      const target = current === "French" ? "English" : "French";

      await page.getByRole("dialog").first().getByText(current, { exact: true }).click();
      await page.waitForTimeout(BEAT);
      await page.getByText(target, { exact: true }).click();
      await test.info().attach("language switched in the form", {
        body: await page.screenshot(),
        contentType: "image/png",
      });
      await page.waitForTimeout(BEAT);

      await page.getByRole("button", { name: "Save" }).click();
      await page.waitForTimeout(HOLD);
    });

    await test.step("Read Postgres — the stored language must not have moved", async () => {
      const after = await readContactByName(name);
      await test.info().attach("stored value after the edit", {
        body: JSON.stringify(after ?? null, null, 2),
        contentType: "application/json",
      });

      if (after?.preferred_language !== before?.preferred_language) {
        await test.info().attach("what went wrong", {
          body:
            `Expected preferred_language to stay "${before?.preferred_language}". ` +
            `It is now "${after?.preferred_language}", so a read-only role changed ` +
            `the language a client's quote is sent in.`,
          contentType: "text/plain",
        });
      }
      expect(after?.preferred_language, "a viewer changed the quote language").toBe(
        before?.preferred_language,
      );
    });
  });
});
