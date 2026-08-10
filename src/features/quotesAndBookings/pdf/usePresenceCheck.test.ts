import { describe, it, expect } from "vitest";
import { computePresence, DEFAULT_IDLE_MS } from "./usePresenceCheck";

describe("computePresence", () => {
  const idleMs = DEFAULT_IDLE_MS;

  it("is not idle immediately after activity", () => {
    const now = 1_000_000;
    expect(computePresence({ lastActiveAt: now, now, idleMs }).idle).toBe(false);
  });

  it("is not idle just before the threshold", () => {
    const now = 1_000_000;
    expect(computePresence({ lastActiveAt: now - (idleMs - 1), now, idleMs }).idle).toBe(false);
  });

  it("is idle exactly at the threshold", () => {
    const now = 1_000_000;
    expect(computePresence({ lastActiveAt: now - idleMs, now, idleMs }).idle).toBe(true);
  });

  it("is idle past the threshold (e.g. backgrounded for 20 min)", () => {
    const now = 1_000_000;
    const twentyMin = 20 * 60 * 1000;
    expect(computePresence({ lastActiveAt: now - twentyMin, now, idleMs }).idle).toBe(true);
  });

  it("DEFAULT_IDLE_MS is 15 minutes", () => {
    expect(DEFAULT_IDLE_MS).toBe(15 * 60 * 1000);
  });
});
