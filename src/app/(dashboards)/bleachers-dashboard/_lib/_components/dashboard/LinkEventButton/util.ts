import { EventForWorkTracker } from "./types";

export function filterEventsByName(events: EventForWorkTracker[], query: string) {
  const normalizedQuery = query.toLowerCase().replace(/\s+/g, ""); // remove spaces
  return events.filter((event) => {
    const normalizedName = event.name.toLowerCase().replace(/\s+/g, "");
    return normalizedName.includes(normalizedQuery);
  });
}
