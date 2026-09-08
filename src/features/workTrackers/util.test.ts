import { describe, it, expect } from "vitest";
import {
  calculateDriverPay,
  calculateFinancialTotals,
  calculateTravelTotals,
  describeDriverPay,
  formatDriveTime,
  formatMileage,
  type DistanceData,
  type DriverPaymentData,
} from "./util";
import type { WorkTrackersResult } from "./db/db";
import type { DriverPayRange } from "@/features/manageTeam/logic/driverPayRanges";

const MI = 1609.34;

function driver(overrides: Partial<DriverPaymentData> = {}): DriverPaymentData {
  return {
    taxDec: 0,
    payRateCents: 300,
    payCurrency: "CAD",
    payPerUnit: "MI",
    payRanges: [],
    ...overrides,
  };
}

function trip(overrides: Partial<DistanceData> = {}): DistanceData {
  return {
    distanceMeters: null,
    distanceText: null,
    durationSeconds: null,
    durationText: null,
    ...overrides,
  };
}

function range(
  id: string,
  minValue: number,
  maxValue: number | null,
  rateCents: number,
): DriverPayRange {
  return { id, minValue, maxValue, rateCents };
}

describe("describeDriverPay — no ranges (unchanged behaviour)", () => {
  it("pays the flat rate per mile", () => {
    const result = describeDriverPay(driver(), trip({ distanceMeters: 100 * MI }));
    expect(result?.rateCents).toBe(300);
    expect(result?.amount).toBeCloseTo(300, 5);
  });

  it("pays the flat rate per kilometre", () => {
    const result = describeDriverPay(
      driver({ payPerUnit: "KM", payRateCents: 150 }),
      trip({ distanceMeters: 50_000 }),
    );
    expect(result?.value).toBeCloseTo(50, 5);
    expect(result?.amount).toBeCloseTo(75, 5);
  });

  it("pays the flat rate per hour off duration, not distance", () => {
    const result = describeDriverPay(
      driver({ payPerUnit: "HR", payRateCents: 2500 }),
      trip({ distanceMeters: 999_999, durationSeconds: 5400 }),
    );
    expect(result?.value).toBeCloseTo(1.5, 5);
    expect(result?.amount).toBeCloseTo(37.5, 5);
  });

  it("treats an absent payRanges field the same as an empty one", () => {
    const { payRanges: _omitted, ...withoutRanges } = driver();
    const result = describeDriverPay(withoutRanges, trip({ distanceMeters: 10 * MI }));
    expect(result?.rateCents).toBe(300);
  });

  it("returns null when the trip has no distance for a distance-paid driver", () => {
    expect(describeDriverPay(driver(), trip({ durationSeconds: 3600 }))).toBeNull();
  });

  it("returns null when the trip has no duration for an hourly driver", () => {
    expect(
      describeDriverPay(driver({ payPerUnit: "HR" }), trip({ distanceMeters: 10 * MI })),
    ).toBeNull();
  });

  it("returns null on a zero rate rather than writing $0.00 into the field", () => {
    expect(
      describeDriverPay(driver({ payRateCents: 0 }), trip({ distanceMeters: 100 * MI })),
    ).toBeNull();
  });
});

describe("describeDriverPay — one range", () => {
  it("uses the range's rate, not the flat rate", () => {
    const result = describeDriverPay(
      driver({ payRateCents: 300, payRanges: [range("a", 0, null, 225)] }),
      trip({ distanceMeters: 52.5 * MI }),
    );

    expect(result?.rateCents).toBe(225);
    expect(result?.amount).toBeCloseTo(118.125, 5);
  });

  it("falls back to the flat rate for a trip below the only range", () => {
    const result = describeDriverPay(
      driver({ payRateCents: 300, payRanges: [range("a", 100, null, 225)] }),
      trip({ distanceMeters: 50 * MI }),
    );

    expect(result?.rateCents).toBe(300);
    expect(result?.amount).toBeCloseTo(150, 5);
  });
});

describe("describeDriverPay — several ranges", () => {
  const tiered = driver({
    payRateCents: 400,
    payRanges: [range("a", 0, 100, 300), range("b", 100, 200, 250), range("c", 200, null, 225)],
  });

  it("picks the range the trip falls into", () => {
    expect(describeDriverPay(tiered, trip({ distanceMeters: 50 * MI }))?.rateCents).toBe(300);
    expect(describeDriverPay(tiered, trip({ distanceMeters: 150 * MI }))?.rateCents).toBe(250);
    expect(describeDriverPay(tiered, trip({ distanceMeters: 5000 * MI }))?.rateCents).toBe(225);
  });

  it("charges one rate across the whole trip, not a tier-by-tier sum", () => {
    // 150 miles in the 100–200 band: 150 × $2.50, NOT 100 × $3.00 + 50 × $2.50.
    const result = describeDriverPay(tiered, trip({ distanceMeters: 150 * MI }));
    expect(result?.amount).toBeCloseTo(375, 5);
  });

  it("treats a range start as inclusive and its end as exclusive", () => {
    expect(describeDriverPay(tiered, trip({ distanceMeters: 100 * MI }))?.rateCents).toBe(250);
    expect(describeDriverPay(tiered, trip({ distanceMeters: 200 * MI }))?.rateCents).toBe(225);
  });

  it("ignores the order the ranges arrive in", () => {
    const shuffled = driver({
      payRanges: [range("c", 200, null, 225), range("a", 0, 100, 300), range("b", 100, 200, 250)],
    });
    expect(describeDriverPay(shuffled, trip({ distanceMeters: 150 * MI }))?.rateCents).toBe(250);
  });

  it("falls back to the flat rate for a trip in a gap between ranges", () => {
    const gapped = driver({
      payRateCents: 400,
      payRanges: [range("a", 0, 50, 300), range("c", 200, null, 225)],
    });
    expect(describeDriverPay(gapped, trip({ distanceMeters: 100 * MI }))?.rateCents).toBe(400);
  });

  it("matches on hours for an hourly driver", () => {
    const hourly = driver({
      payPerUnit: "HR",
      payRateCents: 5000,
      payRanges: [range("a", 0, 2, 4000), range("b", 2, null, 3500)],
    });
    expect(describeDriverPay(hourly, trip({ durationSeconds: 3600 }))?.rateCents).toBe(4000);
    expect(describeDriverPay(hourly, trip({ durationSeconds: 4 * 3600 }))?.rateCents).toBe(3500);
  });
});

describe("describeDriverPay — shown work", () => {
  it("spells out the arithmetic", () => {
    const result = describeDriverPay(
      driver({ payRanges: [range("a", 0, null, 225)] }),
      trip({ distanceMeters: 52.5 * MI }),
    );

    expect(result?.text).toBe("52.5MI × $2.25/MI = $118.13");
  });

  it("uses the driver's own unit", () => {
    const result = describeDriverPay(
      driver({ payPerUnit: "KM", payRateCents: 150 }),
      trip({ distanceMeters: 50_000 }),
    );

    expect(result?.text).toBe("50.0KM × $1.50/KM = $75.00");
  });

  it("reads in hours for an hourly driver", () => {
    const result = describeDriverPay(
      driver({ payPerUnit: "HR", payRateCents: 2500 }),
      trip({ durationSeconds: 5400 }),
    );

    expect(result?.text).toBe("1.5HR × $25.00/HR = $37.50");
  });
});

describe("calculateDriverPay", () => {
  it("returns the same amount the breakdown describes", () => {
    const paymentData = driver({ payRanges: [range("a", 0, null, 225)] });
    const distanceData = trip({ distanceMeters: 52.5 * MI });

    expect(calculateDriverPay(paymentData, distanceData)).toBe(
      describeDriverPay(paymentData, distanceData)?.amount,
    );
  });

  it("still returns null when there is nothing to calculate", () => {
    expect(calculateDriverPay(driver(), trip())).toBeNull();
  });
});

describe("calculateFinancialTotals", () => {
  /** Two legs, $100.00 and $100.00, so the tax line is the rate in dollars. */
  function week(driverTax: number): WorkTrackersResult {
    return {
      workTrackers: [
        { workTracker: { pay_cents: 10_000 } },
        { workTracker: { pay_cents: 10_000 } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any,
      driverTax,
      driverAddress: null,
    };
  }

  it("charges a fractional provincial rate in full — Quebec is 14.975 %", () => {
    // 20000 * 0.14975 = 2995 cents. Under the old integer column the rate
    // arrived as 14, and the driver was short $19.50 on a $200 week.
    expect(calculateFinancialTotals(week(14.975))).toEqual({
      subtotal: 20_000,
      tax: 2_995,
      taxPercent: 14.975,
      total: 22_995,
    });
  });

  it("still handles a whole-percent rate", () => {
    expect(calculateFinancialTotals(week(13))).toEqual({
      subtotal: 20_000,
      tax: 2_600,
      taxPercent: 13,
      total: 22_600,
    });
  });
});

describe("formatMileage", () => {
  it("formats miles with kilometers alongside", () => {
    // 34,439m ≈ 21.4mi ≈ 34.4km
    expect(formatMileage(34_439)).toBe("21.4 mi (34.4 km)");
  });

  it("is blank for null or undefined", () => {
    expect(formatMileage(null)).toBe("");
    expect(formatMileage(undefined)).toBe("");
  });

  it("is not blank for zero", () => {
    expect(formatMileage(0)).toBe("0.0 mi (0.0 km)");
  });
});

describe("formatDriveTime", () => {
  it("formats minutes as hours to one decimal", () => {
    expect(formatDriveTime(144)).toBe("2.4 hrs");
  });

  it("is blank for null or undefined", () => {
    expect(formatDriveTime(null)).toBe("");
    expect(formatDriveTime(undefined)).toBe("");
  });

  it("is not blank for zero", () => {
    expect(formatDriveTime(0)).toBe("0.0 hrs");
  });
});

describe("calculateTravelTotals", () => {
  function week(
    rows: { distance_meters?: number | null; drive_minutes?: number | null }[],
  ): WorkTrackersResult {
    return {
      workTrackers: rows.map((r) => ({ workTracker: r })) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      driverTax: 0,
      driverAddress: null,
    };
  }

  it("sums distance and drive time across every leg", () => {
    expect(
      calculateTravelTotals(
        week([
          { distance_meters: 10_000, drive_minutes: 30 },
          { distance_meters: 5_000, drive_minutes: 15 },
        ]),
      ),
    ).toEqual({ totalDistanceMeters: 15_000, totalDriveMinutes: 45 });
  });

  it("treats a missing value on any leg as 0 rather than dropping the total", () => {
    expect(
      calculateTravelTotals(
        week([{ distance_meters: 10_000, drive_minutes: null }, { distance_meters: null }]),
      ),
    ).toEqual({ totalDistanceMeters: 10_000, totalDriveMinutes: 0 });
  });

  it("is all zeros for an empty week", () => {
    expect(calculateTravelTotals(week([]))).toEqual({
      totalDistanceMeters: 0,
      totalDriveMinutes: 0,
    });
  });
});
