import { test, expect, type Page } from "@playwright/test";

/**
 * Instant-create + autosave across the three roadmap surfaces.
 * See docs/specs/roadmap-instant-create-autosave.md.
 */

const SAVED = /Saved/;
const SAVING = /Saving/;

/**
 * The app shell blocks on PowerSync's initial sync (`access.status === "loading"`),
 * which on a full local dataset takes well over the default expect timeout.
 */
async function waitForAppReady(page: Page) {
  await expect(page.getByText("Loading...", { exact: true })).toHaveCount(0, { timeout: 180_000 });
}

/** Opens the first seeded quarter and returns its id. */
async function openFirstQuarter(page: Page): Promise<string> {
  await page.goto("/roadmap");
  await waitForAppReady(page);
  const firstQuarter = page.getByRole("link", { name: /^Q\d \d{4}$/ }).first();
  await expect(firstQuarter).toBeVisible();
  await firstQuarter.click();
  await expect(page).toHaveURL(/\/roadmap\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop()!;
}

const titleField = (page: Page, label: string) => page.getByRole("textbox", { name: label });

test.describe("Roadmap features — instant create & autosave (admin)", () => {
  test("creating a feature inserts the row and opens its modal", async ({ page }) => {
    await openFirstQuarter(page);

    await page.getByRole("button", { name: "New Feature" }).click();

    // The URL now points at a real record — there is no "new" mode any more.
    await expect(page).toHaveURL(/\?feature=[0-9a-f-]{36}$/);
    await expect(titleField(page, "Feature title")).toBeVisible();
  });

  test("typing autosaves and survives a reload", async ({ page }) => {
    await openFirstQuarter(page);
    await page.getByRole("button", { name: "New Feature" }).click();
    await expect(page).toHaveURL(/\?feature=/);
    const featureUrl = page.url();

    const title = `E2E autosave ${Date.now()}`;
    await titleField(page, "Feature title").fill(title);

    await expect(page.getByText(SAVING)).toBeVisible();
    await expect(page.getByText(SAVED)).toBeVisible();

    // No Save button exists — the write already happened.
    await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);

    await page.goto(featureUrl);
    await expect(titleField(page, "Feature title")).toHaveValue(title);

    // Clean up so the run is repeatable.
    await page.getByRole("button", { name: "Delete", exact: true }).first().click();
    await page.getByRole("button", { name: "Delete", exact: true }).last().click();
  });

  test("an untouched draft is discarded when the modal closes", async ({ page }) => {
    const quarterId = await openFirstQuarter(page);
    const rowsBefore = await page.getByRole("row").count();

    await page.getByRole("button", { name: "New Feature" }).click();
    await expect(page).toHaveURL(/\?feature=/);

    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(`/roadmap/${quarterId}`);

    // The empty draft left nothing behind — not even an "Untitled feature" row.
    await expect(page.getByText("Untitled feature")).toHaveCount(0);
    await expect(page.getByRole("row")).toHaveCount(rowsBefore);
  });

  test("delete is a soft delete: the feature leaves the list but can be restored", async ({
    page,
  }) => {
    await openFirstQuarter(page);
    await page.getByRole("button", { name: "New Feature" }).click();
    await expect(page).toHaveURL(/\?feature=/);

    const title = `E2E delete ${Date.now()}`;
    await titleField(page, "Feature title").fill(title);
    await expect(page.getByText(SAVED)).toBeVisible();

    await page.getByRole("button", { name: "Delete", exact: true }).first().click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).last().click();

    await expect(page.getByRole("cell", { name: title })).toHaveCount(0);

    // Still there, just filtered out.
    await page.getByRole("button", { name: "Show Deleted" }).click();
    await expect(page.getByRole("cell", { name: title })).toBeVisible();
  });
});

test.describe("Roadmap backlog — instant create & autosave (admin)", () => {
  test("submitting a ticket creates it immediately and autosaves edits", async ({ page }) => {
    await page.goto("/roadmap/backlog");
    await waitForAppReady(page);

    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page).toHaveURL(/\?ticket=[0-9a-f-]{36}$/);

    const title = `E2E ticket ${Date.now()}`;
    await titleField(page, "Task title").fill(title);
    await expect(page.getByText(SAVED)).toBeVisible();

    // The creation notice is posted once, not once per keystroke.
    await titleField(page, "Task title").fill(`${title} edited`);
    await expect(page.getByText(SAVED)).toBeVisible();
    await expect(page.getByText(/created a ticket/)).toHaveCount(1);

    await page.getByRole("button", { name: "Delete", exact: true }).first().click();
    await page.getByRole("button", { name: "Delete", exact: true }).last().click();
  });

  test("an untouched ticket draft leaves nothing in the backlog", async ({ page }) => {
    await page.goto("/roadmap/backlog");
    await waitForAppReady(page);
    await expect(page.getByRole("button", { name: "Submit Ticket" })).toBeVisible();

    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page).toHaveURL(/\?ticket=/);
    await page.keyboard.press("Escape");

    await expect(page).toHaveURL("/roadmap/backlog");
    await expect(page.getByText("Untitled ticket")).toHaveCount(0);
  });
});
