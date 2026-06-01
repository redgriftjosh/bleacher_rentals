import { DateTime } from "luxon";
import { QuotesBookingsEvent } from "../types";

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  const date = DateTime.fromISO(dateString);
  if (!date.isValid) return "";
  return date.toFormat("MMM d, yyyy");
}

function formatCurrency(cents: number | null): string {
  if (cents === null) return "";
  return `$${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function searchEvents(
  events: QuotesBookingsEvent[],
  query: string,
): QuotesBookingsEvent[] {
  if (!query.trim()) return events;
  const q = query.toLowerCase();

  return events.filter((e) => {
    const fields = [
      // Event name
      e.event_name,
      // Account Manager
      e.account_manager_first_name,
      e.account_manager_last_name,
      e.account_manager_email,
      e.account_manager_first_name && e.account_manager_last_name
        ? `${e.account_manager_first_name} ${e.account_manager_last_name}`
        : null,
      // Dates — raw ISO
      e.event_start,
      e.event_end,
      // Dates — formatted (e.g. "Sep 18, 2025")
      formatDate(e.event_start),
      formatDate(e.event_end),
      // Address
      e.address_street,
      e.address_city,
      e.address_state,
      // Contact
      e.contact_first_name,
      e.contact_last_name,
      e.contact_email,
      e.contact_first_name
        ? `${e.contact_first_name} ${e.contact_last_name ?? ""}`.trim()
        : null,
      // Company
      e.company_name,
      // Amount
      e.contract_revenue_cents !== null
        ? formatCurrency(e.contract_revenue_cents)
        : null,
    ];

    return fields.some((f) => f && String(f).toLowerCase().includes(q));
  });
}
