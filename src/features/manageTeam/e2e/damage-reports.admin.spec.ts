import { test, expect } from "@playwright/test";
import {
  damageReportCardByNote,
  openCreateDamageReportModal,
  openFirstOpenDamageReportCard,
  pickSeatMinorDamage,
  showResolvedReports,
  toggleHideUploadingPhotos,
  waitForDamageReportsLoaded,
} from "./helpers/damageReportsPage";
import {
  seedDamageReport,
  TINY_PNG_BUFFER,
  type SeededDamageReport,
} from "./helpers/damageReportsFixtures";

test.describe("Damage Reports (admin)", () => {
  test("lists page and resolve flow UI", async ({ page }) => {
    await page.goto("/damage-reports");
    await waitForDamageReportsLoaded(page);

    const opened = await openFirstOpenDamageReportCard(page);
    if (opened) {
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("button", { name: "Create Maintenance to Resolve" }),
      ).toBeVisible();
      await expect(dialog.getByText("Resolved", { exact: true })).not.toBeVisible();
      await page.keyboard.press("Escape");
    }

    await showResolvedReports(page);
    const resolvedCard = page.locator(".border-gray-200").filter({ hasText: "Resolved" }).first();
    if (await resolvedCard.isVisible().catch(() => false)) {
      await resolvedCard.click();
      await expect(
        page.getByRole("dialog").getByText("Resolved — linked to a maintenance event."),
      ).toBeVisible();
    }
  });

  test.describe("photos_uploaded filter", () => {
    let fixture: SeededDamageReport;

    test.beforeAll(async () => {
      // One pending photo means the DamageReports.photos_uploaded trigger
      // computes false for this report — it should be hidden by default.
      fixture = await seedDamageReport({ photoStatuses: ["pending"] });
    });

    test.afterAll(async () => {
      await fixture.cleanup();
    });

    test("a report with photos still uploading is hidden by default, shown when toggled", async ({
      page,
    }) => {
      await page.goto("/damage-reports");
      await waitForDamageReportsLoaded(page);

      await expect(damageReportCardByNote(page, fixture.note)).toHaveCount(0, {
        timeout: 30_000,
      });

      await toggleHideUploadingPhotos(page);

      await expect(damageReportCardByNote(page, fixture.note)).toBeVisible({ timeout: 30_000 });
    });
  });

  test("create with zero photos is blocked in the UI", async ({ page }) => {
    await page.goto("/damage-reports");
    await waitForDamageReportsLoaded(page);

    await openCreateDamageReportModal(page);
    const dialog = page.getByRole("dialog");

    await dialog.getByRole("combobox").click();
    await page.getByRole("option").first().click();
    await pickSeatMinorDamage(page);
    await dialog.getByPlaceholder("Describe the damage...").fill("e2e zero-photo block check");

    // No photo added — the Create button must stay disabled.
    await expect(dialog.getByRole("button", { name: "Create Report" })).toBeDisabled();

    await page.keyboard.press("Escape");
  });

  test.describe("photo cap", () => {
    let fixture: SeededDamageReport;

    test.beforeAll(async () => {
      // 29 pre-existing uploaded photos + 1 added through the UI = 30, the cap.
      fixture = await seedDamageReport({
        photoStatuses: Array(29).fill("uploaded"),
      });
    });

    test.afterAll(async () => {
      await fixture.cleanup();
    });

    test("add-photo control disables once the report reaches 30 photos", async ({ page }) => {
      await page.goto("/damage-reports");
      await waitForDamageReportsLoaded(page);
      await toggleHideUploadingPhotos(page); // this fixture's photos are all "uploaded", so it's
      // already visible by default; toggling shows in-flight reports too and is harmless here.
      await toggleHideUploadingPhotos(page); // toggle back to the default state before continuing.

      await damageReportCardByNote(page, fixture.note).click({ timeout: 30_000 });
      const dialog = page.getByRole("dialog").filter({ hasText: "Edit Damage Report" });
      await expect(dialog).toBeVisible();

      await expect(dialog.getByText("29/30")).toBeVisible();

      const fileInput = dialog.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: "e2e-fixture.png",
        mimeType: "image/png",
        buffer: TINY_PNG_BUFFER,
      });

      await expect(dialog.getByText("30/30")).toBeVisible({ timeout: 15_000 });
      await expect(dialog.getByText(/Maximum 30 photos per report/)).toBeVisible();
      await expect(fileInput).toBeDisabled();

      await page.keyboard.press("Escape");
    });
  });
});
