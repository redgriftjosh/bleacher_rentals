import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/utils/supabase/useClerkSupabaseClient", () => ({
  useClerkSupabaseClient: () => ({
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://cdn.test/driver-documents/${path}` },
        }),
      }),
    },
  }),
}));

const { DriverDocumentCard } = await import("./DriverDocumentCard");

const noop = () => {};

function render(props: Partial<Parameters<typeof DriverDocumentCard>[0]> = {}) {
  return renderToStaticMarkup(
    <DriverDocumentCard
      label="Driver's License"
      hint="Front of the licence, or a PDF scan."
      bucket="driver-documents"
      storagePath="driver-1/license"
      value={null}
      onChange={noop}
      expiresOn={null}
      onExpiresOnChange={noop}
      todayIso="2026-08-28"
      {...props}
    />,
  );
}

describe("DriverDocumentCard", () => {
  it("prompts for an upload when the document is missing", () => {
    const html = render();
    expect(html).toContain("Driver&#x27;s License");
    expect(html).toContain("Front of the licence, or a PDF scan.");
    expect(html).toContain("Not uploaded");
    expect(html).toContain('type="file"');
  });

  it("offers the expiry date even before a file is uploaded", () => {
    // An admin often knows the expiry before the driver sends the scan.
    expect(render()).toContain('type="date"');
  });

  it("shows an image document as a thumbnail served from storage", () => {
    const html = render({ value: "driver-1/license_1712.jpg" });
    expect(html).toContain('src="https://cdn.test/driver-documents/driver-1/license_1712.jpg"');
    expect(html).toContain("license_1712.jpg");
  });

  it("links a PDF instead of trying to inline it", () => {
    const html = render({ value: "driver-1/license_1712.pdf" });
    expect(html).not.toContain("<img");
    expect(html).toContain('href="https://cdn.test/driver-documents/driver-1/license_1712.pdf"');
    expect(html).toContain("PDF");
  });

  it("renders the stored expiry date into the date input", () => {
    expect(render({ value: "driver-1/license_1.jpg", expiresOn: "2027-03-04" })).toContain(
      'value="2027-03-04"',
    );
  });

  it("surfaces an expired document in the status badge", () => {
    const html = render({ value: "driver-1/license_1.jpg", expiresOn: "2026-08-01" });
    expect(html).toContain("Expired 27 days ago");
  });

  it("warns when the document is inside the renewal window", () => {
    const html = render({ value: "driver-1/license_1.jpg", expiresOn: "2026-09-05" });
    expect(html).toContain("Expires in 8 days");
  });

  it("stays quiet for a document that is well in date", () => {
    const html = render({ value: "driver-1/license_1.jpg", expiresOn: "2028-01-01" });
    expect(html).toContain("Valid");
    expect(html).not.toContain("Expires in");
  });

  it("labels its controls for the document it belongs to", () => {
    const html = render({ value: "driver-1/license_1.jpg" });
    expect(html).toContain("Replace Driver&#x27;s License");
    expect(html).toContain("Remove Driver&#x27;s License");
    expect(html).toContain("Driver&#x27;s License expiry date");
  });

  it("hides every control when disabled", () => {
    const html = render({ value: "driver-1/license_1.jpg", disabled: true });
    expect(html).not.toContain('type="file"');
    expect(html).toContain("disabled");
  });
});
