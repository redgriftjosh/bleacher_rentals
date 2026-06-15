import { describe, it, expect } from "vitest";
import { classifyWorkTrackerTypes } from "./classifyWorkTrackerTypes";

describe("classifyWorkTrackerTypes", () => {
  const existing = { id: "existing-1", _new: false, _deleted: false };
  const existingDeleted = { id: "existing-2", _new: false, _deleted: true };
  const brandNew = { id: "new-1", _new: true, _deleted: false };
  const newThenDeleted = { id: "new-2", _new: true, _deleted: true };

  const all = [existing, existingDeleted, brandNew, newThenDeleted];

  it("toDelete: existing types marked deleted", () => {
    const { toDelete } = classifyWorkTrackerTypes(all);
    expect(toDelete).toEqual([existingDeleted]);
  });

  it("toInsert: new types not deleted", () => {
    const { toInsert } = classifyWorkTrackerTypes(all);
    expect(toInsert).toEqual([brandNew]);
  });

  it("toUpdate: existing types not deleted", () => {
    const { toUpdate } = classifyWorkTrackerTypes(all);
    expect(toUpdate).toEqual([existing]);
  });

  it("visible: everything not deleted", () => {
    const { visible } = classifyWorkTrackerTypes(all);
    expect(visible).toEqual([existing, brandNew]);
  });

  it("new then deleted is discarded from all buckets", () => {
    const { toDelete, toInsert, toUpdate, visible } = classifyWorkTrackerTypes(all);
    const allBuckets = [...toDelete, ...toInsert, ...toUpdate];
    expect(allBuckets).not.toContainEqual(newThenDeleted);
    expect(visible).not.toContainEqual(newThenDeleted);
  });

  it("empty input returns empty buckets", () => {
    const { toDelete, toInsert, toUpdate, visible } = classifyWorkTrackerTypes([]);
    expect(toDelete).toEqual([]);
    expect(toInsert).toEqual([]);
    expect(toUpdate).toEqual([]);
    expect(visible).toEqual([]);
  });

  it("all existing, none deleted", () => {
    const types = [
      { id: "a", _new: false, _deleted: false },
      { id: "b", _new: false, _deleted: false },
    ];
    const { toDelete, toInsert, toUpdate, visible } = classifyWorkTrackerTypes(types);
    expect(toDelete).toEqual([]);
    expect(toInsert).toEqual([]);
    expect(toUpdate).toEqual(types);
    expect(visible).toEqual(types);
  });

  it("all existing, all deleted", () => {
    const types = [
      { id: "a", _new: false, _deleted: true },
      { id: "b", _new: false, _deleted: true },
    ];
    const { toDelete, toInsert, toUpdate, visible } = classifyWorkTrackerTypes(types);
    expect(toDelete).toEqual(types);
    expect(toInsert).toEqual([]);
    expect(toUpdate).toEqual([]);
    expect(visible).toEqual([]);
  });
});
