import { describe, it, expect } from "vitest";
import { isBleacherOwnedByAM } from "./isBleacherOwnedByAM";

describe("isBleacherOwnedByAM", () => {
  const amId = "am-id-1";

  // ═══ Positive — AM owns the bleacher ═══

  it("true when AM is summer account manager", () => {
    expect(
      isBleacherOwnedByAM({
        summerAccountManagerUuid: amId,
        winterAccountManagerUuid: "other-am",
        currentAccountManagerId: amId,
      }),
    ).toBe(true);
  });

  it("true when AM is winter account manager", () => {
    expect(
      isBleacherOwnedByAM({
        summerAccountManagerUuid: "other-am",
        winterAccountManagerUuid: amId,
        currentAccountManagerId: amId,
      }),
    ).toBe(true);
  });

  it("true when AM is both summer and winter", () => {
    expect(
      isBleacherOwnedByAM({
        summerAccountManagerUuid: amId,
        winterAccountManagerUuid: amId,
        currentAccountManagerId: amId,
      }),
    ).toBe(true);
  });

  // ═══ Negative — bleacher belongs to other AM ═══

  it("false when both seasons assigned to other AM", () => {
    expect(
      isBleacherOwnedByAM({
        summerAccountManagerUuid: "other-am",
        winterAccountManagerUuid: "other-am-2",
        currentAccountManagerId: amId,
      }),
    ).toBe(false);
  });

  it("false when bleacher has no AM assigned", () => {
    expect(
      isBleacherOwnedByAM({
        summerAccountManagerUuid: null,
        winterAccountManagerUuid: null,
        currentAccountManagerId: amId,
      }),
    ).toBe(false);
  });

  // ═══ Edge cases ═══

  it("false when currentAccountManagerId is null", () => {
    expect(
      isBleacherOwnedByAM({
        summerAccountManagerUuid: amId,
        winterAccountManagerUuid: amId,
        currentAccountManagerId: null,
      }),
    ).toBe(false);
  });

  it("false when all values are null", () => {
    expect(
      isBleacherOwnedByAM({
        summerAccountManagerUuid: null,
        winterAccountManagerUuid: null,
        currentAccountManagerId: null,
      }),
    ).toBe(false);
  });

  it("false when AM UUID fields are undefined", () => {
    expect(
      isBleacherOwnedByAM({
        summerAccountManagerUuid: undefined,
        winterAccountManagerUuid: undefined,
        currentAccountManagerId: amId,
      }),
    ).toBe(false);
  });
});
