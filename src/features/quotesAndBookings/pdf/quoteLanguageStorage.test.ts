import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readStoredQuoteLanguage, writeStoredQuoteLanguage } from "./quoteLanguageStorage";

// Tests run in the "node" environment, so window/localStorage are stubbed here.
function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
    dump: () => Object.fromEntries(map),
  };
}

function withWindow(storage: unknown) {
  vi.stubGlobal("window", { localStorage: storage });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("quote language storage", () => {
  it("round-trips a saved choice for one quote", () => {
    withWindow(fakeStorage());
    writeStoredQuoteLanguage("evt-1", "fr");
    expect(readStoredQuoteLanguage("evt-1")).toBe("fr");
  });

  it("scopes the choice per quote — correcting one never changes another", () => {
    withWindow(fakeStorage());
    writeStoredQuoteLanguage("evt-1", "fr");
    expect(readStoredQuoteLanguage("evt-2")).toBeNull();
  });

  it("returns null when nothing has been saved, so the contact's language wins", () => {
    withWindow(fakeStorage());
    expect(readStoredQuoteLanguage("evt-1")).toBeNull();
  });

  it("ignores a junk or tampered value rather than rendering an unknown language", () => {
    withWindow(fakeStorage({ "quote-language:evt-1": "klingon" }));
    expect(readStoredQuoteLanguage("evt-1")).toBeNull();
  });

  it("returns null during server render, where there is no window", () => {
    // No window stubbed at all.
    expect(readStoredQuoteLanguage("evt-1")).toBeNull();
  });

  it("survives a browser that blocks storage (private mode) without throwing", () => {
    withWindow({
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("SecurityError");
      },
    });
    expect(() => writeStoredQuoteLanguage("evt-1", "fr")).not.toThrow();
    expect(readStoredQuoteLanguage("evt-1")).toBeNull();
  });

  it("never writes to a key another quote could read", () => {
    const storage = fakeStorage();
    withWindow(storage);
    writeStoredQuoteLanguage("evt-1", "fr");
    expect(Object.keys(storage.dump())).toEqual(["quote-language:evt-1"]);
  });
});
