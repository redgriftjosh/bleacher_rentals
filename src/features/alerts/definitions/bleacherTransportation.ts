import { AlertDefinition } from "../types";
import {
  findLastKnownLocation,
  resolveStreet,
} from "../util/findLastKnownLocation";

export const bleacherTransportation: AlertDefinition = {
  title: "No Transportation",
  entityType: "bleacher_event",

  async evaluate(bleacherEventUuid, supabase) {
    const { data: be } = await supabase
      .from("BleacherEvents")
      .select(
        "id, bleacher_uuid, Events!inner(id, event_name, event_start, address_uuid), Bleachers!inner(bleacher_number)",
      )
      .eq("id", bleacherEventUuid)
      .single();

    if (!be?.Events || Array.isArray(be.Events) || !be.bleacher_uuid) return null;
    const event = be.Events;
    if (!event.address_uuid) return null;

    const lastLocation = await findLastKnownLocation(
      be.bleacher_uuid,
      event.event_start,
      supabase,
    );
    if (!lastLocation) return null;

    const lastStreet = await resolveStreet(lastLocation.addressUuid, supabase);
    const eventStreet = await resolveStreet(event.address_uuid, supabase);

    if (!lastStreet || !eventStreet || lastStreet === eventStreet) return null;

    const bleacherNum =
      be.Bleachers && !Array.isArray(be.Bleachers) ? be.Bleachers.bleacher_number : null;
    const desc = [bleacherNum != null ? `Bleacher #${bleacherNum}` : null, event.event_name]
      .filter(Boolean)
      .join(" — ");

    return {
      message: `Last known location: ${lastStreet}. Event location: ${eventStreet}.`,
      entityDescription: desc || null,
    };
  },

  // evaluateInMemory is intentionally omitted — transportation alerts for the
  // event config form are computed reactively by useEventFormTransportationAlerts
  // using live PowerSync data, which also handles unsaved (new) events.

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
