/**
 * The bleacher a driver actually took.
 *
 * Managers assign a bleacher; at the warehouse the assigned one is often buried
 * behind others, so drivers take an equivalent unit from the front. The mobile
 * app records what really left the yard in `WorkTrackers.actual_bleacher_uuid`.
 *
 * The column has three states, and they are NOT interchangeable:
 *   NULL              — the driver has not confirmed anything yet
 *   = bleacher_uuid   — the driver confirmed taking the assigned bleacher
 *   ≠ bleacher_uuid   — a swap the manager needs to reconcile
 *
 * Reason codes are mirrored from the mobile app and from the CHECK constraint in
 * 20260825120000_actual_bleacher.sql. Labels live here only — never inline them
 * in a component.
 */

export const BLEACHER_CHANGE_REASONS = [
  { code: "hard_to_access", label: "Hard to get to" },
  { code: "blocked_by_other_units", label: "Blocked by other bleachers" },
  { code: "damaged", label: "Assigned one is damaged" },
  { code: "not_on_site", label: "Not on site" },
  { code: "other", label: "Other" },
] as const;

export type BleacherChangeReasonCode = (typeof BLEACHER_CHANGE_REASONS)[number]["code"];

const NO_REASON_LABEL = "No reason given";
const UNKNOWN_REASON_LABEL = "Unrecognized reason";

export function isBleacherChangeReasonCode(
  code: string | null | undefined,
): code is BleacherChangeReasonCode {
  return BLEACHER_CHANGE_REASONS.some((reason) => reason.code === code);
}

/**
 * Never throws: a newer mobile build can ship a reason code this web build has
 * never heard of, and a manager staring at a blank warning is worse than one
 * staring at a vague label.
 */
export function bleacherChangeReasonLabel(code: string | null | undefined): string {
  if (code == null) return NO_REASON_LABEL;
  const match = BLEACHER_CHANGE_REASONS.find((reason) => reason.code === code);
  return match?.label ?? UNKNOWN_REASON_LABEL;
}

export type BleacherSwapState =
  | { kind: "unconfirmed" }
  | { kind: "confirmed"; bleacherUuid: string }
  | {
      kind: "swapped";
      assignedBleacherUuid: string | null;
      actualBleacherUuid: string;
      reasonCode: string | null;
      reasonLabel: string;
    };

export function resolveBleacherSwapState(input: {
  bleacherUuid: string | null;
  actualBleacherUuid: string | null;
  bleacherChangeReason: string | null;
}): BleacherSwapState {
  const { bleacherUuid, actualBleacherUuid, bleacherChangeReason } = input;

  // A leftover reason does not make an unconfirmed tracker confirmed — there is
  // no cross-column CHECK, so stale reasons are legal and do happen.
  if (actualBleacherUuid == null) return { kind: "unconfirmed" };

  if (actualBleacherUuid === bleacherUuid) {
    return { kind: "confirmed", bleacherUuid: actualBleacherUuid };
  }

  return {
    kind: "swapped",
    assignedBleacherUuid: bleacherUuid,
    actualBleacherUuid,
    reasonCode: bleacherChangeReason,
    reasonLabel: bleacherChangeReasonLabel(bleacherChangeReason),
  };
}

export type ActualBleacherUpdate = {
  actual_bleacher_uuid: string | null;
  bleacher_change_reason: string | null;
};

/**
 * Builds the two columns for a manager's correction, always as one pair so they
 * land in a single UPDATE.
 *
 * Reverting to the assigned bleacher clears the reason — a reason without a swap
 * is noise. An unset or unrecognized reason on a real swap falls back to
 * 'other': a value the CHECK constraint rejects would not merely fail, it would
 * wedge the PowerSync upload queue behind it.
 */
export function buildActualBleacherUpdate(input: {
  assignedBleacherUuid: string | null;
  nextActualBleacherUuid: string | null;
  nextReason: string | null;
}): ActualBleacherUpdate {
  const { assignedBleacherUuid, nextActualBleacherUuid, nextReason } = input;

  if (nextActualBleacherUuid == null) {
    return { actual_bleacher_uuid: null, bleacher_change_reason: null };
  }

  if (nextActualBleacherUuid === assignedBleacherUuid) {
    return { actual_bleacher_uuid: nextActualBleacherUuid, bleacher_change_reason: null };
  }

  return {
    actual_bleacher_uuid: nextActualBleacherUuid,
    bleacher_change_reason: isBleacherChangeReasonCode(nextReason) ? nextReason : "other",
  };
}
