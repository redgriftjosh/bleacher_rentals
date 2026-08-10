import { describe, it, expect } from "vitest";
import { hasAdminOrAccountManagerRole } from "./hasAdminOrAccountManagerRole";

describe("hasAdminOrAccountManagerRole", () => {
  it("allows admin", () => {
    expect(hasAdminOrAccountManagerRole(["admin"])).toBe(true);
  });

  it("allows account_manager", () => {
    expect(hasAdminOrAccountManagerRole(["account_manager"])).toBe(true);
  });

  it("allows admin + account_manager", () => {
    expect(hasAdminOrAccountManagerRole(["admin", "account_manager"])).toBe(true);
  });

  it("denies viewer", () => {
    expect(hasAdminOrAccountManagerRole(["viewer"])).toBe(false);
  });

  it("denies developer alone", () => {
    expect(hasAdminOrAccountManagerRole(["developer"])).toBe(false);
  });
});
