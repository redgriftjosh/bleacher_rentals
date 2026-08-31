import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockBuild, mockRender, rendered } = vi.hoisted(() => ({
  mockBuild: vi.fn(),
  mockRender: vi.fn(),
  rendered: [] as unknown[],
}));

vi.mock("@react-pdf/renderer", () => ({
  renderToBuffer: (element: { props: { data: unknown } }) => {
    rendered.push(element.props.data);
    return mockRender();
  },
}));

vi.mock("@/features/quotesAndBookings/pdf/quoteDocumentData", () => ({
  buildQuoteDocumentData: mockBuild,
}));

vi.mock("@/features/quotesAndBookings/pdf/QuotePdfDocument", () => ({
  QuotePdfDocument: (props: unknown) => ({ props }),
}));

import { GET } from "./route";
import { NextRequest } from "next/server";

const request = (query = "") =>
  new NextRequest(`http://localhost:3000/api/quotes/evt-1/pdf${query}`);
const params = Promise.resolve({ id: "evt-1" });

/** The language the renderer was actually handed. */
const languageUsed = () => (rendered.at(-1) as { language: string }).language;

describe("GET /api/quotes/[id]/pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rendered.length = 0;
    mockRender.mockResolvedValue(Buffer.from("%PDF-1.4"));
    mockBuild.mockResolvedValue({ quoteNumber: "INV-1", language: "en" });
  });

  it("renders in the language the client is reading the quote in", async () => {
    // A client on the French page must not download an English PDF.
    await GET(request("?lang=fr"), { params });
    expect(languageUsed()).toBe("fr");
  });

  it("honours an explicit English request", async () => {
    mockBuild.mockResolvedValue({ quoteNumber: "INV-1", language: "fr" });
    await GET(request("?lang=en"), { params });
    expect(languageUsed()).toBe("en");
  });

  it("falls back to the contact's own language when lang is absent or unknown", async () => {
    mockBuild.mockResolvedValue({ quoteNumber: "INV-1", language: "fr" });

    for (const query of ["", "?lang=", "?lang=klingon", "?lang=EN"]) {
      await GET(request(query), { params });
      expect(languageUsed(), `query "${query}"`).toBe("fr");
    }
  });

  it("returns 404 when the quote does not exist", async () => {
    mockBuild.mockResolvedValue(null);
    const response = await GET(request(), { params });
    expect(response.status).toBe(404);
  });
});
