/**
 * Driver document descriptors and the pure rules the Document Uploads UI reads.
 *
 * The three documents are a fixed, closed set: `doc_type` on DriverDocuments is
 * a CHECK constraint over exactly these strings, and the driver app writes its
 * uploads to `{driverId}/{storageKey}_{ts}.ext` in the same bucket. Keeping the
 * descriptors here means the admin form, its tests and any future consumer all
 * agree on labels, storage keys and which store fields hold the path/date —
 * instead of each spelling the triple out again.
 */

export type DriverDocumentType = "license" | "insurance" | "medical_card";

export type DriverDocumentDescriptor = {
  type: DriverDocumentType;
  /** Human label shown on the card. */
  label: string;
  /** Path prefix segment: `{driverId}/{storageKey}_{ts}.ext`. */
  storageKey: DriverDocumentType;
  /** `useCurrentUserStore` field holding the storage path. */
  pathField: "licensePhotoPath" | "insurancePhotoPath" | "medicalCardPhotoPath";
  /** `useCurrentUserStore` field holding the expiry date (Drivers.<doc>_expires_on). */
  expiryField: "licenseExpiresOn" | "insuranceExpiresOn" | "medicalCardExpiresOn";
  /** Only required for drivers with a USA home address (FMCSA medical certificate). */
  usaOnly: boolean;
  /** One-line hint under the label. */
  hint: string;
};

export const DRIVER_DOCUMENTS: readonly DriverDocumentDescriptor[] = [
  {
    type: "license",
    label: "Driver's License",
    storageKey: "license",
    pathField: "licensePhotoPath",
    expiryField: "licenseExpiresOn",
    usaOnly: false,
    hint: "Front of the licence, or a PDF scan.",
  },
  {
    type: "insurance",
    label: "Insurance",
    storageKey: "insurance",
    pathField: "insurancePhotoPath",
    expiryField: "insuranceExpiresOn",
    usaOnly: false,
    hint: "Proof of vehicle insurance.",
  },
  {
    type: "medical_card",
    label: "Medical Card",
    storageKey: "medical_card",
    pathField: "medicalCardPhotoPath",
    expiryField: "medicalCardExpiresOn",
    usaOnly: true,
    hint: "FMCSA medical examiner's certificate.",
  },
] as const;

// ── File preview ────────────────────────────────────────────────────────────

export type DocumentFileKind = "image" | "pdf" | "file";

export type DocumentFileDescription = {
  kind: DocumentFileKind;
  fileName: string;
  extension: string | null;
};

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"]);

/**
 * Classifies an uploaded storage path so the card can decide between an image
 * thumbnail, a PDF affordance and a generic file chip. Returns null when there
 * is nothing uploaded.
 */
export function describeDocumentFile(
  path: string | null | undefined,
): DocumentFileDescription | null {
  const trimmed = path?.trim() ?? "";
  if (!trimmed) return null;

  const fileName = trimmed.split("/").pop() ?? trimmed;
  const dotIndex = fileName.lastIndexOf(".");
  const extension = dotIndex > 0 ? fileName.slice(dotIndex + 1).toLowerCase() : null;

  const kind: DocumentFileKind =
    extension && IMAGE_EXTENSIONS.has(extension) ? "image" : extension === "pdf" ? "pdf" : "file";

  return { kind, fileName, extension };
}

// ── Expiry ──────────────────────────────────────────────────────────────────

export type ExpiryStatus = "missing" | "valid" | "expiring-soon" | "expired";

export type ExpiryResolution = {
  status: ExpiryStatus;
  daysUntilExpiry: number | null;
};

/** A document inside this many days of expiry is flagged as expiring soon. */
export const EXPIRY_WARNING_DAYS = 30;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Parses the calendar day out of `YYYY-MM-DD` (a trailing timestamp is ignored). */
function parseIsoDay(value: string): { y: number; m: number; d: number } | null {
  const match = ISO_DATE.exec(value.trim());
  if (!match) return null;

  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);

  // Round-trip through Date to reject impossible days like 2026-02-31.
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) {
    return null;
  }
  return { y, m, d };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Whole days between two calendar days. Both sides go through `Date.UTC`, so
 * DST transitions can't shift the result by an hour and round the count off.
 */
function daysBetween(from: { y: number; m: number; d: number }, to: typeof from): number {
  const fromMs = Date.UTC(from.y, from.m - 1, from.d);
  const toMs = Date.UTC(to.y, to.m - 1, to.d);
  return Math.round((toMs - fromMs) / MS_PER_DAY);
}

/**
 * Grades an expiry date against a reference day, both as `YYYY-MM-DD`.
 *
 * A document expiring *today* is still usable today, so day 0 warns rather than
 * reading as expired. An absent or unparseable date is "missing" — the UI asks
 * for a date instead of claiming the document is bad.
 */
export function resolveExpiryStatus(
  expiresOn: string | null | undefined,
  todayIso: string,
): ExpiryResolution {
  const expiry = expiresOn ? parseIsoDay(expiresOn) : null;
  const today = parseIsoDay(todayIso);
  if (!expiry || !today) return { status: "missing", daysUntilExpiry: null };

  const daysUntilExpiry = daysBetween(today, expiry);
  const status: ExpiryStatus =
    daysUntilExpiry < 0
      ? "expired"
      : daysUntilExpiry <= EXPIRY_WARNING_DAYS
        ? "expiring-soon"
        : "valid";

  return { status, daysUntilExpiry };
}

/** Formats a Date as `YYYY-MM-DD` using its *local* calendar fields. */
export function toIsoDate(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ── Card status ─────────────────────────────────────────────────────────────

export type DocumentStatusTone = "neutral" | "success" | "warning" | "danger";

export type DocumentStatusDescription = {
  tone: DocumentStatusTone;
  label: string;
  status: ExpiryStatus;
};

/**
 * The single badge a document card shows, folding "is it uploaded?" and "is it
 * still in date?" into one verdict. Missing pieces read as a prompt ("Not
 * uploaded", "No expiry date") rather than an alarm — only a real expiry date
 * that has passed, or is close to passing, escalates the tone.
 */
export function describeDocumentStatus({
  path,
  expiresOn,
  todayIso,
}: {
  path: string | null | undefined;
  expiresOn: string | null | undefined;
  todayIso: string;
}): DocumentStatusDescription {
  const { status, daysUntilExpiry } = resolveExpiryStatus(expiresOn, todayIso);

  if (status === "missing") {
    return {
      tone: "neutral",
      label: describeDocumentFile(path) ? "No expiry date" : "Not uploaded",
      status,
    };
  }

  const days = daysUntilExpiry as number;

  if (status === "expired") {
    const ago = Math.abs(days);
    return { tone: "danger", label: `Expired ${ago} ${plural(ago, "day")} ago`, status };
  }

  if (status === "expiring-soon") {
    return {
      tone: "warning",
      label: days === 0 ? "Expires today" : `Expires in ${days} ${plural(days, "day")}`,
      status,
    };
  }

  return { tone: "success", label: "Valid", status };
}

function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}
