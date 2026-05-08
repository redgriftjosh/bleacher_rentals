import { SupabaseClient } from "@supabase/supabase-js";
import { AlertDefinition } from "../AlertDefinition";
import { AlertEntityType, AlertPayload } from "../types";
import { Database, Tables } from "../../../../database.types";
import { syncAlertsForEntity, deleteAlertsForEntity } from "../util/syncAlerts";
import { getAlertWindowStart, getAlertWindowEnd, parseDateLocal } from "../util/alertDateWindow";

type EventBleacherDeliveryContext = {
  /** The specific BleacherEvent being checked. */
  bleacherEvent: Tables<"BleacherEvents">;
  /** The bleacher record, used to include bleacher_number in the message. */
  bleacher: Pick<Tables<"Bleachers">, "bleacher_number"> | null;
  /** The event this bleacher is assigned to (for address + start date). */
  event: Tables<"Events">;
  /** All work trackers to search through. */
  workTrackers: Tables<"WorkTrackers">[];
  /** All addresses, used to resolve dropoff_address_uuid → street. */
  addresses: Tables<"Addresses">[];
};

/**
 * Fires when a bleacher assigned to a booked event has no confirmed delivery work tracker
 * before the event's start date at the event's address.
 *
 * "Confirmed delivery" means: a work tracker whose `date` is on or before the event's
 * event_start, AND whose dropoff address `street` matches the event's address `street`
 * (case-insensitive, trimmed).
 *
 * The alert is scoped to the `BleacherEvent` row (entity_type = "bleacher_event") so
 * each bleacher–event pair carries its own alert independently.
 */
class EventBleacherDeliveryDefinition extends AlertDefinition<EventBleacherDeliveryContext> {
  readonly title = "Bleacher Delivery Not Confirmed";

  evaluate({
    bleacherEvent,
    bleacher,
    event,
    workTrackers,
    addresses,
  }: EventBleacherDeliveryContext): AlertPayload[] {
    // Only flag booked events — quoted events don't need confirmed deliveries yet.
    if (!event.booked) return [];

    // Only alert for events starting within the current window (today → next Sunday).
    const eventDate = parseDateLocal(event.event_start);
    if (eventDate < getAlertWindowStart() || eventDate > getAlertWindowEnd()) return [];

    // No event address → can't check delivery location.
    if (!event.address_uuid) return [];

    const eventAddress = addresses.find((a) => a.id === event.address_uuid);
    if (!eventAddress?.street) return [];

    const eventStreet = eventAddress.street.trim().toLowerCase();

    // The delivery must arrive on or before event_start.
    const deadline = parseDateLocal(event.event_start);

    // Build a fast lookup: address_id → street
    const addressStreet = new Map(addresses.map((a) => [a.id, a.street.trim().toLowerCase()]));

    const hasDelivery = workTrackers.some((wt) => {
      if (wt.bleacher_uuid !== bleacherEvent.bleacher_uuid) return false;
      if (!wt.date) return false;
      if (parseDateLocal(wt.date) > deadline) return false;
      if (!wt.dropoff_address_uuid) return false;
      return addressStreet.get(wt.dropoff_address_uuid) === eventStreet;
    });

    if (hasDelivery) return [];

    const description = [event.event_name, eventAddress.street].filter(Boolean).join(" — ");
    const bleacherLabel = bleacher ? `Bleacher #${bleacher.bleacher_number}` : "A bleacher";

    return [
      {
        entity_uuid: bleacherEvent.id,
        entity_type: "bleacher_event",
        title: this.title,
        message: `${bleacherLabel} has no delivery work tracker to ${eventAddress.street} before ${deadline.toLocaleDateString()}.`,
        entity_description: description || null,
      },
    ];
  }

  async sync(
    entityUuid: string,
    entityType: AlertEntityType,
    alerts: AlertPayload[],
    saverUserUuid: string | null,
    ownerUserUuid: string | null,
    supabase: SupabaseClient<Database>,
  ): Promise<void> {
    await syncAlertsForEntity(
      this.title,
      entityUuid,
      entityType,
      alerts,
      saverUserUuid,
      ownerUserUuid,
      supabase,
    );
  }

  async delete(entityUuid: string, supabase: SupabaseClient<Database>): Promise<void> {
    await deleteAlertsForEntity(this.title, entityUuid, supabase);
  }

  /**
   * Fetches BleacherEvents, WorkTrackers, and Addresses for an event then evaluates
   * and syncs a delivery alert for each BleacherEvent. Call this after creating or
   * updating an event.
   */
  async syncForEvent(
    eventUuid: string,
    eventRow: Pick<Tables<"Events">, "booked" | "address_uuid" | "event_start" | "event_name">,
    saverUserUuid: string | null,
    ownerUserUuid: string | null,
    supabase: SupabaseClient<Database>,
  ): Promise<void> {
    // If no owner supplied (e.g. cron), resolve it from the event record.
    let resolvedOwner = ownerUserUuid;
    if (!resolvedOwner) {
      const { data: eventMeta } = await supabase
        .from("Events")
        .select("created_by_user_uuid")
        .eq("id", eventUuid)
        .single();
      resolvedOwner = eventMeta?.created_by_user_uuid ?? null;
    }

    const { data: bleacherEvents, error: beError } = await supabase
      .from("BleacherEvents")
      .select("*")
      .eq("event_uuid", eventUuid);
    if (beError) {
      console.error("[eventBleacherDelivery] Failed to fetch BleacherEvents:", beError);
      return;
    }
    if (!bleacherEvents?.length) return;

    const bleacherUuids = [
      ...new Set(bleacherEvents.map((be) => be.bleacher_uuid).filter(Boolean) as string[]),
    ];
    const { data: workTrackers, error: wtError } = await supabase
      .from("WorkTrackers")
      .select("*")
      .in("bleacher_uuid", bleacherUuids);
    if (wtError) {
      console.error("[eventBleacherDelivery] Failed to fetch WorkTrackers:", wtError);
      return;
    }

    const { data: bleachersData, error: blError } = await supabase
      .from("Bleachers")
      .select("id, bleacher_number")
      .in("id", bleacherUuids);
    if (blError) {
      console.error("[eventBleacherDelivery] Failed to fetch Bleachers:", blError);
    }
    const bleacherMap = new Map((bleachersData ?? []).map((b) => [b.id, b]));

    const addressUuids = new Set<string>();
    if (eventRow.address_uuid) addressUuids.add(eventRow.address_uuid);
    (workTrackers ?? []).forEach((wt) => {
      if (wt.dropoff_address_uuid) addressUuids.add(wt.dropoff_address_uuid);
    });

    const { data: addresses, error: addrError } = addressUuids.size
      ? await supabase
          .from("Addresses")
          .select("*")
          .in("id", [...addressUuids])
      : { data: [], error: null };
    if (addrError) {
      console.error("[eventBleacherDelivery] Failed to fetch Addresses:", addrError);
      return;
    }

    for (const bleacherEvent of bleacherEvents) {
      const bleacher = bleacherEvent.bleacher_uuid
        ? (bleacherMap.get(bleacherEvent.bleacher_uuid) ?? null)
        : null;
      const alerts = this.evaluate({
        bleacherEvent,
        bleacher,
        event: eventRow as Tables<"Events">,
        workTrackers: workTrackers ?? [],
        addresses: addresses ?? [],
      });
      await this.sync(
        bleacherEvent.id,
        "bleacher_event",
        alerts,
        saverUserUuid,
        resolvedOwner,
        supabase,
      );
    }
  }

  /**
   * Deletes all delivery alerts for every BleacherEvent belonging to an event.
   * Call this before deleting an event.
   */
  async deleteForEvent(eventUuid: string, supabase: SupabaseClient<Database>): Promise<void> {
    const { data: bleacherEvents, error } = await supabase
      .from("BleacherEvents")
      .select("id")
      .eq("event_uuid", eventUuid);
    if (error) {
      console.error("[eventBleacherDelivery] Failed to fetch BleacherEvents:", error);
      return;
    }
    for (const be of bleacherEvents ?? []) {
      await this.delete(be.id, supabase);
    }
  }

  /**
   * Re-evaluates delivery alerts for all BleacherEvents assigned to this bleacher.
   * Call this after saving or deleting a work tracker.
   */
  async syncForBleacher(
    bleacherUuid: string | null,
    saverUserUuid: string | null,
    supabase: SupabaseClient<Database>,
  ): Promise<void> {
    if (!bleacherUuid) return;

    const { data: rawBleacherEvents, error: beError } = await supabase
      .from("BleacherEvents")
      .select("*, event:Events(*)")
      .eq("bleacher_uuid", bleacherUuid);
    if (beError) {
      console.error("[eventBleacherDelivery] Failed to fetch BleacherEvents:", beError);
      return;
    }
    if (!rawBleacherEvents?.length) return;

    const { data: workTrackers, error: wtError } = await supabase
      .from("WorkTrackers")
      .select("*")
      .eq("bleacher_uuid", bleacherUuid);
    if (wtError) {
      console.error("[eventBleacherDelivery] Failed to fetch WorkTrackers:", wtError);
      return;
    }

    const { data: bleacherData, error: blError } = await supabase
      .from("Bleachers")
      .select("id, bleacher_number")
      .eq("id", bleacherUuid)
      .single();
    if (blError) {
      console.error("[eventBleacherDelivery] Failed to fetch Bleacher:", blError);
    }
    const bleacher = bleacherData ?? null;

    const addressUuids = new Set<string>();
    for (const row of rawBleacherEvents) {
      const event = (row as any).event as Tables<"Events"> | null;
      if (event?.address_uuid) addressUuids.add(event.address_uuid);
    }
    (workTrackers ?? []).forEach((wt) => {
      if (wt.dropoff_address_uuid) addressUuids.add(wt.dropoff_address_uuid);
    });

    const { data: addresses, error: addrError } = addressUuids.size
      ? await supabase
          .from("Addresses")
          .select("*")
          .in("id", [...addressUuids])
      : { data: [], error: null };
    if (addrError) {
      console.error("[eventBleacherDelivery] Failed to fetch Addresses:", addrError);
      return;
    }

    for (const row of rawBleacherEvents) {
      const event = (row as any).event as Tables<"Events"> | null;
      if (!event) continue;
      const bleacherEvent = row as Tables<"BleacherEvents">;
      // Resolve owner from the joined event row.
      const resolvedOwner = event.created_by_user_uuid ?? null;
      const alerts = this.evaluate({
        bleacherEvent,
        bleacher,
        event,
        workTrackers: workTrackers ?? [],
        addresses: addresses ?? [],
      });
      await this.sync(
        bleacherEvent.id,
        "bleacher_event",
        alerts,
        saverUserUuid,
        resolvedOwner,
        supabase,
      );
    }
  }
}

export const eventBleacherDelivery = new EventBleacherDeliveryDefinition();
