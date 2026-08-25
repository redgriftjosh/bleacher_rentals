import { describe, it, expect } from "vitest";
import { resolveDriverScope } from "./driverZoneScope";

describe("resolveDriverScope", () => {
  it("scopes an account manager to the drivers in their zones", () => {
    expect(
      resolveDriverScope({ isAdmin: false, accountManagerUuid: "am-1", showAll: false }),
    ).toEqual({ kind: "zones", accountManagerUuid: "am-1" });
  });

  it("shows everyone when the user explicitly asks for all drivers", () => {
    expect(
      resolveDriverScope({ isAdmin: false, accountManagerUuid: "am-1", showAll: true }),
    ).toEqual({ kind: "all" });
  });

  it("shows everyone to admins", () => {
    expect(resolveDriverScope({ isAdmin: true, accountManagerUuid: null, showAll: false })).toEqual(
      {
        kind: "all",
      },
    );
  });

  it("shows nothing to a user who is neither admin nor an active account manager", () => {
    expect(
      resolveDriverScope({ isAdmin: false, accountManagerUuid: null, showAll: false }),
    ).toEqual({ kind: "none" });
  });
});
