import { DateTime } from "luxon";
import { WorkTrackerRow } from "../types";

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

export function searchWorkTrackers(
  workTrackers: WorkTrackerRow[],
  query: string,
): WorkTrackerRow[] {
  if (!query.trim()) return workTrackers;
  const q = query.toLowerCase();

  return workTrackers.filter((wt) => {
    const fields = [
      wt.project_number,
      wt.status,
      wt.driver_first_name,
      wt.driver_last_name,
      wt.driver_email,
      wt.driver_first_name && wt.driver_last_name
        ? `${wt.driver_first_name} ${wt.driver_last_name}`
        : null,
      wt.date,
      formatDate(wt.date),
      wt.completed_at,
      formatDate(wt.completed_at),
      wt.pickup_street,
      wt.pickup_city,
      wt.pickup_state,
      wt.dropoff_street,
      wt.dropoff_city,
      wt.dropoff_state,
      wt.bleacher_number != null ? `#${wt.bleacher_number}` : null,
      wt.pay_cents != null ? formatCurrency(wt.pay_cents) : null,
    ];

    return fields.some((f) => f && String(f).toLowerCase().includes(q));
  });
}
