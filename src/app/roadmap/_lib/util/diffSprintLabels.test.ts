import { describe, it, expect } from "vitest";
import { diffSprintLabels } from "./diffSprintLabels";

describe("diffSprintLabels", () => {
  it("adds every label when none exist yet", () => {
    expect(diffSprintLabels([], ["s1", "s2"])).toEqual({ toAdd: ["s1", "s2"], toRemove: [] });
  });

  it("removes every label when the selection is cleared", () => {
    expect(diffSprintLabels(["s1", "s2"], [])).toEqual({ toAdd: [], toRemove: ["s1", "s2"] });
  });

  it("touches nothing when the selection is unchanged", () => {
    expect(diffSprintLabels(["s1", "s2"], ["s2", "s1"])).toEqual({ toAdd: [], toRemove: [] });
  });

  it("writes only the difference", () => {
    expect(diffSprintLabels(["s1", "s2"], ["s2", "s3"])).toEqual({
      toAdd: ["s3"],
      toRemove: ["s1"],
    });
  });

  it("ignores duplicates in the desired selection", () => {
    expect(diffSprintLabels([], ["s1", "s1"])).toEqual({ toAdd: ["s1"], toRemove: [] });
  });
});
