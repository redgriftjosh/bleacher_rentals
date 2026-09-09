import { describe, it, expect } from "vitest";
import {
  buildWorkTrackerSnapshot,
  classifyWorkTrackerChanges,
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
  pickup_poc: "Jane Smith",
  pickup_poc_contact_uuid: "contact-1",
  pickup_time: "08:00",
  pickup_time_mode: "exact",
  pickup_time_start: "08:00:00",
  pickup_time_end: "08:00:00",
  pickup_instructions: null,
  dropoff_poc: "John Doe",
  dropoff_poc_contact_uuid: "contact-2",
  dropoff_time: "12:00",
  dropoff_time_mode: "exact",
  dropoff_time_start: "12:00:00",
  dropoff_time_end: "12:00:00",
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

  it("un-accepts when the pickup POC contact changes behind an identical name", () => {
    const after = cloneSnapshot(before);
    after.pickup_poc_contact_uuid = "contact-99";

    expect(classifyWorkTrackerChanges(before, after)).toBe("un-accept");
  });

  it("un-accepts when the dropoff POC contact changes behind an identical name", () => {
    const after = cloneSnapshot(before);
    after.dropoff_poc_contact_uuid = "contact-99";

    expect(classifyWorkTrackerChanges(before, after)).toBe("un-accept");
  });

  it("un-accepts when a legacy free-text POC is linked to a contact record", () => {
    const after = cloneSnapshot(before);
    after.pickup_poc_contact_uuid = null;

    expect(classifyWorkTrackerChanges(before, after)).toBe("un-accept");
  });

  it("detects no changes", () => {
    expect(classifyWorkTrackerChanges(before, cloneSnapshot(before))).toBe("none");
  });

  it("un-accepts when only pickup_time_start changes via the time field", () => {
    const after = cloneSnapshot(before);
    after.pickup_time_start = "09:00:00";
    after.pickup_time_end = "09:00:00";

    expect(classifyWorkTrackerChanges(before, after)).toBe("un-accept");
  });

  it("un-accepts when only dropoff_time_start changes via the time field", () => {
    const after = cloneSnapshot(before);
    after.dropoff_time_start = "13:00:00";
    after.dropoff_time_end = "13:00:00";

    expect(classifyWorkTrackerChanges(before, after)).toBe("un-accept");
  });

  it("un-accepts when only the mode changes (exact to flexible), same start time", () => {
    const after = cloneSnapshot(before);
    after.pickup_time_mode = "flexible";
    after.pickup_time_end = "09:00:00";

    expect(classifyWorkTrackerChanges(before, after)).toBe("un-accept");
  });

  it("un-accepts switching to any_time", () => {
    const after = cloneSnapshot(before);
    after.pickup_time_mode = "any_time";
    after.pickup_time_start = null;
    after.pickup_time_end = null;

    expect(classifyWorkTrackerChanges(before, after)).toBe("un-accept");
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

  it("preserves an in-progress workflow state for structural changes", () => {
    expect(resolveStatusOnSave("pickup_inspection", "un-accept", "pickup_inspection")).toBe(
      "pickup_inspection",
    );
    expect(resolveStatusOnSave("dest_dropoff", "un-accept", "dest_dropoff")).toBe("dest_dropoff");
  });

  it("preserves terminal workflow states for structural changes", () => {
    expect(resolveStatusOnSave("completed", "un-accept", "completed")).toBe("completed");
    expect(resolveStatusOnSave("cancelled", "un-accept", "cancelled")).toBe("cancelled");
  });

  it("skips driver notifications for silent changes and draft trips", () => {
    expect(shouldSendDriverNotification("silent", "accepted", false)).toBe(false);
    expect(shouldSendDriverNotification("notify-only", "draft", false)).toBe(false);
    expect(shouldSendDriverNotification("notify-only", "accepted", false)).toBe(true);
  });

  it("skips change notifications for released but not accepted trips", () => {
    expect(shouldSendDriverNotification("un-accept", "released", false, "released")).toBe(false);
    expect(shouldSendDriverNotification("notify-only", "released", false, "released")).toBe(false);
    expect(shouldSendDriverNotification("un-accept", "accepted", false, "released")).toBe(true);
  });

  it("notifies the driver when an in-progress trip changes", () => {
    expect(shouldSendDriverNotification("notify-only", "dest_pickup", false)).toBe(true);
    expect(shouldSendDriverNotification("un-accept", "pickup_inspection", false)).toBe(true);
    expect(shouldSendDriverNotification("un-accept", "dest_dropoff", false)).toBe(true);
    expect(shouldSendDriverNotification("notify-only", "dropoff_inspection", false)).toBe(true);
  });

  it("does not notify the driver when a terminal trip changes", () => {
    expect(shouldSendDriverNotification("notify-only", "completed", false)).toBe(false);
    expect(shouldSendDriverNotification("un-accept", "cancelled", false)).toBe(false);
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

describe("actual bleacher corrections", () => {
  it("captures the confirmed bleacher and its reason in the snapshot", () => {
    const snapshot = buildWorkTrackerSnapshot(
      {
        ...baseWorkTracker,
        actual_bleacher_uuid: "b-2",
        bleacher_change_reason: "damaged",
      } as Tables<"WorkTrackers">,
      baseAddress,
      baseAddress,
    );

    expect(snapshot?.actual_bleacher_uuid).toBe("b-2");
    expect(snapshot?.bleacher_change_reason).toBe("damaged");
  });

  it("treats a manager correcting the actual bleacher as a silent change", () => {
    // The driver already knows which bleacher they hitched up — pushing it back
    // at them is noise, and it must not un-accept the trip either.
    const before = buildWorkTrackerSnapshot(
      {
        ...baseWorkTracker,
        actual_bleacher_uuid: "b-2",
        bleacher_change_reason: "damaged",
      } as Tables<"WorkTrackers">,
      baseAddress,
      baseAddress,
    )!;
    const after = buildWorkTrackerSnapshot(
      {
        ...baseWorkTracker,
        actual_bleacher_uuid: "b-1",
        bleacher_change_reason: null,
      } as Tables<"WorkTrackers">,
      baseAddress,
      baseAddress,
    )!;

    expect(classifyWorkTrackerChanges(before, after)).toBe("silent");
    expect(shouldSendDriverNotification("silent", "accepted", false, "accepted")).toBe(false);
  });

  it("treats a reason-only correction as a change worth saving", () => {
    const before = buildWorkTrackerSnapshot(
      {
        ...baseWorkTracker,
        actual_bleacher_uuid: "b-2",
        bleacher_change_reason: "damaged",
      } as Tables<"WorkTrackers">,
      baseAddress,
      baseAddress,
    )!;
    const after = buildWorkTrackerSnapshot(
      {
        ...baseWorkTracker,
        actual_bleacher_uuid: "b-2",
        bleacher_change_reason: "not_on_site",
      } as Tables<"WorkTrackers">,
      baseAddress,
      baseAddress,
    )!;

    expect(classifyWorkTrackerChanges(before, after)).toBe("silent");
  });

  it("still reports no change when nothing about the swap moved", () => {
    const snapshotOf = () =>
      buildWorkTrackerSnapshot(
        {
          ...baseWorkTracker,
          actual_bleacher_uuid: "b-2",
          bleacher_change_reason: "damaged",
        } as Tables<"WorkTrackers">,
        baseAddress,
        baseAddress,
      )!;

    expect(classifyWorkTrackerChanges(snapshotOf(), snapshotOf())).toBe("none");
  });
});
