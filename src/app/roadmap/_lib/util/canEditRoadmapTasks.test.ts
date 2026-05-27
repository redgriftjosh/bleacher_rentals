import { describe, it, expect } from "vitest";
import { canEditRoadmapTasks } from "./canEditRoadmapTasks";

describe("canEditRoadmapTasks", () => {
  it("admin (isDeveloper=true) → true", () => {
    expect(canEditRoadmapTasks(true, false)).toBe(true);
  });

  it("developer (isDeveloper=true) → true", () => {
    expect(canEditRoadmapTasks(true, false)).toBe(true);
  });

  it("account manager → true", () => {
    expect(canEditRoadmapTasks(false, true)).toBe(true);
  });

  it("admin + account manager → true", () => {
    expect(canEditRoadmapTasks(true, true)).toBe(true);
  });

  it("viewer (neither developer nor AM) → false", () => {
    expect(canEditRoadmapTasks(false, false)).toBe(false);
  });
});
