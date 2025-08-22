import { createErrorToast } from "@/components/toasts/ErrorToast";
import { WorkTrackerEvent } from "../types";
import { DateTime } from "luxon";
import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";

export async function fetchEventsForWorkTracker(
  date: string,
  bleacherId: number,
  pickUpOrDropOff: "pickup" | "dropoff",
  token: string | null
): Promise<WorkTrackerEvent[]> {
  if (!token) {
    createErrorToast(["No token found"]);
    return [];
  }

  const targetDate = DateTime.fromISO(date);
  const sixMonthsBefore = targetDate.minus({ months: 6 }).toISODate();
  const sixMonthsAfter = targetDate.plus({ months: 6 }).toISODate();

  const supabase = await getSupabaseClient(token);

  type EventRowWithAddress = {
    event_id: number;
    event_name: string;
    event_start: string; // date string
    event_end: string; // date string
    hsl_hue: number | null;
    poc: string | null;
    address: null | {
      address_id: number;
      street: string;
      city: string;
      state_province: string;
      zip_postal: string | null;
    };
  };

  type EventRowWithAddressRaw = Omit<EventRowWithAddress, "address"> & {
    address: EventRowWithAddress["address"] | EventRowWithAddress["address"][];
  };

  const { data, error } = await supabase
    .from("Events")
    .select(
      `
    event_id, event_name, event_start, event_end, hsl_hue, poc,
    address:Addresses!Events_address_id_fkey (
      address_id, street, city, state_province, zip_postal
    )
  `
    )
    .or(`event_end.gte.${sixMonthsBefore},event_start.lte.${sixMonthsAfter}`)
    .overrideTypes<EventRowWithAddressRaw[]>();

  //   console.log("data", data);

  if (error) {
    createErrorToast(["Failed to fetch events.", error.message]);
  }
  const events = (data ?? []).map((e) => {
    const raw = e.address;
    const addr = Array.isArray(raw) ? raw[0] ?? null : raw; // normalize to object|null

    return {
      id: e.event_id,
      name: e.event_name,
      start: e.event_start,
      end: e.event_end,
      hslHue: e.hsl_hue ?? 0,
      poc: e.poc ?? null,
      address: addr
        ? {
            addressId: addr.address_id,
            address: addr.street ?? "",
            city: addr.city ?? "",
            state: addr.state_province ?? "",
            postalCode: addr.zip_postal ?? "",
          }
        : { addressId: null, address: "" },
    };
  });

  // Fetch all event_ids associated with this bleacher
  const { data: linkedEventData, error: linkError } = await supabase
    .from("BleacherEvents")
    .select("event_id")
    .eq("bleacher_id", bleacherId);

  if (linkError) {
    createErrorToast(["Failed to fetch linked bleacher events.", linkError.message]);
  }

  const bleacherEventIds = new Set(linkedEventData.map((be) => be.event_id));

  // Find recommended event from events linked to this bleacher
  let recommendedEventId: number | undefined;

  if (pickUpOrDropOff === "pickup") {
    const before = events
      .filter((e) => bleacherEventIds.has(e.id) && DateTime.fromISO(e.start) < targetDate)
      .sort((a, b) => DateTime.fromISO(b.start).toMillis() - DateTime.fromISO(a.start).toMillis());
    if (before.length > 0) recommendedEventId = before[0].id;
  } else {
    const after = events
      .filter((e) => bleacherEventIds.has(e.id) && DateTime.fromISO(e.end) > targetDate)
      .sort((a, b) => DateTime.fromISO(a.end).toMillis() - DateTime.fromISO(b.end).toMillis());
    if (after.length > 0) recommendedEventId = after[0].id;
  }

  const result: WorkTrackerEvent[] = events.map((e) => ({
    ...e,
    recommended: e.id === recommendedEventId,
  }));
  // put the recommended event first
  const recommended = result.find((e) => e.recommended);
  if (recommended) {
    result.splice(result.indexOf(recommended), 1);
    result.unshift(recommended);
  }
  //   console.log("result", result);

  return result;
}
