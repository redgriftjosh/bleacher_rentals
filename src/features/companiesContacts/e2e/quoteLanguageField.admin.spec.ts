import { test, expect, type Page } from "@playwright/test";
import { readContactByName, deleteContacts } from "./helpers/contactTestData";

/**
 * Preflight tests 6 and 7 for release 1.6.0.
 *
 * The Quote Language field has been silently dropped from these forms twice by
 * branch merges, each time leaving the database column and every quote surface
 * intact — so nothing failed, and new contacts just stayed English forever.
 * These tests set the field through the UI and read the stored value back.
 *
 * See preflight/1.6.0.md and docs/specs/quote-preferred-language.md.
 */

const PREFIX = "Preflight";
const field = (page: Page, label: string) => page.locator(`label:has-text("${label}") + input`);
const BEAT = 800;
const HOLD = 2500;

test.afterAll(async () => {
  await deleteContacts(PREFIX);
});

test.describe("Quote Language field (admin)", () => {
  test("admin can set a new contact to French, and it is stored", async ({ page }) => {
    test.info().annotations.push({ type: "role", description: "admin" });
    test.info().annotations.push({
      type: "proves",
      description:
        "Contacts.preferred_language is 'french' in Postgres after using the form — the field two merges have dropped.",
    });

    const lastName = `${PREFIX} French ${Date.now()}`;

    await test.step("Open the New Contact form", async () => {
      await page.goto("/companies-contacts");
      await page.getByRole("tab", { name: "Contacts" }).click();
      await page.getByRole("button", { name: "New Contact" }).click();
      await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(BEAT);
    });

    await test.step("Fill in the contact", async () => {
      await field(page, "First Name").fill("Preflight");
      await field(page, "Last Name").fill(lastName);
      await page.waitForTimeout(BEAT);
    });

    await test.step("Set Quote Language to French", async () => {
      await page.getByRole("dialog").first().getByText("English", { exact: true }).click();
      await page.waitForTimeout(BEAT);
      await page.getByText("French", { exact: true }).click();
      await test.info().attach("French selected in the form", {
        body: await page.screenshot(),
        contentType: "image/png",
      });
      await page.waitForTimeout(BEAT);
    });

    await test.step("Save, then read the stored language back", async () => {
      await page.getByRole("button", { name: "Save Contact" }).click();
      await page.waitForTimeout(HOLD);

      await expect
        .poll(async () => (await readContactByName(`Preflight ${lastName}`))?.preferred_language, {
          timeout: 20_000,
          message: "the contact's language never reached Postgres",
        })
        .toBe("french");

      const row = await readContactByName(`Preflight ${lastName}`);
      await test.info().attach("stored contact", {
        body: JSON.stringify(row ?? null, null, 2),
        contentType: "application/json",
      });
    });
  });

  test("admin can change an existing contact's language, and it persists on reopen", async ({
    page,
  }) => {
    test.info().annotations.push({ type: "role", description: "admin" });
    test.info().annotations.push({
      type: "proves",
      description:
        "The edit form saves preferred_language and shows it again when reopened — not just in the store, but in Postgres.",
    });

    let name = "";
    let before: Awaited<ReturnType<typeof readContactByName>> = null;

    await test.step("Open a contact and switch to edit", async () => {
      await page.goto("/companies-contacts");
      await page.getByRole("tab", { name: "Contacts" }).click();
      // Its own contact, addressed by name — never the first row, which another
      // spec may be measuring at the same moment.
      const row = page.locator("tbody tr").filter({ hasText: PREFIX }).first();
      await expect(row).toBeVisible({ timeout: 30_000 });
      name = (await row.locator("td").first().innerText()).trim();
      before = await readContactByName(name);
      await row.click();
      await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 15_000 });
      await page.getByRole("button", { name: "Edit" }).click();
      await page.waitForTimeout(BEAT);
    });

    const target = () => (before?.preferred_language === "french" ? "English" : "French");
    const expected = () => (before?.preferred_language === "french" ? "english" : "french");

    await test.step("Flip the language and save", async () => {
      const current = before?.preferred_language === "french" ? "French" : "English";
      await page.getByRole("dialog").first().getByText(current, { exact: true }).click();
      await page.waitForTimeout(BEAT);
      await page.getByText(target(), { exact: true }).click();
      await page.waitForTimeout(BEAT);
      await page.getByRole("button", { name: "Save" }).click();
      await page.waitForTimeout(HOLD);
    });

    await test.step("Confirm it was stored", async () => {
      await expect
        .poll(async () => (await readContactByName(name))?.preferred_language, {
          timeout: 20_000,
          message: "the language change never reached Postgres",
        })
        .toBe(expected());
      await test.info().attach("stored contact after the edit", {
        body: JSON.stringify((await readContactByName(name)) ?? null, null, 2),
        contentType: "application/json",
      });
    });

    await test.step("Reopen the contact — the form must show the new value", async () => {
      // The dialog's own X is also named "Close"; take the footer button.
      await page.getByRole("dialog").first().getByRole("button", { name: "Close" }).last().click();
      await page.locator("tbody tr").filter({ hasText: PREFIX }).first().click();
      await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("dialog").first()).toContainText(target());
      await test.info().attach("reopened contact", {
        body: await page.screenshot(),
        contentType: "image/png",
      });
      await page.waitForTimeout(HOLD);

      // Put it back so the run is repeatable.
      await page.getByRole("button", { name: "Edit" }).click();
      await page.getByRole("dialog").first().getByText(target(), { exact: true }).click();
      await page
        .getByText(before?.preferred_language === "french" ? "French" : "English", { exact: true })
        .click();
      await page.getByRole("button", { name: "Save" }).click();
    });
  });
});
