import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchTaxPercent } from "./fetchTaxPercent";

const mockAddress = {
  street: "100 Grand Ave",
  city: "Chicago",
  stateProvince: "IL",
  zipPostal: "60611",
};

describe("fetchTaxPercent", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns null when connectionId is empty", async () => {
    const result = await fetchTaxPercent({
      connectionId: "",
      address: mockAddress,
      subtotal: 1000,
    });
    expect(result).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("returns null when address is completely empty", async () => {
    const result = await fetchTaxPercent({
      connectionId: "conn-123",
      address: { street: "", city: "", stateProvince: "", zipPostal: "" },
      subtotal: 1000,
    });
    expect(result).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("builds correct query params", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ taxPercent: 8.25, totalTax: 82.5, subtotal: 1000, taxMode: "automated" }),
        { status: 200 },
      ),
    );

    await fetchTaxPercent({
      connectionId: "conn-abc",
      address: mockAddress,
      subtotal: 1000,
    });

    const calledUrl = vi.mocked(globalThis.fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain("connectionId=conn-abc");
    expect(calledUrl).toContain("line1=100+Grand+Ave");
    expect(calledUrl).toContain("city=Chicago");
    expect(calledUrl).toContain("state=IL");
    expect(calledUrl).toContain("postalCode=60611");
    expect(calledUrl).toContain("subtotal=1000");
  });

  it("omits empty address fields from params", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ taxPercent: 5, totalTax: 5, subtotal: 100, taxMode: "manual" }),
        { status: 200 },
      ),
    );

    await fetchTaxPercent({
      connectionId: "conn-abc",
      address: { street: "", city: "Toronto", stateProvince: "ON", zipPostal: "" },
      subtotal: 100,
    });

    const calledUrl = vi.mocked(globalThis.fetch).mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("line1=");
    expect(calledUrl).not.toContain("postalCode=");
    expect(calledUrl).toContain("city=Toronto");
    expect(calledUrl).toContain("state=ON");
  });

  it("parses successful response correctly", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          taxPercent: 8.25,
          totalTax: 82.5,
          subtotal: 1000,
          taxMode: "automated",
          debug: {},
        }),
        { status: 200 },
      ),
    );

    const result = await fetchTaxPercent({
      connectionId: "conn-abc",
      address: mockAddress,
      subtotal: 1000,
    });

    expect(result).toEqual({
      taxPercent: 8.25,
      totalTax: 82.5,
      subtotal: 1000,
      taxMode: "automated",
    });
  });

  it("returns null on API error (non-200)", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "connectionId is required" }), { status: 400 }),
    );

    const result = await fetchTaxPercent({
      connectionId: "conn-abc",
      address: mockAddress,
      subtotal: 1000,
    });

    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new Error("Network error"));

    const result = await fetchTaxPercent({
      connectionId: "conn-abc",
      address: mockAddress,
      subtotal: 1000,
    });

    expect(result).toBeNull();
  });

  it("uses default subtotal 100 when subtotal is 0", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ taxPercent: 8, totalTax: 8, subtotal: 100, taxMode: "automated" }),
        { status: 200 },
      ),
    );

    await fetchTaxPercent({
      connectionId: "conn-abc",
      address: mockAddress,
      subtotal: 0,
    });

    // subtotal=0 should NOT be in the URL (skipped because not > 0)
    const calledUrl = vi.mocked(globalThis.fetch).mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("subtotal=");
  });

  it("handles manual tax mode response", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          taxPercent: 13,
          totalTax: 13,
          subtotal: 100,
          taxMode: "manual",
        }),
        { status: 200 },
      ),
    );

    const result = await fetchTaxPercent({
      connectionId: "conn-abc",
      address: { street: "", city: "Toronto", stateProvince: "ON", zipPostal: "M5V 2T6" },
      subtotal: 100,
    });

    expect(result).toEqual({
      taxPercent: 13,
      totalTax: 13,
      subtotal: 100,
      taxMode: "manual",
    });
  });
});
