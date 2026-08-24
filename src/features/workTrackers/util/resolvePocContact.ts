import { DateTime } from "luxon";
import { db } from "@/components/providers/SystemProvider";
import { expect, typedGetAll } from "@/lib/powersync/typedQuery";

export type PocSource = "event" | "workTracker";

/**
 * Three-state on purpose (spec D5). `unlinked` is neither a hit nor an error: the neighbour
 * exists and names a POC, but only as legacy free text with no `Contacts` row behind it — so it
 * carries no phone number and must not be copied forward. The caller turns it into an
 * actionable "create a contact first" message.
 */
export type PocResolution =
  | { kind: "contact"; contactUuid: string; displayName: string; source: PocSource }
  | { kind: "unlinked"; displayName: string; source: PocSource }
  | null;

/**
 * Row shapes fed by the PowerSync queries. Kept dumb and pre-filtered so the picking rules stay
 * unit-testable without a database — deleted rows and the current work tracker are excluded by
 * the query, exactly as `resolveAddressFull` does it.
 */
export type PocEventRow = {
  booked: boolean;
  /** ISO timestamp; normalised to a date before comparing. */
  eventStart: string;
  contactUuid: string;
  displayName: string;
};

export type PocWorkTrackerRow = {
  date: string | null;
  /** Denormalised text stored on the neighbour (may predate contact linking). */
  pickupPoc: string | null;
  pickupPocContactUuid: string | null;
  /** Current name from the joined `Contacts` row; null when there is no link. */
  pickupPocDisplayName: string | null;
  dropoffPoc: string | null;
  dropoffPocContactUuid: string | null;
  dropoffPocDisplayName: string | null;
};

export type PocDirection = "past" | "future";

type Candidate = { date: string; resolution: NonNullable<PocResolution> };

const isBlank = (value: string | null): boolean => (value ?? "").trim() === "";

/**
 * Which end of a neighbouring work tracker describes this trip's POC.
 *
 * Looking back, the neighbour is where the bleacher was *dropped off* — that is where this trip
 * picks it up. Looking forward, the neighbour *picks it up* from where this trip drops it. Same
 * rule `resolveAddressFull` applies to addresses.
 */
function neighbourEnd(row: PocWorkTrackerRow, direction: PocDirection) {
  return direction === "past"
    ? {
        text: row.dropoffPoc,
        contactUuid: row.dropoffPocContactUuid,
        contactName: row.dropoffPocDisplayName,
      }
    : {
        text: row.pickupPoc,
        contactUuid: row.pickupPocContactUuid,
        contactName: row.pickupPocDisplayName,
      };
}

function toWorkTrackerCandidate(row: PocWorkTrackerRow, direction: PocDirection): Candidate | null {
  if (!row.date) return null;

  const end = neighbourEnd(row, direction);

  if (end.contactUuid) {
    // Prefer the live contact name; the stored text is the fallback for a contact that no
    // longer resolves (e.g. soft-deleted out of the join).
    const displayName = !isBlank(end.contactName) ? end.contactName! : (end.text ?? "");
    return {
      date: row.date,
      resolution: {
        kind: "contact",
        contactUuid: end.contactUuid,
        displayName: displayName.trim(),
        source: "workTracker",
      },
    };
  }

  // Legacy free text: still competes for "nearest" so the button cannot silently skip past the
  // true neighbour and populate an older, wrong contact — but it cannot be applied (D5).
  if (!isBlank(end.text)) {
    return {
      date: row.date,
      resolution: { kind: "unlinked", displayName: end.text!.trim(), source: "workTracker" },
    };
  }

  return null;
}

function toEventCandidate(row: PocEventRow): Candidate | null {
  if (!row.booked) return null;

  const date = DateTime.fromISO(row.eventStart).toISODate();
  if (!date) return null;

  return {
    date,
    resolution: {
      kind: "contact",
      contactUuid: row.contactUuid,
      displayName: row.displayName,
      source: "event",
    },
  };
}

/**
 * Pick the POC of the nearest neighbour in `direction`, relative to `targetDate`.
 *
 * Bounds are inclusive and ties go to the event — matching `resolveAddressFull`, so the POC
 * buttons and the address locate buttons never disagree about which neighbour is "the" one.
 */
export function resolvePocContact(
  source: { events: PocEventRow[]; workTrackers: PocWorkTrackerRow[] },
  targetDate: string,
  direction: PocDirection,
): PocResolution {
  const inRange = (date: string) =>
    direction === "past" ? date <= targetDate : date >= targetDate;
  const isNearer = (candidate: string, best: string) =>
    direction === "past" ? candidate > best : candidate < best;

  const best = (candidates: Array<Candidate | null>): Candidate | null =>
    candidates.reduce<Candidate | null>((winner, candidate) => {
      if (!candidate || !inRange(candidate.date)) return winner;
      if (!winner || isNearer(candidate.date, winner.date)) return candidate;
      return winner;
    }, null);

  const bestEvent = best(source.events.map(toEventCandidate));
  const bestWorkTracker = best(
    source.workTrackers.map((row) => toWorkTrackerCandidate(row, direction)),
  );

  if (!bestEvent) return bestWorkTracker?.resolution ?? null;
  if (!bestWorkTracker) return bestEvent.resolution;

  const eventWins =
    direction === "past"
      ? bestEvent.date >= bestWorkTracker.date
      : bestEvent.date <= bestWorkTracker.date;

  return eventWins ? bestEvent.resolution : bestWorkTracker.resolution;
}

// ─── PowerSync adapter ───────────────────────────────────────────────────────

type EventContactRow = {
  eventStart: string | null;
  eventStatus: string | null;
  contactUuid: string | null;
  firstName: string | null;
  lastName: string | null;
};

type WorkTrackerPocRow = {
  date: string | null;
  pickupPoc: string | null;
  pickupPocContactUuid: string | null;
  pickupFirstName: string | null;
  pickupLastName: string | null;
  dropoffPoc: string | null;
  dropoffPocContactUuid: string | null;
  dropoffFirstName: string | null;
  dropoffLastName: string | null;
};

const joinName = (first: string | null, last: string | null): string | null => {
  const name = `${first ?? ""} ${last ?? ""}`.trim();
  return name === "" ? null : name;
};

/**
 * Load both neighbour sources for a bleacher and pick the POC.
 *
 * Mirrors `getExpectedAddressFullForWorkTracker`: same two sources, same exclusion of the work
 * tracker being edited, so the POC buttons and the address locate buttons always agree on which
 * neighbour is "the" one.
 */
export async function getExpectedPocForWorkTracker(params: {
  bleacherUuid: string;
  targetDate: string;
  excludeWorkTrackerUuid?: string | null;
  direction?: PocDirection;
}): Promise<PocResolution> {
  const { bleacherUuid, targetDate, excludeWorkTrackerUuid, direction = "past" } = params;

  const eventRows = await typedGetAll(
    db
      .selectFrom("BleacherEvents as be")
      .innerJoin("Events as e", "e.id", "be.event_uuid")
      .innerJoin("Contacts as c", "c.id", "e.contact_uuid")
      .select([
        "e.event_start as eventStart",
        "e.event_status as eventStatus",
        "e.contact_uuid as contactUuid",
        "c.first_name as firstName",
        "c.last_name as lastName",
      ])
      .where("be.bleacher_uuid", "=", bleacherUuid)
      .where("e.deleted", "=", 0)
      .where("c.deleted", "=", 0)
      .compile(),
    expect<EventContactRow>(),
  );

  let wtQuery = db
    .selectFrom("WorkTrackers as wt")
    .leftJoin("Contacts as cp", "cp.id", "wt.pickup_poc_contact_uuid")
    .leftJoin("Contacts as cd", "cd.id", "wt.dropoff_poc_contact_uuid")
    .select([
      "wt.date as date",
      "wt.pickup_poc as pickupPoc",
      "wt.pickup_poc_contact_uuid as pickupPocContactUuid",
      "cp.first_name as pickupFirstName",
      "cp.last_name as pickupLastName",
      "wt.dropoff_poc as dropoffPoc",
      "wt.dropoff_poc_contact_uuid as dropoffPocContactUuid",
      "cd.first_name as dropoffFirstName",
      "cd.last_name as dropoffLastName",
    ])
    .where("wt.bleacher_uuid", "=", bleacherUuid);

  if (excludeWorkTrackerUuid) {
    wtQuery = wtQuery.where("wt.id", "!=", excludeWorkTrackerUuid);
  }

  const wtRows = await typedGetAll(wtQuery.compile(), expect<WorkTrackerPocRow>());

  return resolvePocContact(
    {
      events: eventRows
        .filter((row) => row.eventStart != null && row.contactUuid != null)
        .map((row) => ({
          booked: row.eventStatus === "booked",
          eventStart: row.eventStart!,
          contactUuid: row.contactUuid!,
          displayName: joinName(row.firstName, row.lastName) ?? "",
        })),
      workTrackers: wtRows.map((row) => ({
        date: row.date,
        pickupPoc: row.pickupPoc,
        pickupPocContactUuid: row.pickupPocContactUuid,
        pickupPocDisplayName: joinName(row.pickupFirstName, row.pickupLastName),
        dropoffPoc: row.dropoffPoc,
        dropoffPocContactUuid: row.dropoffPocContactUuid,
        dropoffPocDisplayName: joinName(row.dropoffFirstName, row.dropoffLastName),
      })),
    },
    targetDate,
    direction,
  );
}
