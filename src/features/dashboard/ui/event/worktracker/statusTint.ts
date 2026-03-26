import type { Database } from "../../../../../../database.types";

type WorkTrackerStatus = Database["public"]["Enums"]["worktracker_status"];

/** Map work-tracker statuses to hex tint colours (matching Tailwind palette). */
export const STATUS_TINT: Record<WorkTrackerStatus, number> = {
  draft: 0xca8a04,
  released: 0x2563eb,
  accepted: 0x16c958,
  dest_pickup: 0x17e3a4,
  pickup_inspection: 0x17e3a4,
  dest_dropoff: 0x17e3a4,
  dropoff_inspection: 0x17e3a4,
  completed: 0x166534,
  cancelled: 0xdc2626,
};
