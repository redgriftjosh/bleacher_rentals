type AddressEntry = {
  date: string;
  street: string;
  source: "event" | "work_tracker";
};

/**
 * Given a list of dated address entries (from events and work trackers),
 * returns the street where the bleacher was most recently located on or
 * before `targetDate`.
 *
 * When an event and a work tracker fall on the same date, the event wins.
 */
export function resolveLastKnownAddress(
  entries: AddressEntry[],
  targetDate: string,
): string | null {
  let bestDate: string | null = null;
  let bestStreet: string | null = null;
  let bestIsEvent = false;

  for (const entry of entries) {
    if (entry.date > targetDate) continue;

    const isEvent = entry.source === "event";

    if (
      !bestDate ||
      entry.date > bestDate ||
      (entry.date === bestDate && isEvent && !bestIsEvent)
    ) {
      bestDate = entry.date;
      bestStreet = entry.street;
      bestIsEvent = isEvent;
    }
  }

  return bestStreet;
}
