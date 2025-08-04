import { DateTime } from "luxon";
import { Tables } from "../../../../../../../database.types";

export function getDateRange(startDate: string): string {
  const start = DateTime.fromISO(startDate, { zone: "utc" });
  const end = start.plus({ days: 6 });

  return `${start.toFormat("MMM d")} - ${end.toFormat("MMM d")}`;
}

export function calculateFinancialTotals(
  workTrackers: {
    workTracker: Tables<"WorkTrackers">;
    pickup_address: Tables<"Addresses"> | null;
    dropoff_address: Tables<"Addresses"> | null;
  }[]
) {
  const subtotal = workTrackers.reduce((acc, row) => {
    return acc + (row.workTracker.pay_cents ?? 0);
  }, 0);
  const tax = Math.round(subtotal * 0.13);
  const total = Math.round(subtotal + tax);

  return { subtotal, tax, total };
}
