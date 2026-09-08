import { Tables } from "../../../../database.types";
import type { Bleacher } from "@/features/dashboard/types";
import { isBleacherOwnedByAM } from "@/features/userAccess/logic/isBleacherOwnedByAM";
import { hasSubrentalAccessForDate } from "@/features/userAccess/logic/hasSubrentalAccessForDate";

/**
 * Shared "open a work tracker for this cell" rules.
 *
 * Both entry points on the dashboard go through here — the truck button in the cell editor
 * popup and the ⌘/Ctrl+click shortcut on an empty cell. Keeping the access checks in one pure
 * function is the point: the shortcut skips the popup UI, so if it also skipped these checks an
 * account manager could create trackers on bleachers that are not theirs.
 */

export type WorkTrackerAccessInput = {
  bleacherUuid: string;
  date: string;
  /** Null when the cell has no tracker yet — access is only restricted for creation. */
  workTrackerUuid: string | null;
  perms: {
    isAdmin: boolean;
    isAccountManager: boolean;
    accountManagerZoneIds: string[];
  };
  /** All dashboard rows, including the virtual subrental ones. */
  allBleachers: Bleacher[];
};

export type WorkTrackerAccessResult = { allowed: true } | { allowed: false; messages: string[] };

export function checkWorkTrackerOpenAccess(input: WorkTrackerAccessInput): WorkTrackerAccessResult {
  const { bleacherUuid, date, workTrackerUuid, perms, allBleachers } = input;

  // Opening an existing tracker is not restricted here, and admins bypass the zone rules.
  if (workTrackerUuid) return { allowed: true };
  if (!perms.isAccountManager || perms.isAdmin) return { allowed: true };

  // Must be the original (non-subrental) row — when a zone filter hides the original zone, only
  // the subrental row is in the store; treat that as "not owned" so we fall through to the
  // subrental check rather than bypassing it entirely.
  const bleacher = allBleachers.find((b) => b.bleacherUuid === bleacherUuid && !b.isSubrentalRow);

  const ownedByAM =
    !!bleacher &&
    isBleacherOwnedByAM({
      bleacherZoneUuid: bleacher.zoneUuid,
      accountManagerZoneIds: perms.accountManagerZoneIds,
    });

  // Blocked if the owned bleacher is subrented out on this date.
  const subrented =
    ownedByAM &&
    (bleacher?.acceptedSubrentalBlocks ?? []).some(
      (r) => date >= r.eventStart.substring(0, 10) && date <= r.eventEnd.substring(0, 10),
    );

  if (subrented) {
    return { allowed: false, messages: ["This bleacher is subrented out on this date."] };
  }

  const hasSubrentalAccess = hasSubrentalAccessForDate({
    bleacherUuid,
    date,
    accountManagerZoneIds: perms.accountManagerZoneIds,
    allBleachers,
  });

  if (!ownedByAM && !hasSubrentalAccess) {
    return {
      allowed: false,
      messages: ["You can only create work trackers for bleachers assigned to you."],
    };
  }

  return { allowed: true };
}

/**
 * The blank row the modal edits until it is first saved.
 *
 * `id` is the sentinel `"-1"` that `WorkTrackerModal` reads as "this one does not exist yet";
 * every column is spelled out so TypeScript breaks here — not at runtime in the modal — when the
 * table gains a column. The exceptions are `pickup_time`/`dropoff_time`: the legacy free-text
 * columns are no longer initialized (or used anywhere) by the web app, only kept alive in
 * Postgres for the driver app, so the object below is cast rather than widened to include them.
 */
export function buildWorkTrackerDraft(params: {
  bleacherUuid: string;
  date: string;
  workTrackerUuid?: string | null;
}): Tables<"WorkTrackers"> {
  const { bleacherUuid, date, workTrackerUuid } = params;

  return {
    id: workTrackerUuid ?? "-1",
    bleacher_uuid: bleacherUuid,
    actual_bleacher_uuid: null,
    bleacher_change_reason: null,
    created_at: "",
    updated_at: "",
    created_by_user_uuid: null,
    date: date,
    status: "draft",
    dropoff_address_uuid: null,
    dropoff_poc: null,
    dropoff_poc_contact_uuid: null,
    dropoff_at: null,
    dropoff_timezone: null,
    dropoff_instructions: null,
    notes: null,
    pay_cents: null,
    pickup_address_uuid: null,
    pickup_poc: null,
    pickup_poc_contact_uuid: null,
    pickup_at: null,
    pickup_timezone: null,
    pickup_instructions: null,
    user_uuid: null,
    internal_notes: null,
    driver_uuid: null,
    accepted_at: null,
    released_at: null,
    started_at: null,
    completed_at: null,
    post_inspection_uuid: null,
    worktracker_group_uuid: null,
    pre_inspection_uuid: null,
    work_tracker_type_uuid: null,
    distance_meters: null,
    drive_minutes: null,
    bol_number: null,
    project_number: null,
    setup_required: false,
    teardown_required: false,
  } as unknown as Tables<"WorkTrackers">;
}
