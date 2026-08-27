import { describe, it, expect } from "vitest";
import {
  BLEACHER_CHANGE_REASONS,
  bleacherChangeReasonLabel,
  buildActualBleacherUpdate,
  resolveBleacherSwapState,
} from "./bleacherSwap";

describe("bleacherChangeReasonLabel", () => {
  it("maps every code the CHECK constraint allows", () => {
    expect(BLEACHER_CHANGE_REASONS.map((r) => r.code)).toEqual([
      "hard_to_access",
      "blocked_by_other_units",
      "damaged",
      "not_on_site",
      "other",
    ]);
    expect(bleacherChangeReasonLabel("hard_to_access")).toBe("Hard to get to");
    expect(bleacherChangeReasonLabel("blocked_by_other_units")).toBe("Blocked by other bleachers");
    expect(bleacherChangeReasonLabel("damaged")).toBe("Assigned one is damaged");
    expect(bleacherChangeReasonLabel("not_on_site")).toBe("Not on site");
    expect(bleacherChangeReasonLabel("other")).toBe("Other");
  });

  it("falls back instead of throwing on a missing reason", () => {
    expect(bleacherChangeReasonLabel(null)).toBe("No reason given");
  });

  it("falls back instead of throwing on a code it does not know", () => {
    // A newer mobile build could ship a code this web build has never heard of.
    expect(bleacherChangeReasonLabel("teleported_away")).toBe("Unrecognized reason");
  });
});

describe("resolveBleacherSwapState", () => {
  it("reports nothing while the driver has not confirmed", () => {
    expect(
      resolveBleacherSwapState({
        bleacherUuid: "b-assigned",
        actualBleacherUuid: null,
        bleacherChangeReason: null,
      }),
    ).toEqual({ kind: "unconfirmed" });
  });

  it("stays unconfirmed even if a stale reason is left on the row", () => {
    expect(
      resolveBleacherSwapState({
        bleacherUuid: "b-assigned",
        actualBleacherUuid: null,
        bleacherChangeReason: "damaged",
      }),
    ).toEqual({ kind: "unconfirmed" });
  });

  it("reports a quiet confirmation when the driver took the assigned bleacher", () => {
    expect(
      resolveBleacherSwapState({
        bleacherUuid: "b-assigned",
        actualBleacherUuid: "b-assigned",
        bleacherChangeReason: null,
      }),
    ).toEqual({ kind: "confirmed", bleacherUuid: "b-assigned" });
  });

  it("still reports a confirmation when a reason survived a manager correction", () => {
    // No cross-column CHECK exists, so reason can legitimately outlive the swap.
    expect(
      resolveBleacherSwapState({
        bleacherUuid: "b-assigned",
        actualBleacherUuid: "b-assigned",
        bleacherChangeReason: "damaged",
      }),
    ).toEqual({ kind: "confirmed", bleacherUuid: "b-assigned" });
  });

  it("reports a swap with both bleachers and the reason label", () => {
    expect(
      resolveBleacherSwapState({
        bleacherUuid: "b-assigned",
        actualBleacherUuid: "b-actual",
        bleacherChangeReason: "blocked_by_other_units",
      }),
    ).toEqual({
      kind: "swapped",
      assignedBleacherUuid: "b-assigned",
      actualBleacherUuid: "b-actual",
      reasonCode: "blocked_by_other_units",
      reasonLabel: "Blocked by other bleachers",
    });
  });

  it("reports a swap with a fallback label when the reason is missing", () => {
    expect(
      resolveBleacherSwapState({
        bleacherUuid: "b-assigned",
        actualBleacherUuid: "b-actual",
        bleacherChangeReason: null,
      }),
    ).toEqual({
      kind: "swapped",
      assignedBleacherUuid: "b-assigned",
      actualBleacherUuid: "b-actual",
      reasonCode: null,
      reasonLabel: "No reason given",
    });
  });

  it("treats a confirmation on a tracker with no assigned bleacher as a swap", () => {
    expect(
      resolveBleacherSwapState({
        bleacherUuid: null,
        actualBleacherUuid: "b-actual",
        bleacherChangeReason: "other",
      }),
    ).toEqual({
      kind: "swapped",
      assignedBleacherUuid: null,
      actualBleacherUuid: "b-actual",
      reasonCode: "other",
      reasonLabel: "Other",
    });
  });

  it("is unconfirmed when neither bleacher is known", () => {
    expect(
      resolveBleacherSwapState({
        bleacherUuid: null,
        actualBleacherUuid: null,
        bleacherChangeReason: null,
      }),
    ).toEqual({ kind: "unconfirmed" });
  });
});

describe("buildActualBleacherUpdate", () => {
  it("clears the reason in the same update when the manager reverts to the assigned bleacher", () => {
    expect(
      buildActualBleacherUpdate({
        assignedBleacherUuid: "b-assigned",
        nextActualBleacherUuid: "b-assigned",
        nextReason: "damaged",
      }),
    ).toEqual({ actual_bleacher_uuid: "b-assigned", bleacher_change_reason: null });
  });

  it("keeps the chosen reason when the manager points at a different bleacher", () => {
    expect(
      buildActualBleacherUpdate({
        assignedBleacherUuid: "b-assigned",
        nextActualBleacherUuid: "b-actual",
        nextReason: "not_on_site",
      }),
    ).toEqual({ actual_bleacher_uuid: "b-actual", bleacher_change_reason: "not_on_site" });
  });

  it("defaults an unspecified reason to 'other' rather than blocking the save", () => {
    expect(
      buildActualBleacherUpdate({
        assignedBleacherUuid: "b-assigned",
        nextActualBleacherUuid: "b-actual",
        nextReason: null,
      }),
    ).toEqual({ actual_bleacher_uuid: "b-actual", bleacher_change_reason: "other" });
  });

  it("defaults a reason the CHECK constraint would reject to 'other'", () => {
    // A rejected write wedges the whole PowerSync upload queue — never send one.
    expect(
      buildActualBleacherUpdate({
        assignedBleacherUuid: "b-assigned",
        nextActualBleacherUuid: "b-actual",
        nextReason: "teleported_away",
      }),
    ).toEqual({ actual_bleacher_uuid: "b-actual", bleacher_change_reason: "other" });
  });

  it("leaves the confirmation untouched when the manager selected nothing", () => {
    expect(
      buildActualBleacherUpdate({
        assignedBleacherUuid: "b-assigned",
        nextActualBleacherUuid: null,
        nextReason: null,
      }),
    ).toEqual({ actual_bleacher_uuid: null, bleacher_change_reason: null });
  });

  it("treats a swap onto a tracker with no assigned bleacher as a swap", () => {
    expect(
      buildActualBleacherUpdate({
        assignedBleacherUuid: null,
        nextActualBleacherUuid: "b-actual",
        nextReason: "hard_to_access",
      }),
    ).toEqual({ actual_bleacher_uuid: "b-actual", bleacher_change_reason: "hard_to_access" });
  });

  it("is idempotent — replaying the same input yields the same fields", () => {
    const input = {
      assignedBleacherUuid: "b-assigned",
      nextActualBleacherUuid: "b-actual",
      nextReason: "damaged" as const,
    };
    expect(buildActualBleacherUpdate(input)).toEqual(buildActualBleacherUpdate(input));
  });
});
