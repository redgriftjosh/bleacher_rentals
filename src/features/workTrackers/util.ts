import { DateTime } from "luxon";
import { WorkTrackersResult } from "@/features/workTrackers/db/db";

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

export type DistanceData = {
  distanceMeters: number | null;
  distanceText: string | null;
  durationSeconds: number | null;
  durationText: string | null;
  durationInTrafficSeconds?: number | null;
  durationInTrafficText?: string | null;
};

export type DriverPaymentData = {
  tax: number;
  payRateCents: number;
  payCurrency: "CAD" | "USD";
  payPerUnit: "KM" | "MI" | "HR";
};

export function calculateDriverPay(
  driverPaymentData: DriverPaymentData,
  distanceData: DistanceData
): number | null {
  if (!driverPaymentData || !distanceData) {
    return null;
  }

  let amount = 0;
  const rate = driverPaymentData.payRateCents / 100; // Convert cents to dollars

  switch (driverPaymentData.payPerUnit) {
    case "KM":
      if (distanceData.distanceMeters != null) {
        const kilometers = distanceData.distanceMeters / 1000;
        amount = rate * kilometers;
      }
      break;
    case "MI":
      if (distanceData.distanceMeters != null) {
        const miles = distanceData.distanceMeters / 1609.34;
        amount = rate * miles;
      }
      break;
    case "HR":
      if (distanceData.durationSeconds != null) {
        const hours = distanceData.durationSeconds / 3600;
        amount = rate * hours;
      }
      break;
  }

  return amount > 0 ? amount : null;
}
