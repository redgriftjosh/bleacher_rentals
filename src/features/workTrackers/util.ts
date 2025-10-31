import { DateTime } from "luxon";
import { WorkTrackersResult } from "@/features/workTrackers/db";

export function getDateRange(startDate: string): string {
  const start = DateTime.fromISO(startDate, { zone: "utc" });
  const end = start.plus({ days: 6 });

  return `${start.toFormat("MMM d")} - ${end.toFormat("MMM d")}`;
}

export function calculateFinancialTotals(WorkTrackersResult: WorkTrackersResult) {
  const workTrackers = WorkTrackersResult.workTrackers;
  const subtotal = workTrackers.reduce((acc, row) => {
    return acc + (row.workTracker.pay_cents ?? 0);
  }, 0);
  const driverTax = WorkTrackersResult.driverTax / 100;
  const tax = Math.round(subtotal * driverTax);
  const total = Math.round(subtotal + tax);
  const taxPercent = WorkTrackersResult.driverTax;

  return { subtotal, tax, taxPercent, total };
}

export function toLatLngString(a?: { lat?: number; lng?: number }) {
  return a?.lat != null && a?.lng != null ? `${a.lat},${a.lng}` : "";
}
