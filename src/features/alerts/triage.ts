import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../database.types";
import { syncAlert } from "./engine";
import { deleteAllAlertsForEntity } from "./engine";
import { getDefinitionsForEntity } from "./registry";
import { todayStart, getUpcomingWindowEnd } from "./util/getUpcomingWindow";

type TriageTable = "Events" | "Events_deleted" | "WorkTrackers" | "WorkTrackers_deleted";

export async function triage(
  table: TriageTable,
  row: { id: string; [key: string]: any },
  supabase: SupabaseClient<Database>,
): Promise<void> {
  switch (table) {
    case "Events":
      await triageEventSaved(row.id, supabase);
      break;
    case "Events_deleted":
      await triageEventDeleted(row.id, supabase);
      break;
    case "WorkTrackers":
      await triageWorkTrackerSaved(row.id, supabase);
      break;
    case "WorkTrackers_deleted":
      await triageWorkTrackerDeleted(row.id, row.bleacher_uuid, supabase);
      break;
  }
}

async function triageEventSaved(
  eventUuid: string,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  // 1. Find all bleacher_events for this event
  const { data: bleacherEvents } = await supabase
    .from("BleacherEvents")
    .select("id, bleacher_uuid")
    .eq("event_uuid", eventUuid);

  const bes = bleacherEvents ?? [];
  const bleacherUuids = [...new Set(bes.map((be) => be.bleacher_uuid).filter(Boolean))] as string[];

  // 2. Run event-level alerts on this event
  const eventDefs = getDefinitionsForEntity("event");
  for (const def of eventDefs) {
    await syncAlert(def, eventUuid, supabase);
  }

  // 3. Run bleacher_event-level alerts on this event's bleacher_events
  const beDefs = getDefinitionsForEntity("bleacher_event");
  for (const be of bes) {
    for (const def of beDefs) {
      await syncAlert(def, be.id, supabase);
    }
  }

  // 4. Find OTHER bleacher_events on the same bleachers (ripple effect)
  //    These could be affected by this event changing the "last known location"
  //    or resolving/creating scheduling conflicts
  if (bleacherUuids.length > 0) {
    const { data: relatedBEs } = await supabase
      .from("BleacherEvents")
      .select("id, event_uuid, Events!inner(event_start)")
      .in("bleacher_uuid", bleacherUuids)
      .neq("event_uuid", eventUuid)
      .gte("Events.event_start", todayStart());

    for (const rbe of relatedBEs ?? []) {
      for (const def of beDefs) {
        await syncAlert(def, rbe.id, supabase);
      }
    }

    // 5. Find work trackers on these bleachers (could affect WT transportation alerts)
    const wtDefs = getDefinitionsForEntity("work_tracker");
    if (wtDefs.length > 0) {
      const { data: relatedWTs } = await supabase
        .from("WorkTrackers")
        .select("id")
        .in("bleacher_uuid", bleacherUuids)
        .gte("date", todayStart());

      for (const wt of relatedWTs ?? []) {
        for (const def of wtDefs) {
          await syncAlert(def, wt.id, supabase);
        }
      }
    }
  }
}

async function triageEventDeleted(
  eventUuid: string,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  // Find bleacher_events for this event before they get cascade-deleted
  const { data: bleacherEvents } = await supabase
    .from("BleacherEvents")
    .select("id, bleacher_uuid")
    .eq("event_uuid", eventUuid);

  const bes = bleacherEvents ?? [];
  const bleacherUuids = [...new Set(bes.map((be) => be.bleacher_uuid).filter(Boolean))] as string[];

  // Delete alerts on this event and its bleacher_events
  await deleteAllAlertsForEntity(eventUuid, supabase);
  for (const be of bes) {
    await deleteAllAlertsForEntity(be.id, supabase);
  }

  // Re-evaluate neighboring bleacher_events and work trackers
  if (bleacherUuids.length > 0) {
    const beDefs = getDefinitionsForEntity("bleacher_event");
    const { data: relatedBEs } = await supabase
      .from("BleacherEvents")
      .select("id, Events!inner(event_start)")
      .in("bleacher_uuid", bleacherUuids)
      .neq("event_uuid", eventUuid)
      .gte("Events.event_start", todayStart());

    for (const rbe of relatedBEs ?? []) {
      for (const def of beDefs) {
        await syncAlert(def, rbe.id, supabase);
      }
    }

    const wtDefs = getDefinitionsForEntity("work_tracker");
    if (wtDefs.length > 0) {
      const { data: relatedWTs } = await supabase
        .from("WorkTrackers")
        .select("id")
        .in("bleacher_uuid", bleacherUuids)
        .gte("date", todayStart());

      for (const wt of relatedWTs ?? []) {
        for (const def of wtDefs) {
          await syncAlert(def, wt.id, supabase);
        }
      }
    }
  }
}

async function triageWorkTrackerSaved(
  workTrackerUuid: string,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { data: wt } = await supabase
    .from("WorkTrackers")
    .select("id, bleacher_uuid, date")
    .eq("id", workTrackerUuid)
    .single();

  if (!wt) return;

  // 1. Run work_tracker-level alerts on this work tracker
  const wtDefs = getDefinitionsForEntity("work_tracker");
  for (const def of wtDefs) {
    await syncAlert(def, wt.id, supabase);
  }

  // 2. Find upcoming bleacher_events for this bleacher (ripple effect on transportation)
  if (wt.bleacher_uuid) {
    const beDefs = getDefinitionsForEntity("bleacher_event");
    const { data: relatedBEs } = await supabase
      .from("BleacherEvents")
      .select("id, Events!inner(event_start)")
      .eq("bleacher_uuid", wt.bleacher_uuid)
      .gte("Events.event_start", todayStart());

    for (const rbe of relatedBEs ?? []) {
      for (const def of beDefs) {
        await syncAlert(def, rbe.id, supabase);
      }
    }
  }
}

async function triageWorkTrackerDeleted(
  workTrackerUuid: string,
  bleacherUuid: string | null,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  await deleteAllAlertsForEntity(workTrackerUuid, supabase);

  if (bleacherUuid) {
    const beDefs = getDefinitionsForEntity("bleacher_event");
    const { data: relatedBEs } = await supabase
      .from("BleacherEvents")
      .select("id, Events!inner(event_start)")
      .eq("bleacher_uuid", bleacherUuid)
      .gte("Events.event_start", todayStart());

    for (const rbe of relatedBEs ?? []) {
      for (const def of beDefs) {
        await syncAlert(def, rbe.id, supabase);
      }
    }
  }
}
