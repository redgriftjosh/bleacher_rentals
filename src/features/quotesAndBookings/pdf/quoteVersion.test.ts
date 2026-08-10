import { describe, it, expect, vi } from "vitest";
import { hasHashChanged, checkQuoteFreshness } from "./quoteVersion";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

const LOCAL = "a".repeat(64);
const OTHER = "b".repeat(64);

describe("hasHashChanged", () => {
  it("is false for equal hashes", () => {
    expect(hasHashChanged("abc", "abc")).toBe(false);
  });
  it("is true for different hashes", () => {
    expect(hasHashChanged("abc", "def")).toBe(true);
  });
});

describe("checkQuoteFreshness", () => {
  it("reports stale when contentHash differs (200)", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse({ contentHash: OTHER, contractHash: "x" }));
    const r = await checkQuoteFreshness("evt-1", LOCAL, fetcher as unknown as typeof fetch);
    expect(r).toMatchObject({ stale: true, contentHash: OTHER, contractHash: "x", status: 200 });
  });

  it("is not stale when contentHash matches", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse({ contentHash: LOCAL, contractHash: "x" }));
    const r = await checkQuoteFreshness("evt-1", LOCAL, fetcher as unknown as typeof fetch);
    expect(r.stale).toBe(false);
  });

  it("requests the version endpoint with no-store", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse({ contentHash: LOCAL, contractHash: "x" }));
    await checkQuoteFreshness("evt-42", LOCAL, fetcher as unknown as typeof fetch);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/quotes/evt-42/version",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("is not stale on 404", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ error: "nope" }, 404));
    const r = await checkQuoteFreshness("evt-1", LOCAL, fetcher as unknown as typeof fetch);
    expect(r).toEqual({ stale: false, contentHash: "", contractHash: "", status: 404 });
  });

  it("is not stale on 500", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ error: "boom" }, 500));
    const r = await checkQuoteFreshness("evt-1", LOCAL, fetcher as unknown as typeof fetch);
    expect(r.stale).toBe(false);
  });

  it("is not stale when the body has no contentHash string", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ contentHash: 123 }));
    const r = await checkQuoteFreshness("evt-1", LOCAL, fetcher as unknown as typeof fetch);
    expect(r.stale).toBe(false);
  });

  it("swallows network errors without marking stale", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network down"));
    const r = await checkQuoteFreshness("evt-1", LOCAL, fetcher as unknown as typeof fetch);
    expect(r).toMatchObject({ stale: false, status: null, error: "network down" });
  });
});
