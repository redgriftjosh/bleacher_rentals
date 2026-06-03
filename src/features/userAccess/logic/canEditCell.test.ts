import { describe, it, expect } from "vitest";
import { canEditCell } from "./canEditCell";

describe("canEditCell (Dashboard cell editing)", () => {
  const ownBleacher = {
    summerAccountManagerUuid: "am-id-1",
    winterAccountManagerUuid: null,
  };
  const otherBleacher = {
    summerAccountManagerUuid: "am-id-other",
    winterAccountManagerUuid: "am-id-other-2",
  };

  // ═══ Admin ═══

  it("admin can always edit a cell", () => {
    expect(
      canEditCell({
        isAdmin: true,
        isAccountManager: false,
        accountManagerId: null,
        bleacherUuid: "b-1",
        bleacher: otherBleacher,
      }),
    ).toBe(true);
  });

  it("admin can edit even without bleacher data", () => {
    expect(
      canEditCell({
        isAdmin: true,
        isAccountManager: false,
        accountManagerId: null,
        bleacherUuid: null,
        bleacher: null,
      }),
    ).toBe(true);
  });

  // ═══ Viewer ═══

  it("viewer cannot edit any cell", () => {
    expect(
      canEditCell({
        isAdmin: false,
        isAccountManager: false,
        accountManagerId: null,
        bleacherUuid: "b-1",
        bleacher: ownBleacher,
      }),
    ).toBe(false);
  });

  it("viewer cannot edit even with matching bleacher data", () => {
    expect(
      canEditCell({
        isAdmin: false,
        isAccountManager: false,
        accountManagerId: "am-id-1",
        bleacherUuid: "b-1",
        bleacher: ownBleacher,
      }),
    ).toBe(false);
  });

  // ═══ AM: own bleacher ═══

  it("AM can edit cell of own bleacher (summer)", () => {
    expect(
      canEditCell({
        isAdmin: false,
        isAccountManager: true,
        accountManagerId: "am-id-1",
        bleacherUuid: "b-1",
        bleacher: ownBleacher,
      }),
    ).toBe(true);
  });

  it("AM can edit cell of own bleacher (winter)", () => {
    expect(
      canEditCell({
        isAdmin: false,
        isAccountManager: true,
        accountManagerId: "am-id-1",
        bleacherUuid: "b-1",
        bleacher: {
          summerAccountManagerUuid: "other",
          winterAccountManagerUuid: "am-id-1",
        },
      }),
    ).toBe(true);
  });

  // ═══ AM: other's bleacher ═══

  it("AM cannot edit cell of other AM's bleacher", () => {
    expect(
      canEditCell({
        isAdmin: false,
        isAccountManager: true,
        accountManagerId: "am-id-1",
        bleacherUuid: "b-1",
        bleacher: otherBleacher,
      }),
    ).toBe(false);
  });

  // ═══ AM: edge cases ═══

  it("AM cannot edit when bleacherUuid is null", () => {
    expect(
      canEditCell({
        isAdmin: false,
        isAccountManager: true,
        accountManagerId: "am-id-1",
        bleacherUuid: null,
        bleacher: null,
      }),
    ).toBe(false);
  });

  it("AM cannot edit when bleacher data is not found", () => {
    expect(
      canEditCell({
        isAdmin: false,
        isAccountManager: true,
        accountManagerId: "am-id-1",
        bleacherUuid: "b-unknown",
        bleacher: null,
      }),
    ).toBe(false);
  });

  it("AM cannot edit when accountManagerId is null", () => {
    expect(
      canEditCell({
        isAdmin: false,
        isAccountManager: true,
        accountManagerId: null,
        bleacherUuid: "b-1",
        bleacher: ownBleacher,
      }),
    ).toBe(false);
  });
});
