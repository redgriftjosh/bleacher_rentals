import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/features/userAccess/logic/requireAdminOrAccountManager", () => ({
  requireAdminOrAccountManager: vi.fn(async () => undefined),
}));

const getQboAccessTokenAndRealmId = vi.fn(async () => ({
  accessToken: "token",
  realmId: "realm",
}));

vi.mock("@/features/quickbooks-integration/util", () => ({
  getQboAccessTokenAndRealmId: (...args: unknown[]) =>
    (getQboAccessTokenAndRealmId as any)(...args),
  getBaseUrl: () => "https://quickbooks.example/v3/company",
}));

import { GET } from "./route";
import { NextRequest } from "next/server";

const url = (params: Record<string, string>) =>
  new NextRequest(
    `http://localhost:3000/api/quickbooks/tax-percent?${new URLSearchParams(params).toString()}`,
  );

describe("GET /api/quickbooks/tax-percent — Canadian addresses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Network is closed off: the Canadian cases assert fetch is never called,
    // and the US case relies on the outbound call failing.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network disabled in test");
      }),
    );
  });

  it("returns the Ontario rate without contacting QuickBooks", async () => {
    const res = await GET(url({ connectionId: "conn-1", state: "Ontario", subtotal: "100" }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.taxPercent).toBe(13);
    expect(json.taxMode).toBe("canada_static");
    expect(globalThis.fetch).not.toHaveBeenCalled();
    // No token is fetched either — a Canadian office needs no live connection.
    expect(getQboAccessTokenAndRealmId).not.toHaveBeenCalled();
  });

  it("combines GST and QST for Quebec", async () => {
    const res = await GET(url({ connectionId: "conn-1", state: "QC", subtotal: "200" }));

    const json = await res.json();
    expect(json.taxPercent).toBe(14.975);
    expect(json.totalTax).toBe(29.95);
    expect(json.totalWithTax).toBe(229.95);
  });

  it("accepts the two-letter code as well as the full province name", async () => {
    const byCode = await (await GET(url({ connectionId: "c", state: "ON" }))).json();
    const byName = await (await GET(url({ connectionId: "c", state: "Ontario" }))).json();
    expect(byCode.taxPercent).toBe(byName.taxPercent);
  });

  it("still requires a connectionId", async () => {
    const res = await GET(url({ state: "Ontario" }));
    expect(res.status).toBe(400);
  });

  it("falls through to the QuickBooks path for a US state", async () => {
    // Proves the Canadian branch does not swallow US addresses: the estimate
    // path runs and hits the stubbed fetch.
    const res = await GET(url({ connectionId: "conn-1", state: "California" }));

    expect(getQboAccessTokenAndRealmId).toHaveBeenCalled();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.taxMode).toBeUndefined();
  });
});
