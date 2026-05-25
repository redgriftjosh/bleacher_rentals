import { SupabaseClient } from "@supabase/supabase-js";
import { AlertDefinition } from "../../AlertDefinition";
import { AlertEntityType, AlertPayload } from "../../types";
import { Database, Tables } from "../../../../../database.types";
import {
  syncAlertsForEntity,
  deleteAlertsForEntity,
} from "../../util/syncAlerts";
import { resolveLastKnownAddress } from "../../util/resolveLastKnownAddress";

type WorkTrackerPickupMismatchContext = {
  /** The work tracker being checked. */
  workTracker: Pick<
    Tables<"WorkTrackers">,
    "id" | "bleacher_uuid" | "date" | "pickup_address_uuid"
  >;
  /** The bleacher record, used for the message. */
  bleacher: Pick<Tables<"Bleachers">, "bleacher_number"> | null;
  /** All work trackers for this bleacher (to build address history). */
  allWorkTrackers: Tables<"WorkTrackers">[];
  /** All addresses, used to resolve address UUIDs → street. */
  addresses: Tables<"Addresses">[];
  /** All bleacher-event assignments for this bleacher. */
  allBleacherEvents: Tables<"BleacherEvents">[];
  /** All events (to resolve event addresses and dates). */
  allEvents: Tables<"Events">[];
  /** Optional: pickup street override for unsaved addresses (no UUID yet). */
  pickupStreetOverride?: string;
};

/**
 * Fires when a work tracker's pickup address does not match the bleacher's
 * last known location (resolved from prior events and work trackers).
 *
 * Scoped per WorkTracker row (entity_type = "work_tracker").
 */
class WorkTrackerPickupMismatchDefinition extends AlertDefinition<WorkTrackerPickupMismatchContext> {
  readonly title = "Pickup Address Mismatch";

  evaluate({
    workTracker,
    bleacher,
    allWorkTrackers,
    addresses,
    allBleacherEvents,
    allEvents,
    pickupStreetOverride,
  }: WorkTrackerPickupMismatchContext): AlertPayload[] {
    if (!workTracker.bleacher_uuid || !workTracker.date) return [];

    // Resolve pickup street: prefer override, fall back to UUID lookup
    let pickupStreet: string;
    let pickupStreetDisplay: string;
    if (pickupStreetOverride) {
      pickupStreet = pickupStreetOverride.trim().toLowerCase();
      pickupStreetDisplay = pickupStreetOverride;
    } else {
      if (!workTracker.pickup_address_uuid) return [];
      const pickupAddr = addresses.find(
        (a) => a.id === workTracker.pickup_address_uuid,
      );
      if (!pickupAddr?.street) return [];
      pickupStreet = pickupAddr.street.trim().toLowerCase();
      pickupStreetDisplay = pickupAddr.street;
    }

    if (!pickupStreet) return [];

    const targetDate = workTracker.date.slice(0, 10);
    const bleacherUuid = workTracker.bleacher_uuid;

    // Build address-to-street lookup
    const addressStreet = new Map(
      addresses.map((a) => [a.id, a.street.trim().toLowerCase()]),
    );

    // Work tracker address entries (excluding THIS work tracker)
    const wtEntries = allWorkTrackers
      .filter(
        (wt) =>
          wt.bleacher_uuid === bleacherUuid &&
          wt.id !== workTracker.id &&
          wt.date &&
          wt.dropoff_address_uuid,
      )
      .map((wt) => ({
        date: wt.date!,
        street: addressStreet.get(wt.dropoff_address_uuid!) ?? "",
        source: "work_tracker" as const,
      }))
      .filter((e) => e.street);

    // Event address entries
    const bleacherEventUuids = allBleacherEvents
      .filter((be) => be.bleacher_uuid === bleacherUuid)
      .map((be) => be.event_uuid);

    const eventEntries = allEvents
      .filter((ev) => bleacherEventUuids.includes(ev.id) && ev.address_uuid)
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

    // No history → nothing to compare against → no alert
    if (lastKnown === null) return [];

    // Match → no alert
    if (lastKnown === pickupStreet) return [];

    // Mismatch → alert
    const bleacherLabel = bleacher
      ? `Bleacher #${bleacher.bleacher_number}`
      : "A bleacher";

    // Resolve last known display name (un-lowercased)
    const lastKnownDisplay =
      addresses.find((a) => a.street.trim().toLowerCase() === lastKnown)
        ?.street ?? lastKnown;

    return [
      {
        entity_uuid: workTracker.id,
        entity_type: "work_tracker" as AlertEntityType,
        title: this.title,
        message: `Last known location is ${lastKnownDisplay}.`,
        entity_description: `${bleacherLabel} — ${workTracker.date}`,
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
   * Fetches all data needed for a single work tracker, evaluates, and syncs.
   * Call after saving a work tracker.
   */
  async syncForWorkTracker(
    workTrackerUuid: string,
    saverUserUuid: string | null,
    supabase: SupabaseClient<Database>,
  ): Promise<void> {
    const { data: wt, error: wtError } = await supabase
      .from("WorkTrackers")
      .select("*")
      .eq("id", workTrackerUuid)
      .single();
    if (wtError || !wt) {
      console.error(
        "[workTrackerPickupMismatch] Failed to fetch WorkTracker:",
        wtError,
      );
      return;
    }

    if (!wt.bleacher_uuid) return;

    // All work trackers for this bleacher
    const { data: allWts, error: allWtError } = await supabase
      .from("WorkTrackers")
      .select("*")
      .eq("bleacher_uuid", wt.bleacher_uuid);
    if (allWtError) {
      console.error(
        "[workTrackerPickupMismatch] Failed to fetch all WorkTrackers:",
        allWtError,
      );
      return;
    }

    // All bleacher-event assignments
    const { data: allBEs, error: beError } = await supabase
      .from("BleacherEvents")
      .select("*")
      .eq("bleacher_uuid", wt.bleacher_uuid);
    if (beError) {
      console.error(
        "[workTrackerPickupMismatch] Failed to fetch BleacherEvents:",
        beError,
      );
      return;
    }

    const relatedEventUuids = [
      ...new Set(
        (allBEs ?? []).map((be) => be.event_uuid).filter(Boolean) as string[],
      ),
    ];

    const { data: allEvents, error: evError } = relatedEventUuids.length
      ? await supabase.from("Events").select("*").in("id", relatedEventUuids)
      : { data: [] as Tables<"Events">[], error: null };
    if (evError) {
      console.error(
        "[workTrackerPickupMismatch] Failed to fetch Events:",
        evError,
      );
      return;
    }

    // Gather all address UUIDs
    const addressUuids = new Set<string>();
    if (wt.pickup_address_uuid) addressUuids.add(wt.pickup_address_uuid);
    (allWts ?? []).forEach((w) => {
      if (w.dropoff_address_uuid) addressUuids.add(w.dropoff_address_uuid);
    });
    (allEvents ?? []).forEach((ev) => {
      if (ev.address_uuid) addressUuids.add(ev.address_uuid);
    });

    const { data: addresses, error: addrError } = addressUuids.size
      ? await supabase
          .from("Addresses")
          .select("*")
          .in("id", [...addressUuids])
      : { data: [] as Tables<"Addresses">[], error: null };
    if (addrError) {
      console.error(
        "[workTrackerPickupMismatch] Failed to fetch Addresses:",
        addrError,
      );
      return;
    }

    // Bleacher for display name
    const { data: bleacherData } = await supabase
      .from("Bleachers")
      .select("id, bleacher_number")
      .eq("id", wt.bleacher_uuid)
      .single();

    const alerts = this.evaluate({
      workTracker: wt,
      bleacher: bleacherData ?? null,
      allWorkTrackers: allWts ?? [],
      addresses: addresses ?? [],
      allBleacherEvents: allBEs ?? [],
      allEvents: allEvents ?? [],
    });

    // Resolve owner from the work tracker's user_uuid
    const ownerUserUuid = wt.user_uuid ?? null;

    await this.sync(
      wt.id,
      "work_tracker" as AlertEntityType,
      alerts,
      saverUserUuid,
      ownerUserUuid,
      supabase,
    );
  }
}

export const workTrackerPickupMismatch =
  new WorkTrackerPickupMismatchDefinition();
