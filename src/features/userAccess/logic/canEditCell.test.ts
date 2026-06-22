import { describe, it, expect } from "vitest";
import { canEditCell } from "./canEditCell";

describe("canEditCell (Dashboard cell editing)", () => {
  const zoneA = "zone-a";
  const zoneB = "zone-b";
  const ownBleacher = { zoneUuid: zoneA };
  const otherBleacher = { zoneUuid: zoneB };

  // ═══ Admin ═══

  it("admin can always edit a cell", () => {
    expect(
      canEditCell({
        isAdmin: true,
        isAccountManager: false,
        accountManagerZoneIds: [],
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
        accountManagerZoneIds: [],
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
        accountManagerZoneIds: [],
        bleacherUuid: "b-1",
        bleacher: ownBleacher,
      }),
    ).toBe(false);
  });

  // ═══ AM: own zone ═══

  it("AM can edit cell of bleacher in their zone", () => {
    expect(
      canEditCell({
        isAdmin: false,
        isAccountManager: true,
        accountManagerZoneIds: [zoneA],
        bleacherUuid: "b-1",
        bleacher: ownBleacher,
      }),
    ).toBe(true);
  });

  // ═══ AM: other zone ═══

  it("AM cannot edit cell of bleacher in another zone", () => {
    expect(
      canEditCell({
        isAdmin: false,
        isAccountManager: true,
        accountManagerZoneIds: [zoneA],
        bleacherUuid: "b-1",
        bleacher: otherBleacher,
      }),
    ).toBe(false);
  });

  it("AM cannot edit bleacher with no zone", () => {
    expect(
      canEditCell({
        isAdmin: false,
        isAccountManager: true,
        accountManagerZoneIds: [zoneA],
        bleacherUuid: "b-1",
        bleacher: { zoneUuid: null },
      }),
    ).toBe(false);
  });

  // ═══ AM: edge cases ═══

  it("AM cannot edit when bleacherUuid is null", () => {
    expect(
      canEditCell({
        isAdmin: false,
        isAccountManager: true,
        accountManagerZoneIds: [zoneA],
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
        accountManagerZoneIds: [zoneA],
        bleacherUuid: "b-unknown",
        bleacher: null,
      }),
    ).toBe(false);
  });

  it("AM cannot edit when they have no zones", () => {
    expect(
      canEditCell({
        isAdmin: false,
        isAccountManager: true,
        accountManagerZoneIds: [],
        bleacherUuid: "b-1",
        bleacher: ownBleacher,
      }),
    ).toBe(false);
  });
});
