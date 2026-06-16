import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../database.types";
import { AlertDefinition, AlertPayload, InMemoryAlertContext } from "../types";
import {
  findLastKnownLocation,
  findLastKnownLocationInMemory,
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

  evaluateInMemory({
    event,
    allEvents,
    allBleacherEvents,
    allWorkTrackers,
    allBleachers,
    allAddresses,
  }: InMemoryAlertContext): AlertPayload[] {
    const alerts: AlertPayload[] = [];
    if (!event.eventStart) return alerts;

    const eventAddressUuid = event.addressData?.addressUuid ?? null;
    if (!eventAddressUuid) return alerts;

    const eventAddr = allAddresses.find((a) => a.id === eventAddressUuid);
    const eventStreet = eventAddr?.street ?? "";
    if (!eventStreet) return alerts;

    for (const bleacherUuid of event.bleacherUuids) {
      const lastLocation = findLastKnownLocationInMemory(
        bleacherUuid,
        event.eventStart,
        allEvents,
        allBleacherEvents,
        allWorkTrackers,
      );

      if (!lastLocation) continue;

      const lastAddr = allAddresses.find((a) => a.id === lastLocation.addressUuid);
      const lastStreet = lastAddr?.street ?? "";

      if (!lastStreet || lastStreet === eventStreet) continue;

      const bleacher = allBleachers.find((b) => b.id === bleacherUuid);
      const desc = [
        bleacher?.bleacher_number != null ? `Bleacher #${bleacher.bleacher_number}` : null,
        event.eventName,
      ]
        .filter(Boolean)
        .join(" — ");

      alerts.push({
        entity_uuid: event.eventUuid,
        entity_type: "bleacher_event",
        title: "No Transportation",
        message: `${desc}: Last known location: ${lastStreet}. Event location: ${eventStreet}.`,
        entity_description: desc || null,
      });
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
