import { describe, expect, it } from "vitest";
import {
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
  quantity: 1,
  unitAmtCents: 0,
  description: null,
  isAutomaticallyManaged,
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
