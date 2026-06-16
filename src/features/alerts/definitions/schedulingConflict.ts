import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../database.types";
import { AlertDefinition, AlertPayload, InMemoryAlertContext } from "../types";

export const schedulingConflict: AlertDefinition = {
  title: "Scheduling Conflict",
  entityType: "bleacher_event",

  async evaluate(bleacherEventUuid, supabase) {
    const { data: be } = await supabase
      .from("BleacherEvents")
      .select(
        "id, bleacher_uuid, event_uuid, Events!inner(id, event_name, event_start, event_end, setup_start, teardown_end, event_status, address_uuid), Bleachers!inner(bleacher_number)",
      )
      .eq("id", bleacherEventUuid)
      .single();

    if (!be?.Events || Array.isArray(be.Events)) return null;
    const event = be.Events;
    if (event.event_status !== "booked") return null;

    const start = new Date(event.setup_start ?? event.event_start);
    const end = new Date(event.teardown_end ?? event.event_end);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (end < today) return null;

    const { data: otherBEs } = await supabase
      .from("BleacherEvents")
      .select(
        "id, Events!inner(id, event_name, event_start, event_end, setup_start, teardown_end, event_status)",
      )
      .eq("bleacher_uuid", be.bleacher_uuid!)
      .neq("id", bleacherEventUuid)
      .eq("Events.event_status", "booked");

    if (!otherBEs) return null;

    for (const other of otherBEs) {
      if (!other.Events || Array.isArray(other.Events)) continue;
      const o = other.Events;
      const oStart = new Date(o.setup_start ?? o.event_start);
      const oEnd = new Date(o.teardown_end ?? o.event_end);

      if (start <= oEnd && oStart <= end) {
        const bleacherNum =
          be.Bleachers && !Array.isArray(be.Bleachers)
            ? be.Bleachers.bleacher_number
            : null;
        const desc = [
          bleacherNum != null ? `Bleacher #${bleacherNum}` : null,
          event.event_name,
        ]
          .filter(Boolean)
          .join(" — ");

        return {
          message: `Double booked with ${o.event_name}.`,
          entityDescription: desc || null,
        };
      }
    }

    return null;
  },

  evaluateInMemory({ event, allEvents, allBleacherEvents }: InMemoryAlertContext): AlertPayload[] {
    const alerts: AlertPayload[] = [];
    if (event.selectedStatus !== "booked") return alerts;

    const currentStart = new Date(event.setupStart ?? event.eventStart);
    const currentEnd = new Date(event.teardownEnd ?? event.eventEnd);

    const eventUuidToBleachers: Record<string, string[]> = {};
    for (const be of allBleacherEvents) {
      if (!be.event_uuid || !be.bleacher_uuid) continue;
      if (!eventUuidToBleachers[be.event_uuid]) eventUuidToBleachers[be.event_uuid] = [];
      eventUuidToBleachers[be.event_uuid].push(be.bleacher_uuid);
    }

    for (const other of allEvents) {
      if (other.id === event.eventUuid) continue;
      if (other.event_status !== "booked") continue;

      const oStart = new Date(other.setup_start ?? other.event_start);
      const oEnd = new Date(other.teardown_end ?? other.event_end);

      const bleachersInOther = eventUuidToBleachers[other.id] ?? [];
      const hasOverlap = bleachersInOther.some((id) => event.bleacherUuids.includes(id));
      if (!hasOverlap) continue;

      if (currentStart <= oEnd && oStart <= currentEnd) {
        alerts.push({
          entity_uuid: event.eventUuid,
          entity_type: "event",
          title: "Scheduling Conflict",
          message: "This event is overlapping with other events!",
          entity_description: event.eventName || null,
        });
        break;
      }
    }

    return alerts;
  },

  async recipients(bleacherEventUuid, supabase) {
    const { data: be } = await supabase
      .from("BleacherEvents")
      .select("Events!inner(created_by_user_uuid)")
      .eq("id", bleacherEventUuid)
      .single();

    if (!be?.Events || Array.isArray(be.Events)) return [];
    return be.Events.created_by_user_uuid ? [be.Events.created_by_user_uuid] : [];
  },
};
