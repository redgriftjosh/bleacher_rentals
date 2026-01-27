import type { Database } from "../../../database.types";

type WorkTrackerStatus = Database["public"]["Enums"]["worktracker_status"];

export const WORKTRACKER_STATUS_COLORS: Record<
  WorkTrackerStatus,
  { bg: string; border: string; text: string }
> = {
  draft: { bg: "bg-yellow-500/10", border: "border-yellow-600", text: "text-yellow-700" },
  released: { bg: "bg-blue-500/10", border: "border-blue-600", text: "text-blue-700" },
  accepted: { bg: "bg-green-500/10", border: "border-green-600", text: "text-green-700" },
  dest_pickup: { bg: "bg-emerald-500/10", border: "border-emerald-600", text: "text-emerald-700" },
  pickup_inspection: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-600",
    text: "text-emerald-700",
  },
  dest_dropoff: { bg: "bg-emerald-500/10", border: "border-emerald-600", text: "text-emerald-700" },
  dropoff_inspection: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-600",
    text: "text-emerald-700",
  },
  completed: { bg: "bg-green-800/10", border: "border-green-800/75", text: "text-green-800/75" },
  cancelled: { bg: "bg-red-500/10", border: "border-red-600", text: "text-red-700" },
};
