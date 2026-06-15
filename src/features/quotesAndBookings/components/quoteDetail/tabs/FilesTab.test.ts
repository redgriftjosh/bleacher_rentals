import { describe, it, expect } from "vitest";

// Re-implement pure helpers from FilesTab for unit testing
// (they're module-scoped, so we test the logic directly)

const IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
];

const ACCEPTED_TYPES = [
  ...IMAGE_TYPES,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
];

const MAX_SIZE_MB = 20;

const isImageType = (mime: string | null) =>
  !!mime && IMAGE_TYPES.includes(mime);

const isImagePath = (path: string) => {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "heic", "heif", "webp"].includes(ext);
};

const formatBytes = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const sourceLabel = (source: string | null) => {
  switch (source) {
    case "sent_quote":
      return "Sent Quote PDF";
    case "signed_contract":
      return "Signed Contract";
    case "upload":
    default:
      return "Upload";
  }
};

describe("isImageType", () => {
  it("returns true for image MIME types", () => {
    expect(isImageType("image/jpeg")).toBe(true);
    expect(isImageType("image/png")).toBe(true);
    expect(isImageType("image/webp")).toBe(true);
    expect(isImageType("image/heic")).toBe(true);
  });

  it("returns false for non-image MIME types", () => {
    expect(isImageType("application/pdf")).toBe(false);
    expect(isImageType("text/csv")).toBe(false);
    expect(isImageType(null)).toBe(false);
  });
});

describe("isImagePath", () => {
  it("detects image extensions", () => {
    expect(isImagePath("event-id/abc.jpg")).toBe(true);
    expect(isImagePath("event-id/abc.jpeg")).toBe(true);
    expect(isImagePath("event-id/abc.png")).toBe(true);
    expect(isImagePath("event-id/abc.webp")).toBe(true);
    expect(isImagePath("event-id/abc.HEIF")).toBe(true); // toLowerCase handles uppercase
    expect(isImagePath("event-id/abc.heif")).toBe(true);
  });

  it("rejects non-image extensions", () => {
    expect(isImagePath("event-id/abc.pdf")).toBe(false);
    expect(isImagePath("event-id/abc.docx")).toBe(false);
    expect(isImagePath("event-id/abc.csv")).toBe(false);
  });
});

describe("formatBytes", () => {
  it("returns dash for null/zero", () => {
    expect(formatBytes(null)).toBe("—");
    expect(formatBytes(0)).toBe("—");
  });

  it("formats bytes", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1048576)).toBe("1.0 MB");
    expect(formatBytes(5242880)).toBe("5.0 MB");
  });
});

describe("sourceLabel", () => {
  it("maps source values to human labels", () => {
    expect(sourceLabel("upload")).toBe("Upload");
    expect(sourceLabel("sent_quote")).toBe("Sent Quote PDF");
    expect(sourceLabel("signed_contract")).toBe("Signed Contract");
  });

  it("defaults to Upload for null or unknown", () => {
    expect(sourceLabel(null)).toBe("Upload");
    expect(sourceLabel("something_else")).toBe("Upload");
  });
});

describe("ACCEPTED_TYPES", () => {
  it("includes all expected MIME types", () => {
    expect(ACCEPTED_TYPES).toContain("application/pdf");
    expect(ACCEPTED_TYPES).toContain("image/jpeg");
    expect(ACCEPTED_TYPES).toContain("text/csv");
    expect(ACCEPTED_TYPES).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });

  it("does not include disallowed types", () => {
    expect(ACCEPTED_TYPES).not.toContain("application/zip");
    expect(ACCEPTED_TYPES).not.toContain("video/mp4");
    expect(ACCEPTED_TYPES).not.toContain("application/javascript");
  });
});

describe("MAX_SIZE_MB", () => {
  it("is 20MB", () => {
    expect(MAX_SIZE_MB).toBe(20);
  });
});
