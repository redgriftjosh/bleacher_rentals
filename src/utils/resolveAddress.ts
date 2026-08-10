import { DateTime } from "luxon";

/**
 * Minimal shape required by resolveAddress. Compatible with the full Bleacher
 * dashboard type as well as lightweight objects constructed from PS queries.
 */
type AddressResolvableBleacher = {
  bleacherEvents: Array<{ booked: boolean; eventStart: string; address: string }>;
  workTrackers: Array<{ date: string | null; dropoffAddress: string | null }>;
};

/**
 * Resolve a bleacher's address relative to a given date.
 *
 * direction:
 *   'past'   (default) — the most recent event/drop-off with date <= targetDate
 *                        (i.e. where the bleacher currently is).
 *   'future' — the earliest event/drop-off with date > targetDate
 *              (i.e. where the bleacher goes next).
 *
 * Logic:
 * - Events use `address` (street); work trackers use `dropoffAddress` (street).
 * - If an event and a work tracker fall on the same date, prefer the event.
 */
export function resolveAddress(
  bleacher: AddressResolvableBleacher,
  targetDate: string,
  direction: "past" | "future" = "past",
): string | null {
  const isBetter = (candidate: string, current: string | null) =>
    !current || (direction === "past" ? candidate > current : candidate < current);

  let bestEventDate: string | null = null;
  let bestEventAddress: string | null = null;

  for (const ev of bleacher.bleacherEvents) {
    if (!ev.booked) continue;
    const startDate = DateTime.fromISO(ev.eventStart).toISODate();
    if (!startDate) continue;
    if (direction === "past" ? startDate > targetDate : startDate <= targetDate) continue;
    if (!ev.address) continue;
    if (isBetter(startDate, bestEventDate)) {
      bestEventDate = startDate;
      bestEventAddress = ev.address;
    }
  }

  let bestWtDate: string | null = null;
  let bestWtAddress: string | null = null;

  for (const wt of bleacher.workTrackers) {
    if (!wt.date) continue;
    if (direction === "past" ? wt.date > targetDate : wt.date <= targetDate) continue;
    if (!wt.dropoffAddress) continue;
    if (isBetter(wt.date, bestWtDate)) {
      bestWtDate = wt.date;
      bestWtAddress = wt.dropoffAddress;
    }
  }

  // Both found: prefer the one nearer the target date, or the event on a tie.
  if (bestEventDate && bestWtDate) {
    const eventWins =
      direction === "past" ? bestEventDate >= bestWtDate : bestEventDate <= bestWtDate;
    return eventWins ? bestEventAddress : bestWtAddress;
  }

  return bestEventAddress ?? bestWtAddress;
}

// ─── Full variant (includes addressUuid + city/state/postal) ─────────────────

type FullBleacherEvent = {
  booked: boolean;
  eventStart: string;
  address: string;
  addressUuid: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
};

type FullWorkTracker = {
  date: string | null;
  dropoffAddress: string | null;
  dropoffAddressUuid: string | null;
  dropoffCity: string | null;
  dropoffState: string | null;
  dropoffPostalCode: string | null;
  pickupAddress: string | null;
  pickupAddressUuid: string | null;
  pickupCity: string | null;
  pickupState: string | null;
  pickupPostalCode: string | null;
};

type AddressResolvableBleacherFull = {
  bleacherEvents: Array<FullBleacherEvent>;
  workTrackers: Array<FullWorkTracker>;
};

export type ResolvedAddress = {
  street: string;
  addressUuid: string;
  city: string;
  state: string;
  postalCode: string;
};

/**
 * Like resolveAddress but returns the full address record (with UUID and city/state/postal)
 * so the result can be used to set a FK without a second lookup.
 *
 * direction:
 *   'past'   (default) — looks backward from targetDate; events by eventStart ≤ target,
 *                         work trackers by date ≤ target using dropoff address. Takes latest.
 *   'future' — looks forward from targetDate; events by eventStart ≥ target,
 *              work trackers by date ≥ target using pickup address. Takes earliest.
 */
export function resolveAddressFull(
  bleacher: AddressResolvableBleacherFull,
  targetDate: string,
  direction: "past" | "future" = "past",
): ResolvedAddress | null {
  if (direction === "future") {
    let bestEventDate: string | null = null;
    let bestEvent: FullBleacherEvent | null = null;

    for (const ev of bleacher.bleacherEvents) {
      if (!ev.booked) continue;
      const startDate = DateTime.fromISO(ev.eventStart).toISODate();
      if (!startDate || startDate < targetDate) continue;
      if (!ev.address || !ev.addressUuid) continue;
      if (!bestEventDate || startDate < bestEventDate) {
        bestEventDate = startDate;
        bestEvent = ev;
      }
    }

    let bestWtDate: string | null = null;
    let bestWt: FullWorkTracker | null = null;

    for (const wt of bleacher.workTrackers) {
      if (!wt.date || wt.date < targetDate) continue;
      if (!wt.pickupAddress || !wt.pickupAddressUuid) continue;
      if (!bestWtDate || wt.date < bestWtDate) {
        bestWtDate = wt.date;
        bestWt = wt;
      }
    }

    if (!bestEvent && !bestWt) return null;

    // Prefer the one with the earlier date; event wins on same date
    const useEvent = !bestWt || (!!bestEvent && (bestEventDate ?? "") <= (bestWtDate ?? ""));

    if (useEvent && bestEvent?.addressUuid && bestEvent.address) {
      return {
        street: bestEvent.address,
        addressUuid: bestEvent.addressUuid,
        city: bestEvent.city ?? "",
        state: bestEvent.state ?? "",
        postalCode: bestEvent.postalCode ?? "",
      };
    }

    if (bestWt?.pickupAddressUuid && bestWt.pickupAddress) {
      return {
        street: bestWt.pickupAddress,
        addressUuid: bestWt.pickupAddressUuid,
        city: bestWt.pickupCity ?? "",
        state: bestWt.pickupState ?? "",
        postalCode: bestWt.pickupPostalCode ?? "",
      };
    }

    return null;
  }

  // direction === 'past'
  let bestEventDate: string | null = null;
  let bestEvent: FullBleacherEvent | null = null;

  for (const ev of bleacher.bleacherEvents) {
    if (!ev.booked) continue;
    const startDate = DateTime.fromISO(ev.eventStart).toISODate();
    if (!startDate || startDate > targetDate) continue;
    if (!ev.address || !ev.addressUuid) continue;
    if (!bestEventDate || startDate > bestEventDate) {
      bestEventDate = startDate;
      bestEvent = ev;
    }
  }

  let bestWtDate: string | null = null;
  let bestWt: FullWorkTracker | null = null;

  for (const wt of bleacher.workTrackers) {
    if (!wt.date || wt.date > targetDate) continue;
    if (!wt.dropoffAddress || !wt.dropoffAddressUuid) continue;
    if (!bestWtDate || wt.date > bestWtDate) {
      bestWtDate = wt.date;
      bestWt = wt;
    }
  }

  if (!bestEvent && !bestWt) return null;

  const useEvent = !bestWt || (!!bestEvent && (bestEventDate ?? "") >= (bestWtDate ?? ""));

  if (useEvent && bestEvent?.addressUuid && bestEvent.address) {
    return {
      street: bestEvent.address,
      addressUuid: bestEvent.addressUuid,
      city: bestEvent.city ?? "",
      state: bestEvent.state ?? "",
      postalCode: bestEvent.postalCode ?? "",
    };
  }

  if (bestWt?.dropoffAddressUuid && bestWt.dropoffAddress) {
    return {
      street: bestWt.dropoffAddress,
      addressUuid: bestWt.dropoffAddressUuid,
      city: bestWt.dropoffCity ?? "",
      state: bestWt.dropoffState ?? "",
      postalCode: bestWt.dropoffPostalCode ?? "",
    };
  }

  return null;
}
