import { describe, it, expect } from "vitest";

type Duration = { id: string; name: string; minDays: number; maxDays: number };

const DURATIONS: Duration[] = [
  { id: "d1", name: "1 Day Rental", minDays: 1, maxDays: 2 },
  { id: "d3", name: "3 Day Rental", minDays: 3, maxDays: 6 },
  { id: "d7", name: "1 Week Rental", minDays: 7, maxDays: 12 },
  { id: "d14", name: "2 Week Rental", minDays: 13, maxDays: 21 },
  { id: "d30", name: "Monthly Rental", minDays: 22, maxDays: 35 },
];

function findDuration(startDate: string, endDate: string, durations: Duration[]): Duration | null {
  if (!startDate || !endDate || durations.length === 0) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  const daysDiff = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);

  const exact = durations.find((d) => daysDiff >= d.minDays && daysDiff <= d.maxDays);
  if (exact) return exact;

  const longest = durations[durations.length - 1];
  if (daysDiff > longest.maxDays) return longest;

  return null;
}

describe("findDuration", () => {
  it("returns exact match for 1 day event", () => {
    const result = findDuration("2026-07-01", "2026-07-01", DURATIONS);
    expect(result?.id).toBe("d1");
  });

  it("returns exact match for 5 day event", () => {
    const result = findDuration("2026-07-01", "2026-07-05", DURATIONS);
    expect(result?.id).toBe("d3");
  });

  it("returns exact match for 1 week event", () => {
    const result = findDuration("2026-07-01", "2026-07-08", DURATIONS);
    expect(result?.id).toBe("d7");
  });

  it("returns exact match for monthly (30 days)", () => {
    const result = findDuration("2026-07-01", "2026-07-30", DURATIONS);
    expect(result?.id).toBe("d30");
  });

  it("falls back to monthly for 3 month event (90+ days)", () => {
    const result = findDuration("2026-07-01", "2026-09-30", DURATIONS);
    expect(result?.id).toBe("d30");
  });

  it("falls back to monthly for 6 month event", () => {
    const result = findDuration("2026-01-01", "2026-06-30", DURATIONS);
    expect(result?.id).toBe("d30");
  });

  it("falls back to longest when durations are partial", () => {
    const shortDurations: Duration[] = [
      { id: "d1", name: "1 Day", minDays: 1, maxDays: 2 },
      { id: "d14", name: "2 Week", minDays: 13, maxDays: 21 },
    ];
    const result = findDuration("2026-07-01", "2026-09-30", shortDurations);
    expect(result?.id).toBe("d14");
  });

  it("returns null for empty dates", () => {
    expect(findDuration("", "2026-07-01", DURATIONS)).toBeNull();
    expect(findDuration("2026-07-01", "", DURATIONS)).toBeNull();
  });

  it("returns null for empty durations", () => {
    expect(findDuration("2026-07-01", "2026-07-05", [])).toBeNull();
  });
});

// Re-implement lookupPrice logic for unit testing
function lookupPrice(
  bleacherTypeUuid: string,
  eventTypeUuid: string,
  startDate: string,
  endDate: string,
  currency: string,
  durations: Duration[],
  priceMap: Map<string, number>,
): number | null {
  const duration = findDuration(startDate, endDate, durations);
  if (!duration) return null;

  const key = `${bleacherTypeUuid}|${eventTypeUuid}|${duration.id}|${currency}`;
  const exact = priceMap.get(key);
  if (exact !== undefined) return exact;

  for (let i = durations.length - 1; i >= 0; i--) {
    const fallbackKey = `${bleacherTypeUuid}|${eventTypeUuid}|${durations[i].id}|${currency}`;
    const fallback = priceMap.get(fallbackKey);
    if (fallback !== undefined) return fallback;
  }

  return null;
}

describe("lookupPrice fallback", () => {
  const priceMap = new Map<string, number>();
  // Only 1-day and 3-day prices exist for bt1|et_city
  priceMap.set("bt1|et_city|d1|USD", 10000);
  priceMap.set("bt1|et_city|d3|USD", 15000);
  // Full prices for bt2|et_city
  priceMap.set("bt2|et_city|d1|USD", 20000);
  priceMap.set("bt2|et_city|d7|USD", 30000);
  priceMap.set("bt2|et_city|d30|USD", 50000);

  it("returns exact price when duration matches", () => {
    // 1-day event → d1, price exists
    const result = lookupPrice("bt1", "et_city", "2026-07-01", "2026-07-01", "USD", DURATIONS, priceMap);
    expect(result).toBe(10000);
  });

  it("falls back to longest available when no price for matched duration", () => {
    // 10-day event → d7 (1 Week), but bt1 only has d1 and d3 prices → fallback to d3
    const result = lookupPrice("bt1", "et_city", "2026-07-01", "2026-07-10", "USD", DURATIONS, priceMap);
    expect(result).toBe(15000);
  });

  it("falls back to longest available for 3-month event with partial prices", () => {
    // 90-day event → d30 fallback from findDuration, but bt1 has no d30 → fallback to d3
    const result = lookupPrice("bt1", "et_city", "2026-07-01", "2026-09-30", "USD", DURATIONS, priceMap);
    expect(result).toBe(15000);
  });

  it("returns exact price when full matrix exists", () => {
    // 10-day event → d7, bt2 has d7 price
    const result = lookupPrice("bt2", "et_city", "2026-07-01", "2026-07-10", "USD", DURATIONS, priceMap);
    expect(result).toBe(30000);
  });

  it("returns null when no prices exist at all for combo", () => {
    const result = lookupPrice("bt_unknown", "et_city", "2026-07-01", "2026-07-10", "USD", DURATIONS, priceMap);
    expect(result).toBeNull();
  });
});
