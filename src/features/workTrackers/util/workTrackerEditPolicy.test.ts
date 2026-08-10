import { describe, it, expect } from "vitest";
import {
  buildWorkTrackerSnapshot,
  classifyWorkTrackerChanges,
  isWorkTrackerBlockedFromEdit,
  requiresUnacceptWarning,
  resolveEffectiveChangeType,
  resolveStatusOnSave,
  shouldSendDriverNotification,
  type WorkTrackerSnapshot,
} from "./workTrackerEditPolicy";
import { Tables } from "../../../../database.types";

const baseWorkTracker = {
  id: "wt-1",
  bleacher_uuid: "b-1",
  date: "2026-08-01",
  driver_uuid: "d-1",
  pickup_poc: null,
  pickup_time: "08:00",
  pickup_instructions: null,
  dropoff_poc: null,
  dropoff_time: "12:00",
  dropoff_instructions: null,
  notes: "Driver note",
  internal_notes: "Internal",
  pay_cents: 10000,
  teardown_required: false,
  setup_required: false,
  work_tracker_type_uuid: "type-1",
  distance_meters: 1000,
  drive_minutes: 30,
  project_number: "PRJ-1",
  status: "accepted",
} as Tables<"WorkTrackers">;

const baseAddress = {
  addressUuid: "addr-1",
  address: "123 Main St",
  city: "Austin",
  state: "TX",
  postalCode: "78701",
};

function cloneSnapshot(snapshot: WorkTrackerSnapshot): WorkTrackerSnapshot {
  return {
    ...snapshot,
    pickupAddress: snapshot.pickupAddress ? { ...snapshot.pickupAddress } : null,
    dropoffAddress: snapshot.dropoffAddress ? { ...snapshot.dropoffAddress } : null,
  };
}

describe("workTrackerEditPolicy", () => {
  const before = buildWorkTrackerSnapshot(baseWorkTracker, baseAddress, baseAddress)!;

  it("detects no changes", () => {
    expect(classifyWorkTrackerChanges(before, cloneSnapshot(before))).toBe("none");
  });

  it("classifies internal notes only as silent", () => {
    const after = cloneSnapshot(before);
    after.internal_notes = "Updated internal";
    expect(classifyWorkTrackerChanges(before, after)).toBe("silent");
  });

  it("classifies project number only as silent", () => {
    const after = cloneSnapshot(before);
    after.project_number = "PRJ-42";
    expect(classifyWorkTrackerChanges(before, after)).toBe("silent");
  });

  it("classifies driver notes only as notify-only", () => {
    const after = cloneSnapshot(before);
    after.notes = "Updated driver note";
    expect(classifyWorkTrackerChanges(before, after)).toBe("notify-only");
  });

  it("classifies bleacher change as un-accept", () => {
    const after = cloneSnapshot(before);
    after.bleacher_uuid = "b-2";
    expect(classifyWorkTrackerChanges(before, after)).toBe("un-accept");
  });

  it("prioritizes un-accept when notes and bleacher both change", () => {
    const after = cloneSnapshot(before);
    after.bleacher_uuid = "b-2";
    after.notes = "Updated driver note";
    expect(classifyWorkTrackerChanges(before, after)).toBe("un-accept");
  });

  it("blocks in-progress statuses from edit", () => {
    expect(isWorkTrackerBlockedFromEdit("dest_pickup")).toBe(true);
    expect(isWorkTrackerBlockedFromEdit("accepted")).toBe(false);
    expect(isWorkTrackerBlockedFromEdit("released")).toBe(false);
  });

  it("requires un-accept warning only for accepted + un-accept changes", () => {
    expect(requiresUnacceptWarning("accepted", "un-accept")).toBe(true);
    expect(requiresUnacceptWarning("accepted", "notify-only")).toBe(false);
    expect(requiresUnacceptWarning("released", "un-accept")).toBe(false);
  });

  it("resolves accepted trips back to released on un-accept changes", () => {
    expect(resolveStatusOnSave("accepted", "un-accept", "accepted")).toBe("released");
    expect(resolveStatusOnSave("released", "un-accept", "released")).toBe("released");
    expect(resolveStatusOnSave("accepted", "notify-only", "accepted")).toBe("accepted");
  });

  it("skips driver notifications for silent changes and draft trips", () => {
    expect(shouldSendDriverNotification("silent", "accepted", false)).toBe(false);
    expect(shouldSendDriverNotification("notify-only", "draft", false)).toBe(false);
    expect(shouldSendDriverNotification("notify-only", "accepted", false)).toBe(true);
  });

  it("skips change notifications for released but not accepted trips", () => {
    expect(shouldSendDriverNotification("un-accept", "released", false, "released")).toBe(false);
    expect(shouldSendDriverNotification("notify-only", "released", false, "released")).toBe(false);
    expect(
      shouldSendDriverNotification("un-accept", "accepted", false, "released"),
    ).toBe(true);
  });

  it("still notifies when a draft trip is released", () => {
    expect(shouldSendDriverNotification("un-accept", "draft", false, "released")).toBe(true);
  });

  it("treats status-only changes as notify-only", () => {
    expect(resolveEffectiveChangeType("none", true, false)).toBe("notify-only");
    expect(resolveEffectiveChangeType("none", false, false)).toBe("none");
    expect(resolveEffectiveChangeType("un-accept", true, false)).toBe("un-accept");
  });
});
