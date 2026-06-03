import { describe, it, expect } from "vitest";
import { filterBleachersByAM, BleacherWithAM } from "./filterBleachersByAM";

const bleachers: BleacherWithAM[] = [
  {
    id: "b1",
    bleacher_number: 1,
    summer_account_manager_uuid: "am-1",
    winter_account_manager_uuid: null,
  },
  {
    id: "b2",
    bleacher_number: 2,
    summer_account_manager_uuid: "am-2",
    winter_account_manager_uuid: "am-1",
  },
  {
    id: "b3",
    bleacher_number: 3,
    summer_account_manager_uuid: "am-2",
    winter_account_manager_uuid: "am-2",
  },
  {
    id: "b4",
    bleacher_number: 4,
    summer_account_manager_uuid: null,
    winter_account_manager_uuid: null,
  },
];

describe("filterBleachersByAM", () => {
  // ═══ Admin path (null AM) — return all ═══

  it("returns all bleachers when accountManagerId is null", () => {
    const result = filterBleachersByAM(bleachers, null);
    expect(result).toHaveLength(4);
  });

  it("returns all bleachers when accountManagerId is undefined", () => {
    const result = filterBleachersByAM(bleachers, undefined);
    expect(result).toHaveLength(4);
  });

  // ═══ AM-1: have b1 (summer) and b2 (winter) ═══

  it("AM-1 sees only own bleachers (b1 summer, b2 winter)", () => {
    const result = filterBleachersByAM(bleachers, "am-1");
    const ids = result.map((b) => b.id);
    expect(ids).toEqual(["b1", "b2"]);
  });

  // ═══ AM-2: have b2 (summer), b3 (both) ═══

  it("AM-2 sees own bleachers (b2 summer, b3 both)", () => {
    const result = filterBleachersByAM(bleachers, "am-2");
    const ids = result.map((b) => b.id);
    expect(ids).toEqual(["b2", "b3"]);
  });

  // ═══ AM without any bleachers ═══

  it("AM with no assigned bleachers sees empty list", () => {
    const result = filterBleachersByAM(bleachers, "am-999");
    expect(result).toHaveLength(0);
  });

  // ═══ Empty input ═══

  it("empty bleacher list returns empty regardless of AM", () => {
    const result = filterBleachersByAM([], "am-1");
    expect(result).toHaveLength(0);
  });

  // ═══ Bleacher shared between two AMs ═══

  it("b2 is visible to both AM-1 and AM-2", () => {
    const resultAM1 = filterBleachersByAM(bleachers, "am-1");
    const resultAM2 = filterBleachersByAM(bleachers, "am-2");
    expect(resultAM1.some((b) => b.id === "b2")).toBe(true);
    expect(resultAM2.some((b) => b.id === "b2")).toBe(true);
  });

  // ═══ Unassigned bleacher ═══

  it("b4 (no AM assigned) is not visible to any AM", () => {
    expect(filterBleachersByAM(bleachers, "am-1").some((b) => b.id === "b4")).toBe(false);
    expect(filterBleachersByAM(bleachers, "am-2").some((b) => b.id === "b4")).toBe(false);
  });
});
