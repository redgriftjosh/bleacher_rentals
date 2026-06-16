import { SupabaseClient } from "@supabase/supabase-js";
import { Database, Tables } from "../../../../database.types";

type LastLocation = { addressUuid: string; lastDate: string } | null;

export type { LastLocation };

export function findLastKnownLocationInMemory(
  bleacherUuid: string,
  beforeDate: string,
  allEvents: Tables<"Events">[],
  allBleacherEvents: Tables<"BleacherEvents">[],
  allWorkTrackers: Tables<"WorkTrackers">[],
): LastLocation {
  const bleacherEventUuids = allBleacherEvents
    .filter((be) => be.bleacher_uuid === bleacherUuid)
    .map((be) => be.event_uuid);

  let eventLocation: LastLocation = null;
  for (const ev of allEvents) {
    if (!bleacherEventUuids.includes(ev.id)) continue;
    if (ev.event_status !== "booked") continue;
    if (!ev.address_uuid) continue;
    if (ev.event_end >= beforeDate) continue;
    if (!eventLocation || ev.event_end > eventLocation.lastDate) {
      eventLocation = { addressUuid: ev.address_uuid, lastDate: ev.event_end };
    }
  }

  let wtLocation: LastLocation = null;
  for (const wt of allWorkTrackers) {
    if (wt.bleacher_uuid !== bleacherUuid) continue;
    if (!wt.dropoff_address_uuid || !wt.date) continue;
    if (wt.date >= beforeDate) continue;
    if (!wtLocation || wt.date > wtLocation.lastDate) {
      wtLocation = { addressUuid: wt.dropoff_address_uuid, lastDate: wt.date };
    }
  }

  if (!eventLocation && !wtLocation) return null;
  if (!eventLocation) return wtLocation;
  if (!wtLocation) return eventLocation;
  return eventLocation.lastDate >= wtLocation.lastDate ? eventLocation : wtLocation;
}

export async function findLastKnownLocation(
  bleacherUuid: string,
  beforeDate: string,
  supabase: SupabaseClient<Database>,
): Promise<LastLocation> {
  const { data: lastEvent } = await supabase
    .from("BleacherEvents")
    .select("Events!inner(address_uuid, event_end)")
    .eq("bleacher_uuid", bleacherUuid)
    .eq("Events.event_status", "booked")
    .not("Events.address_uuid", "is", null)
    .lt("Events.event_end", beforeDate)
    .order("event_end", { referencedTable: "Events", ascending: false })
    .limit(1);

  const eventRow = lastEvent?.[0];
  const eventLocation: LastLocation =
    eventRow?.Events &&
    !Array.isArray(eventRow.Events) &&
    eventRow.Events.address_uuid
      ? {
          addressUuid: eventRow.Events.address_uuid,
          lastDate: eventRow.Events.event_end,
        }
      : null;

  const { data: lastWt } = await supabase
    .from("WorkTrackers")
    .select("dropoff_address_uuid, date")
    .eq("bleacher_uuid", bleacherUuid)
    .not("dropoff_address_uuid", "is", null)
    .lt("date", beforeDate)
    .order("date", { ascending: false })
    .limit(1);

  const wtRow = lastWt?.[0];
  const wtLocation: LastLocation =
    wtRow?.dropoff_address_uuid && wtRow?.date
      ? { addressUuid: wtRow.dropoff_address_uuid, lastDate: wtRow.date }
      : null;

  if (!eventLocation && !wtLocation) return null;
  if (!eventLocation) return wtLocation;
  if (!wtLocation) return eventLocation;
  return eventLocation.lastDate >= wtLocation.lastDate ? eventLocation : wtLocation;
}

export async function resolveStreet(
  addressUuid: string,
  supabase: SupabaseClient<Database>,
): Promise<string> {
  const { data } = await supabase
    .from("Addresses")
    .select("street")
    .eq("id", addressUuid)
    .single();
  return data?.street ?? "";
}
