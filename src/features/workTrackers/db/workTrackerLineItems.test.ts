import { describe, expect, it } from "vitest";
import {
  calculateWorkTrackerLineItemsTotalCents,
  reconcileRequirementLineItems,
  type DraftWorkTrackerLineItem,
} from "./workTrackerLineItems";

const item = (
  id: string,
  type: DraftWorkTrackerLineItem["type"],
  isAutomaticallyManaged = false,
): DraftWorkTrackerLineItem => ({
  id,
  type,
  qtyDecimal: 1,
  unitAmtCents: 0,
  description: null,
  isAutomaticallyManaged,
});

describe("calculateWorkTrackerLineItemsTotalCents", () => {
  it("totals every line item, including automatically managed setup and teardown", () => {
    const lines = [
      { ...item("haul", "hauling"), qtyDecimal: 2, unitAmtCents: 10_050 },
      { ...item("setup", "setup", true), unitAmtCents: 12_345 },
      { ...item("teardown", "teardown", true), unitAmtCents: 6_789 },
      { ...item("custom", "custom"), qtyDecimal: 3, unitAmtCents: 250 },
    ];

    expect(calculateWorkTrackerLineItemsTotalCents(lines)).toBe(39_984);
  });

  it("returns zero when there are no line items", () => {
    expect(calculateWorkTrackerLineItemsTotalCents([])).toBe(0);
  });

  it("bills a fractional quantity — 2.5 hours at $19.99 is $49.98", () => {
    const lines = [{ ...item("maint", "maintenance"), qtyDecimal: 2.5, unitAmtCents: 1_999 }];

    expect(calculateWorkTrackerLineItemsTotalCents(lines)).toBe(4_998);
  });

  it("rounds float dust out of the cents total rather than storing it", () => {
    // 0.3 * 1000 is 299.99999999999994 in IEEE 754; the stored total is cents.
    const lines = [{ ...item("dust", "custom"), qtyDecimal: 0.3, unitAmtCents: 1_000 }];

    expect(calculateWorkTrackerLineItemsTotalCents(lines)).toBe(300);
  });
});

describe("reconcileRequirementLineItems", () => {
  it("adds exactly one managed line for each checked requirement", () => {
    const result = reconcileRequirementLineItems(
      [item("haul", "hauling"), item("deadhead", "deadhead")],
      { setupRequired: true, teardownRequired: true },
      (() => {
        let id = 0;
        return () => `generated-${++id}`;
      })(),
    );

    expect(result.map(({ type }) => type)).toEqual(["hauling", "deadhead", "setup", "teardown"]);
    expect(result.filter((line) => line.isAutomaticallyManaged)).toHaveLength(2);
  });

  it("uses the selected driver's setup and teardown amounts for new managed lines", () => {
    const result = reconcileRequirementLineItems(
      [],
      {
        setupRequired: true,
        teardownRequired: true,
        setupCents: 12_345,
        teardownCents: 6_789,
      },
      (() => {
        let id = 0;
        return () => `generated-${++id}`;
      })(),
    );

    expect(result.map(({ type, unitAmtCents }) => ({ type, unitAmtCents }))).toEqual([
      { type: "setup", unitAmtCents: 12_345 },
      { type: "teardown", unitAmtCents: 6_789 },
    ]);
  });

  it("defaults missing setup and teardown amounts to zero", () => {
    const result = reconcileRequirementLineItems([], {
      setupRequired: true,
      teardownRequired: true,
    });

    expect(result.map(({ unitAmtCents }) => unitAmtCents)).toEqual([0, 0]);
  });

  it("deduplicates managed requirement lines", () => {
    const result = reconcileRequirementLineItems(
      [item("setup-1", "setup", true), item("setup-2", "setup", true)],
      { setupRequired: true, teardownRequired: false },
    );

    expect(result).toEqual([item("setup-1", "setup", true)]);
  });

  it("removes unchecked managed lines but preserves user-created lines", () => {
    const custom = { ...item("custom", "custom"), description: "Site visit" };
    const userSetup = item("user-setup", "setup");
    const result = reconcileRequirementLineItems(
      [
        item("auto-setup", "setup", true),
        item("auto-teardown", "teardown", true),
        custom,
        userSetup,
      ],
      { setupRequired: false, teardownRequired: false },
    );

    expect(result).toEqual([custom, userSetup]);
  });
});
