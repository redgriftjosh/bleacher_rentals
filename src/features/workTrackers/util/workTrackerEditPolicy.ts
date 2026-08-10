import { Enums, Tables } from "../../../../database.types";
import { AddressData } from "@/features/eventConfiguration/state/useCurrentEventStore";

export type WorkTrackerStatus = Enums<"worktracker_status">;

export const IN_PROGRESS_STATUSES: WorkTrackerStatus[] = [
  "dest_pickup",
  "pickup_inspection",
  "dest_dropoff",
  "dropoff_inspection",
];

export const BLOCKED_EDIT_STATUSES: WorkTrackerStatus[] = [
  ...IN_PROGRESS_STATUSES,
  "completed",
  "cancelled",
];

export type WorkTrackerChangeType = "none" | "silent" | "notify-only" | "un-accept";

export type AddressSnapshot = {
  addressUuid: string | null;
  address: string;
  city: string;
  state: string;
  postalCode: string;
};

export type WorkTrackerSnapshot = {
  bleacher_uuid: string | null;
  date: string | null;
  driver_uuid: string | null;
  pickup_poc: string | null;
  pickup_time: string | null;
  pickup_instructions: string | null;
  dropoff_poc: string | null;
  dropoff_time: string | null;
  dropoff_instructions: string | null;
  notes: string | null;
  internal_notes: string | null;
  pay_cents: number | null;
  teardown_required: boolean;
  setup_required: boolean;
  work_tracker_type_uuid: string | null;
  distance_meters: number | null;
  drive_minutes: number | null;
  project_number: string | null;
  pickupAddress: AddressSnapshot | null;
  dropoffAddress: AddressSnapshot | null;
};

function toAddressSnapshot(address: AddressData | null): AddressSnapshot | null {
  if (!address) return null;
  return {
    addressUuid: address.addressUuid ?? null,
    address: address.address ?? "",
    city: address.city ?? "",
    state: address.state ?? "",
    postalCode: address.postalCode ?? "",
  };
}

export function buildWorkTrackerSnapshot(
  workTracker: Tables<"WorkTrackers"> | null,
  pickUpAddress: AddressData | null,
  dropOffAddress: AddressData | null,
): WorkTrackerSnapshot | null {
  if (!workTracker) return null;

  return {
    bleacher_uuid: workTracker.bleacher_uuid,
    date: workTracker.date,
    driver_uuid: workTracker.driver_uuid,
    pickup_poc: workTracker.pickup_poc,
    pickup_time: workTracker.pickup_time,
    pickup_instructions: workTracker.pickup_instructions,
    dropoff_poc: workTracker.dropoff_poc,
    dropoff_time: workTracker.dropoff_time,
    dropoff_instructions: workTracker.dropoff_instructions,
    notes: workTracker.notes,
    internal_notes: workTracker.internal_notes,
    pay_cents: workTracker.pay_cents,
    teardown_required: !!workTracker.teardown_required,
    setup_required: !!workTracker.setup_required,
    work_tracker_type_uuid: workTracker.work_tracker_type_uuid,
    distance_meters: workTracker.distance_meters,
    drive_minutes: workTracker.drive_minutes,
    project_number: workTracker.project_number,
    pickupAddress: toAddressSnapshot(pickUpAddress),
    dropoffAddress: toAddressSnapshot(dropOffAddress),
  };
}

export function isWorkTrackerInProgress(status: WorkTrackerStatus): boolean {
  return IN_PROGRESS_STATUSES.includes(status);
}

export function isWorkTrackerBlockedFromEdit(status: WorkTrackerStatus): boolean {
  return BLOCKED_EDIT_STATUSES.includes(status);
}

function normalizeString(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function addressesEqual(a: AddressSnapshot | null, b: AddressSnapshot | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;

  return (
    normalizeString(a.addressUuid) === normalizeString(b.addressUuid) &&
    normalizeString(a.address) === normalizeString(b.address) &&
    normalizeString(a.city) === normalizeString(b.city) &&
    normalizeString(a.state) === normalizeString(b.state) &&
    normalizeString(a.postalCode) === normalizeString(b.postalCode)
  );
}

function hasUnacceptFieldChanges(
  before: WorkTrackerSnapshot,
  after: WorkTrackerSnapshot,
): boolean {
  if (normalizeString(before.bleacher_uuid) !== normalizeString(after.bleacher_uuid)) return true;
  if (normalizeString(before.date) !== normalizeString(after.date)) return true;
  if (normalizeString(before.driver_uuid) !== normalizeString(after.driver_uuid)) return true;
  if (normalizeString(before.pickup_poc) !== normalizeString(after.pickup_poc)) return true;
  if (normalizeString(before.pickup_time) !== normalizeString(after.pickup_time)) return true;
  if (normalizeString(before.pickup_instructions) !== normalizeString(after.pickup_instructions)) {
    return true;
  }
  if (normalizeString(before.dropoff_poc) !== normalizeString(after.dropoff_poc)) return true;
  if (normalizeString(before.dropoff_time) !== normalizeString(after.dropoff_time)) return true;
  if (
    normalizeString(before.dropoff_instructions) !== normalizeString(after.dropoff_instructions)
  ) {
    return true;
  }
  if (before.pay_cents !== after.pay_cents) return true;
  if (before.teardown_required !== after.teardown_required) return true;
  if (before.setup_required !== after.setup_required) return true;
  if (normalizeString(before.work_tracker_type_uuid) !== normalizeString(after.work_tracker_type_uuid)) {
    return true;
  }
  if (before.distance_meters !== after.distance_meters) return true;
  if (before.drive_minutes !== after.drive_minutes) return true;
  if (!addressesEqual(before.pickupAddress, after.pickupAddress)) return true;
  if (!addressesEqual(before.dropoffAddress, after.dropoffAddress)) return true;

  return false;
}

function hasNotesChange(before: WorkTrackerSnapshot, after: WorkTrackerSnapshot): boolean {
  return normalizeString(before.notes) !== normalizeString(after.notes);
}

function hasInternalNotesChange(
  before: WorkTrackerSnapshot,
  after: WorkTrackerSnapshot,
): boolean {
  return normalizeString(before.internal_notes) !== normalizeString(after.internal_notes);
}

function hasProjectNumberChange(
  before: WorkTrackerSnapshot,
  after: WorkTrackerSnapshot,
): boolean {
  return normalizeString(before.project_number) !== normalizeString(after.project_number);
}

function hasSilentFieldChanges(
  before: WorkTrackerSnapshot,
  after: WorkTrackerSnapshot,
): boolean {
  return hasInternalNotesChange(before, after) || hasProjectNumberChange(before, after);
}

export function classifyWorkTrackerChanges(
  before: WorkTrackerSnapshot,
  after: WorkTrackerSnapshot,
): WorkTrackerChangeType {
  const unaccept = hasUnacceptFieldChanges(before, after);
  const notes = hasNotesChange(before, after);
  const silent = hasSilentFieldChanges(before, after);

  if (!unaccept && !notes && !silent) return "none";
  if (unaccept) return "un-accept";
  if (notes) return "notify-only";
  return "silent";
}

/** Combines field-level diff with an explicit status toggle (e.g. draft → released). */
export function resolveEffectiveChangeType(
  fieldChangeType: WorkTrackerChangeType,
  statusChanged: boolean,
  isNew: boolean,
): WorkTrackerChangeType {
  if (fieldChangeType !== "none") return fieldChangeType;
  if (statusChanged) return "notify-only";
  if (isNew) return "un-accept";
  return "none";
}

export function requiresUnacceptWarning(
  previousStatus: WorkTrackerStatus,
  changeType: WorkTrackerChangeType,
): boolean {
  return previousStatus === "accepted" && changeType === "un-accept";
}

export function resolveStatusOnSave(
  previousStatus: WorkTrackerStatus,
  changeType: WorkTrackerChangeType,
  requestedStatus: WorkTrackerStatus,
): WorkTrackerStatus {
  if (changeType === "un-accept" && previousStatus === "accepted") {
    return "released";
  }
  return requestedStatus;
}

export function shouldSendDriverNotification(
  changeType: WorkTrackerChangeType,
  previousStatus: WorkTrackerStatus,
  isInsert: boolean,
  nextStatus?: WorkTrackerStatus,
): boolean {
  if (changeType === "silent" || changeType === "none") return false;

  const resolvedNext = nextStatus ?? previousStatus;

  if (previousStatus === "draft" && resolvedNext !== "draft") return true;
  if (previousStatus !== "draft" && resolvedNext === "draft") return true;

  // Released but not yet accepted — driver can see updates in-app without a push.
  if (previousStatus === "released" && resolvedNext === "released") return false;

  if (isInsert) return resolvedNext !== "draft";

  return previousStatus === "accepted";
}
