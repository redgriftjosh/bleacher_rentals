import { describe, it, expect } from "vitest";
import { canEditWorkTracker } from "./canEditWorkTracker";

describe("canEditWorkTracker", () => {
  const AM_ID = "am-1";

  // ═══ Admin ═══

  it("admin can edit any work tracker", () => {
    expect(
      canEditWorkTracker({
        isAdmin: true,
        isAccountManager: false,
        isNew: false,
        currentAccountManagerId: null,
        bleacherSummerAmUuid: null,
        bleacherWinterAmUuid: null,
      }),
    ).toBe(true);
  });

  it("admin can create new work tracker", () => {
    expect(
      canEditWorkTracker({
        isAdmin: true,
        isAccountManager: false,
        isNew: true,
        currentAccountManagerId: null,
        bleacherSummerAmUuid: null,
        bleacherWinterAmUuid: null,
      }),
    ).toBe(true);
  });

  // ═══ AM: Creating ═══

  it("AM can create new work tracker (canCreate=true)", () => {
    expect(
      canEditWorkTracker({
        isAdmin: false,
        isAccountManager: true,
        isNew: true,
        currentAccountManagerId: AM_ID,
        bleacherSummerAmUuid: null,
        bleacherWinterAmUuid: null,
        canCreate: true,
      }),
    ).toBe(true);
  });

  // ═══ AM: Bleacher ownership ═══

  it("AM can edit if summer AM matches", () => {
    expect(
      canEditWorkTracker({
        isAdmin: false,
        isAccountManager: true,
        isNew: false,
        currentAccountManagerId: AM_ID,
        bleacherSummerAmUuid: AM_ID,
        bleacherWinterAmUuid: "other-am",
      }),
    ).toBe(true);
  });

  it("AM can edit if winter AM matches", () => {
    expect(
      canEditWorkTracker({
        isAdmin: false,
        isAccountManager: true,
        isNew: false,
        currentAccountManagerId: AM_ID,
        bleacherSummerAmUuid: "other-am",
        bleacherWinterAmUuid: AM_ID,
      }),
    ).toBe(true);
  });

  it("AM can edit if both AM fields match", () => {
    expect(
      canEditWorkTracker({
        isAdmin: false,
        isAccountManager: true,
        isNew: false,
        currentAccountManagerId: AM_ID,
        bleacherSummerAmUuid: AM_ID,
        bleacherWinterAmUuid: AM_ID,
      }),
    ).toBe(true);
  });

  it("AM blocked if neither AM field matches", () => {
    expect(
      canEditWorkTracker({
        isAdmin: false,
        isAccountManager: true,
        isNew: false,
        currentAccountManagerId: AM_ID,
        bleacherSummerAmUuid: "other-am-1",
        bleacherWinterAmUuid: "other-am-2",
      }),
    ).toBe(false);
  });

  it("AM blocked if bleacher has no AM assigned", () => {
    expect(
      canEditWorkTracker({
        isAdmin: false,
        isAccountManager: true,
        isNew: false,
        currentAccountManagerId: AM_ID,
        bleacherSummerAmUuid: null,
        bleacherWinterAmUuid: null,
      }),
    ).toBe(false);
  });

  // ═══ Viewer ═══

  it("viewer cannot create new WT (canCreate=false)", () => {
    expect(
      canEditWorkTracker({
        isAdmin: false,
        isAccountManager: false,
        isNew: true,
        currentAccountManagerId: null,
        bleacherSummerAmUuid: null,
        bleacherWinterAmUuid: null,
        canCreate: false,
      }),
    ).toBe(false);
  });

  it("viewer always blocked on existing WT", () => {
    expect(
      canEditWorkTracker({
        isAdmin: false,
        isAccountManager: false,
        isNew: false,
        currentAccountManagerId: null,
        bleacherSummerAmUuid: null,
        bleacherWinterAmUuid: null,
      }),
    ).toBe(false);
  });

  // ═══ Edge cases ═══

  it("non-AM non-admin blocked even with matching bleacher", () => {
    expect(
      canEditWorkTracker({
        isAdmin: false,
        isAccountManager: false,
        isNew: false,
        currentAccountManagerId: AM_ID,
        bleacherSummerAmUuid: AM_ID,
        bleacherWinterAmUuid: null,
      }),
    ).toBe(false);
  });

  it("AM with null accountManagerId blocked", () => {
    expect(
      canEditWorkTracker({
        isAdmin: false,
        isAccountManager: true,
        isNew: false,
        currentAccountManagerId: null,
        bleacherSummerAmUuid: null,
        bleacherWinterAmUuid: null,
      }),
    ).toBe(false);
  });
});
