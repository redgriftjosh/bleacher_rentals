import { describe, it, expect } from "vitest";
import { calculateUserAlerts } from "./alerts";
import type { CurrentUserState } from "../state/useCurrentUserStore";
import type { DriverPayRange } from "../logic/driverPayRanges";

function driverState(overrides: Partial<CurrentUserState> = {}): CurrentUserState {
  return {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    isDriver: true,
    payRateCents: null,
    payRanges: [],
    ...overrides,
  } as CurrentUserState;
}

function range(
  minValue: number | null,
  maxValue: number | null,
  rateCents: number | null,
): DriverPayRange {
  return { id: crypto.randomUUID(), minValue, maxValue, rateCents };
}

describe("calculateUserAlerts — driver pay", () => {
  it("wants a flat pay rate when there are no ranges", () => {
    expect(calculateUserAlerts(driverState())).toContain("Missing Pay Rate");
  });

  it("still wants a flat pay rate when the ranges leave values uncovered", () => {
    const alerts = calculateUserAlerts(driverState({ payRanges: [range(0, 100, 150)] }));
    expect(alerts).toContain("Missing Pay Rate");
  });

  it("still wants a flat pay rate when the ranges start above zero", () => {
    const alerts = calculateUserAlerts(driverState({ payRanges: [range(50, null, 150)] }));
    expect(alerts).toContain("Missing Pay Rate");
  });

  it("drops the pay rate alert when the ranges cover everything", () => {
    const alerts = calculateUserAlerts(
      driverState({ payRanges: [range(0, 100, 150), range(100, null, 125)] }),
    );
    expect(alerts).not.toContain("Missing Pay Rate");
  });

  it("flags ranges that would not save", () => {
    const alerts = calculateUserAlerts(
      driverState({ payRateCents: 150, payRanges: [range(100, 50, 125)] }),
    );
    expect(alerts).toContain("Invalid Pay Ranges");
  });

  it("stays quiet on a driver with a flat rate and sound ranges", () => {
    const alerts = calculateUserAlerts(
      driverState({ payRateCents: 150, payRanges: [range(300, null, 100)] }),
    );
    expect(alerts).toEqual([]);
  });

  it("ignores pay ranges on a non-driver", () => {
    const alerts = calculateUserAlerts(
      driverState({ isDriver: false, payRanges: [range(100, 50, 125)] }),
    );
    expect(alerts).toEqual([]);
  });
});
