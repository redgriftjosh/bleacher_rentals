import { SupabaseClient } from "@supabase/supabase-js";
import { AlertDefinition } from "../../AlertDefinition";
import { AlertEntityType, AlertPayload } from "../../types";
import { Database, Tables } from "../../../../../database.types";
import {
  syncAlertsForEntity,
  deleteAlertsForEntity,
} from "../../util/syncAlerts";
import {
  getAlertWindowStart,
  getAlertWindowEnd,
  parseDateLocal,
} from "../../util/alertDateWindow";
import { resolveLastKnownAddress } from "../../util/resolveLastKnownAddress";

type EventBleacherDeliveryContext = {
  /** The specific BleacherEvent being checked. */
  bleacherEvent: Tables<"BleacherEvents">;
  /** The bleacher record, used to include bleacher_number in the message. */
  bleacher: Pick<Tables<"Bleachers">, "bleacher_number"> | null;
  /** The event this bleacher is assigned to (for address + start date). */
  event: Tables<"Events">;
  /** All work trackers for this bleacher. */
  workTrackers: Tables<"WorkTrackers">[];
  /** All addresses, used to resolve address UUIDs → street. */
  addresses: Tables<"Addresses">[];
  /** All bleacher-event assignments for this bleacher (to check prior events). */
  allBleacherEvents: Tables<"BleacherEvents">[];
  /** All events (to resolve event addresses and dates). */
  allEvents: Tables<"Events">[];
  useDateWindow?: boolean;
  /** Optional street string override — used when the address hasn't been saved to DB yet (no address_uuid). */
  eventStreetOverride?: string;
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
    allBleacherEvents,
    allEvents,
    useDateWindow,
    eventStreetOverride,
  }: EventBleacherDeliveryContext): AlertPayload[] {
    if (!event.booked) return [];

    if (useDateWindow) {
      const eventDate = parseDateLocal(event.event_start);
      if (eventDate < getAlertWindowStart() || eventDate > getAlertWindowEnd())
        return [];
    }

    // Resolve the event's street: prefer override (unsaved address), fall back to UUID lookup
    let eventStreet: string;
    let eventStreetDisplay: string;
    if (eventStreetOverride) {
      eventStreet = eventStreetOverride.trim().toLowerCase();
      eventStreetDisplay = eventStreetOverride;
    } else {
      if (!event.address_uuid) return [];
      const eventAddress = addresses.find((a) => a.id === event.address_uuid);
      if (!eventAddress?.street) return [];
      eventStreet = eventAddress.street.trim().toLowerCase();
      eventStreetDisplay = eventAddress.street;
    }

    if (!eventStreet) return [];
    const targetDate = event.event_start.slice(0, 10);

    const addressStreet = new Map(
      addresses.map((a) => [a.id, a.street.trim().toLowerCase()]),
    );

    const bleacherUuid = bleacherEvent.bleacher_uuid;

    const wtEntries = workTrackers
      .filter((wt) => wt.bleacher_uuid === bleacherUuid && wt.date && wt.dropoff_address_uuid)
      .map((wt) => ({
        date: wt.date!,
        street: addressStreet.get(wt.dropoff_address_uuid!) ?? "",
        source: "work_tracker" as const,
      }))
      .filter((e) => e.street);

    const otherBleacherEventUuids = allBleacherEvents
      .filter((be) => be.bleacher_uuid === bleacherUuid && be.id !== bleacherEvent.id)
      .map((be) => be.event_uuid);

    const eventEntries = allEvents
      .filter((ev) => otherBleacherEventUuids.includes(ev.id) && ev.address_uuid)
      .map((ev) => ({
        date: ev.event_start.slice(0, 10),
        street: addressStreet.get(ev.address_uuid!) ?? "",
        source: "event" as const,
      }))
      .filter((e) => e.street);

    const lastKnown = resolveLastKnownAddress(
      [...wtEntries, ...eventEntries],
      targetDate,
    );

    if (lastKnown === eventStreet) return [];

    const description = [event.event_name, eventStreetDisplay]
      .filter(Boolean)
      .join(" — ");
    const bleacherLabel = bleacher
      ? `Bleacher #${bleacher.bleacher_number}`
      : "A bleacher";

    return [
      {
        entity_uuid: bleacherEvent.id,
        entity_type: "bleacher_event",
        title: this.title,
        message: `${bleacherLabel} has no delivery work tracker to ${eventStreetDisplay} before ${event.event_start.slice(0, 10)}.`,
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

  async delete(
    entityUuid: string,
    supabase: SupabaseClient<Database>,
  ): Promise<void> {
    await deleteAlertsForEntity(this.title, entityUuid, supabase);
  }

  /**
   * Fetches BleacherEvents, WorkTrackers, and Addresses for an event then evaluates
   * and syncs a delivery alert for each BleacherEvent. Call this after creating or
   * updating an event.
   */
  async syncForEvent(
    eventUuid: string,
    eventRow: Pick<
      Tables<"Events">,
      "booked" | "address_uuid" | "event_start" | "event_name"
    >,
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

    const { data: thisEventBEs, error: beError } = await supabase
      .from("BleacherEvents")
      .select("*")
      .eq("event_uuid", eventUuid);
    if (beError) {
      console.error(
        "[eventBleacherDelivery] Failed to fetch BleacherEvents:",
        beError,
      );
      return;
    }
    if (!thisEventBEs?.length) return;

    const bleacherUuids = [
      ...new Set(
        thisEventBEs
          .map((be) => be.bleacher_uuid)
          .filter(Boolean) as string[],
      ),
    ];

    // Fetch all bleacher-event assignments for these bleachers (not just this event)
    const { data: allBleacherEvents, error: allBeError } = await supabase
      .from("BleacherEvents")
      .select("*")
      .in("bleacher_uuid", bleacherUuids);
    if (allBeError) {
      console.error(
        "[eventBleacherDelivery] Failed to fetch all BleacherEvents:",
        allBeError,
      );
      return;
    }

    const relatedEventUuids = [
      ...new Set(
        (allBleacherEvents ?? [])
          .map((be) => be.event_uuid)
          .filter(Boolean) as string[],
      ),
    ];

    const { data: allEvents, error: evError } = await supabase
      .from("Events")
      .select("*")
      .in("id", relatedEventUuids);
    if (evError) {
      console.error(
        "[eventBleacherDelivery] Failed to fetch Events:",
        evError,
      );
      return;
    }

    const { data: workTrackers, error: wtError } = await supabase
      .from("WorkTrackers")
      .select("*")
      .in("bleacher_uuid", bleacherUuids);
    if (wtError) {
      console.error(
        "[eventBleacherDelivery] Failed to fetch WorkTrackers:",
        wtError,
      );
      return;
    }

    const { data: bleachersData, error: blError } = await supabase
      .from("Bleachers")
      .select("id, bleacher_number")
      .in("id", bleacherUuids);
    if (blError) {
      console.error(
        "[eventBleacherDelivery] Failed to fetch Bleachers:",
        blError,
      );
    }
    const bleacherMap = new Map((bleachersData ?? []).map((b) => [b.id, b]));

    const addressUuids = new Set<string>();
    if (eventRow.address_uuid) addressUuids.add(eventRow.address_uuid);
    (allEvents ?? []).forEach((ev) => {
      if (ev.address_uuid) addressUuids.add(ev.address_uuid);
    });
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
      console.error(
        "[eventBleacherDelivery] Failed to fetch Addresses:",
        addrError,
      );
      return;
    }

    for (const bleacherEvent of thisEventBEs) {
      const bleacher = bleacherEvent.bleacher_uuid
        ? (bleacherMap.get(bleacherEvent.bleacher_uuid) ?? null)
        : null;
      const alerts = this.evaluate({
        bleacherEvent,
        bleacher,
        event: eventRow as Tables<"Events">,
        workTrackers: workTrackers ?? [],
        addresses: addresses ?? [],
        allBleacherEvents: allBleacherEvents ?? [],
        allEvents: allEvents ?? [],
        useDateWindow: true,
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
  async deleteForEvent(
    eventUuid: string,
    supabase: SupabaseClient<Database>,
  ): Promise<void> {
    const { data: bleacherEvents, error } = await supabase
      .from("BleacherEvents")
      .select("id")
      .eq("event_uuid", eventUuid);
    if (error) {
      console.error(
        "[eventBleacherDelivery] Failed to fetch BleacherEvents:",
        error,
      );
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
      console.error(
        "[eventBleacherDelivery] Failed to fetch BleacherEvents:",
        beError,
      );
      return;
    }
    if (!rawBleacherEvents?.length) return;

    const { data: workTrackers, error: wtError } = await supabase
      .from("WorkTrackers")
      .select("*")
      .eq("bleacher_uuid", bleacherUuid);
    if (wtError) {
      console.error(
        "[eventBleacherDelivery] Failed to fetch WorkTrackers:",
        wtError,
      );
      return;
    }

    const { data: bleacherData, error: blError } = await supabase
      .from("Bleachers")
      .select("id, bleacher_number")
      .eq("id", bleacherUuid)
      .single();
    if (blError) {
      console.error(
        "[eventBleacherDelivery] Failed to fetch Bleacher:",
        blError,
      );
    }
    const bleacher = bleacherData ?? null;

    const allBleacherEvents = rawBleacherEvents.map(
      (row) => row as Tables<"BleacherEvents">,
    );
    const allEvents = rawBleacherEvents
      .map((row) => (row as any).event as Tables<"Events"> | null)
      .filter(Boolean) as Tables<"Events">[];

    const addressUuids = new Set<string>();
    for (const ev of allEvents) {
      if (ev.address_uuid) addressUuids.add(ev.address_uuid);
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
      console.error(
        "[eventBleacherDelivery] Failed to fetch Addresses:",
        addrError,
      );
      return;
    }

    for (const row of rawBleacherEvents) {
      const event = (row as any).event as Tables<"Events"> | null;
      if (!event) continue;
      const bleacherEvent = row as Tables<"BleacherEvents">;
      const resolvedOwner = event.created_by_user_uuid ?? null;
      const alerts = this.evaluate({
        bleacherEvent,
        bleacher,
        event,
        workTrackers: workTrackers ?? [],
        addresses: addresses ?? [],
        allBleacherEvents,
        allEvents,
        useDateWindow: true,
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
