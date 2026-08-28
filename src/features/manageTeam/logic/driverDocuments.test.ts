import { describe, it, expect } from "vitest";
import {
  DRIVER_DOCUMENTS,
  describeDocumentFile,
  describeDocumentStatus,
  resolveExpiryStatus,
  toIsoDate,
  type DriverDocumentType,
} from "./driverDocuments";

describe("DRIVER_DOCUMENTS", () => {
  it("describes the three documents a driver can upload", () => {
    expect(DRIVER_DOCUMENTS.map((d) => d.type)).toEqual(["license", "insurance", "medical_card"]);
  });

  it("keeps the storage key aligned with the mobile app path convention", () => {
    // `{driverId}/license_{ts}.ext` — the driver app and the DriverDocuments
    // doc_type check constraint both key off these exact strings.
    expect(DRIVER_DOCUMENTS.map((d) => d.storageKey)).toEqual([
      "license",
      "insurance",
      "medical_card",
    ]);
  });

  it("points each document at its own store fields", () => {
    expect(DRIVER_DOCUMENTS).toEqual([
      expect.objectContaining({
        type: "license",
        label: "Driver's License",
        pathField: "licensePhotoPath",
        expiryField: "licenseExpiresOn",
      }),
      expect.objectContaining({
        type: "insurance",
        label: "Insurance",
        pathField: "insurancePhotoPath",
        expiryField: "insuranceExpiresOn",
      }),
      expect.objectContaining({
        type: "medical_card",
        label: "Medical Card",
        pathField: "medicalCardPhotoPath",
        expiryField: "medicalCardExpiresOn",
      }),
    ]);
  });

  it("marks only the medical card as USA-only", () => {
    const usaOnly = DRIVER_DOCUMENTS.filter((d) => d.usaOnly).map((d) => d.type);
    expect(usaOnly).toEqual<DriverDocumentType[]>(["medical_card"]);
  });
});

describe("describeDocumentFile", () => {
  it("returns null when nothing is uploaded", () => {
    expect(describeDocumentFile(null)).toBeNull();
    expect(describeDocumentFile("")).toBeNull();
    expect(describeDocumentFile("   ")).toBeNull();
  });

  it("recognises images so they can be shown as a thumbnail", () => {
    for (const ext of ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"]) {
      expect(describeDocumentFile(`abc/license_1.${ext}`)).toEqual({
        kind: "image",
        fileName: `license_1.${ext}`,
        extension: ext,
      });
    }
  });

  it("is case-insensitive about the extension", () => {
    expect(describeDocumentFile("abc/license_1.PNG")?.kind).toBe("image");
    expect(describeDocumentFile("abc/license_1.PDF")?.kind).toBe("pdf");
  });

  it("recognises PDFs", () => {
    expect(describeDocumentFile("abc/insurance_2.pdf")).toEqual({
      kind: "pdf",
      fileName: "insurance_2.pdf",
      extension: "pdf",
    });
  });

  it("falls back to a generic file for anything else", () => {
    expect(describeDocumentFile("abc/scan.tiff")).toEqual({
      kind: "file",
      fileName: "scan.tiff",
      extension: "tiff",
    });
    expect(describeDocumentFile("abc/noextension")).toEqual({
      kind: "file",
      fileName: "noextension",
      extension: null,
    });
  });
});

describe("resolveExpiryStatus", () => {
  const today = "2026-08-28";

  it("reports a missing date when none is set", () => {
    expect(resolveExpiryStatus(null, today)).toEqual({ status: "missing", daysUntilExpiry: null });
    expect(resolveExpiryStatus("", today)).toEqual({ status: "missing", daysUntilExpiry: null });
  });

  it("treats an unparseable date as missing rather than throwing", () => {
    expect(resolveExpiryStatus("not-a-date", today)).toEqual({
      status: "missing",
      daysUntilExpiry: null,
    });
    expect(resolveExpiryStatus("2026-13-40", today)).toEqual({
      status: "missing",
      daysUntilExpiry: null,
    });
  });

  it("is valid when the document expires more than 30 days out", () => {
    expect(resolveExpiryStatus("2026-09-28", today)).toEqual({
      status: "valid",
      daysUntilExpiry: 31,
    });
  });

  it("warns from 30 days out down to the expiry day itself", () => {
    expect(resolveExpiryStatus("2026-09-27", today)).toEqual({
      status: "expiring-soon",
      daysUntilExpiry: 30,
    });
    expect(resolveExpiryStatus("2026-08-29", today)).toEqual({
      status: "expiring-soon",
      daysUntilExpiry: 1,
    });
    // Expiring today still counts as usable today.
    expect(resolveExpiryStatus(today, today)).toEqual({
      status: "expiring-soon",
      daysUntilExpiry: 0,
    });
  });

  it("is expired the day after the expiry date", () => {
    expect(resolveExpiryStatus("2026-08-27", today)).toEqual({
      status: "expired",
      daysUntilExpiry: -1,
    });
  });

  it("counts days across a month boundary without timezone drift", () => {
    expect(resolveExpiryStatus("2026-03-01", "2026-02-28").daysUntilExpiry).toBe(1);
    expect(resolveExpiryStatus("2027-01-01", "2026-12-31").daysUntilExpiry).toBe(1);
  });

  it("ignores a timestamp suffix on the stored value", () => {
    expect(resolveExpiryStatus("2026-09-28T00:00:00.000Z", today).daysUntilExpiry).toBe(31);
  });
});

describe("toIsoDate", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    expect(toIsoDate(new Date(2026, 7, 5))).toBe("2026-08-05");
    expect(toIsoDate(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("uses local calendar fields, not UTC, so late-evening dates don't roll forward", () => {
    expect(toIsoDate(new Date(2026, 0, 1, 23, 30))).toBe("2026-01-01");
  });
});

describe("describeDocumentStatus", () => {
  const today = "2026-08-28";

  it("asks for the document first when nothing is uploaded", () => {
    expect(describeDocumentStatus({ path: null, expiresOn: null, todayIso: today })).toEqual({
      tone: "neutral",
      label: "Not uploaded",
      status: "missing",
    });
  });

  it("still reports an expired date on a document that was never uploaded", () => {
    // A date can arrive from the driver app before the scan does.
    expect(
      describeDocumentStatus({ path: null, expiresOn: "2026-08-01", todayIso: today }),
    ).toMatchObject({ tone: "danger", status: "expired" });
  });

  it("asks for a date once the document is there", () => {
    expect(
      describeDocumentStatus({ path: "d1/license_1.jpg", expiresOn: null, todayIso: today }),
    ).toEqual({ tone: "neutral", label: "No expiry date", status: "missing" });
  });

  it("counts down inside the warning window", () => {
    expect(
      describeDocumentStatus({
        path: "d1/license_1.jpg",
        expiresOn: "2026-09-10",
        todayIso: today,
      }),
    ).toEqual({ tone: "warning", label: "Expires in 13 days", status: "expiring-soon" });
  });

  it("uses singular wording at one day out, and names the day itself at zero", () => {
    expect(
      describeDocumentStatus({
        path: "d1/license_1.jpg",
        expiresOn: "2026-08-29",
        todayIso: today,
      }),
    ).toMatchObject({ label: "Expires in 1 day" });
    expect(
      describeDocumentStatus({ path: "d1/license_1.jpg", expiresOn: today, todayIso: today }),
    ).toMatchObject({ label: "Expires today" });
  });

  it("reports how long a document has been expired", () => {
    expect(
      describeDocumentStatus({
        path: "d1/license_1.jpg",
        expiresOn: "2026-08-27",
        todayIso: today,
      }),
    ).toEqual({ tone: "danger", label: "Expired 1 day ago", status: "expired" });
    expect(
      describeDocumentStatus({
        path: "d1/license_1.jpg",
        expiresOn: "2026-07-28",
        todayIso: today,
      }),
    ).toMatchObject({ label: "Expired 31 days ago" });
  });

  it("is quietly valid when the document is well inside its term", () => {
    expect(
      describeDocumentStatus({
        path: "d1/license_1.jpg",
        expiresOn: "2027-08-28",
        todayIso: today,
      }),
    ).toEqual({ tone: "success", label: "Valid", status: "valid" });
  });
});
