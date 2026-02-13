import { QuotesBookingsEvent, QuotesBookingsFilters } from "../types";
import { isWithinRange, overlapsRange } from "./dateRange";

export function filterQuotesBookingsEvents(
  events: QuotesBookingsEvent[],
  filters: QuotesBookingsFilters,
): QuotesBookingsEvent[] {
  return events.filter((event) => {
    if (filters.statuses.length > 0) {
      const status = event.event_status?.toLowerCase() ?? "";
      if (!filters.statuses.includes(status)) return false;
    }

    if (!isWithinRange(event.created_at, filters.createdFrom, filters.createdTo)) {
      return false;
    }

    if (!overlapsRange(event.event_start, event.event_end, filters.eventFrom, filters.eventTo)) {
      return false;
    }

    if (filters.accountManagerUserUuid) {
      const owner = event.created_by_user_uuid ?? "";
      if (filters.accountManagerUserUuid !== owner) return false;
    }

    return true;
  });
}
