import { SupabaseClient } from "@supabase/supabase-js";
import { AlertDefinition } from "../AlertDefinition";
import { AlertEntityType, AlertPayload } from "../types";
import { CurrentEventState } from "@/features/eventConfiguration/state/useCurrentEventStore";
import { Database, Tables } from "../../../../database.types";
import { eventEntityDescription } from "../util/eventEntityDescription";
import { syncAlertsForEntity, deleteAlertsForEntity } from "../util/syncAlerts";

type SchedulingConflictContext = {
  event: CurrentEventState;
  allEvents: Tables<"Events">[];
  allBleacherEvents: Tables<"BleacherEvents">[];
};

/**
 * Fires when a booked event has one or more bleachers assigned to another booked event
 * whose time window overlaps (setup through teardown).
 *
 * Only booked events are considered — quoted events can freely share bleachers with no alert.
 *
 * One alert is produced per affected event (message is the same for all: "This event is
 * overlapping with other events!"). Because the conflict is bilateral, saving event A also
 * re-evaluates and updates alerts for every other event that shares bleachers with it — use
 * `syncAll()` from the form rather than the base `sync()`.
 *
 * `syncAll` uses two strategies to find affected events:
 *  1. Bleacher overlap — other events sharing any of the current event's bleachers
 *     (current assignments + any previously assigned ones still visible in the store).
 *  2. Existing DB alert sweep — any event that already carries a "Scheduling Conflict"
 *     alert, ensuring stale conflicts are cleared even if the store has been partially refreshed.
 */
class SchedulingConflictsDefinition extends AlertDefinition<SchedulingConflictContext> {
  readonly title = "Scheduling Conflict";

  evaluate({ event, allEvents, allBleacherEvents }: SchedulingConflictContext): AlertPayload[] {
    const alerts: AlertPayload[] = [];

    // Only booked events can have a scheduling conflict.
    if (event.selectedStatus !== "booked") return alerts;

    const makeAlert = (message: string): AlertPayload => ({
      entity_uuid: event.eventUuid,
      entity_type: "event",
      title: this.title,
      message,
      entity_description: eventEntityDescription(event),
    });

    const currentSetupStart = event.setupStart
      ? new Date(event.setupStart)
      : new Date(event.eventStart);

    const currentTeardownEnd = event.teardownEnd
      ? new Date(event.teardownEnd)
      : new Date(event.eventEnd);

    // Build a lookup: event_uuid => bleacher_uuids[]
    const eventUuidToBleachers: Record<string, string[]> = {};
    for (const be of allBleacherEvents) {
      if (!be.event_uuid || !be.bleacher_uuid) continue;
      if (!eventUuidToBleachers[be.event_uuid]) eventUuidToBleachers[be.event_uuid] = [];
      eventUuidToBleachers[be.event_uuid].push(be.bleacher_uuid);
    }

    for (const other of allEvents) {
      if (other.id === event.eventUuid) continue;

      const otherSetupStart = other.setup_start
        ? new Date(other.setup_start)
        : new Date(other.event_start);

      const otherTeardownEnd = other.teardown_end
        ? new Date(other.teardown_end)
        : new Date(other.event_end);

      const bleachersInOther = eventUuidToBleachers[other.id] ?? [];
      const hasOverlappingBleacher = bleachersInOther.some((id) =>
        event.bleacherUuids.includes(id),
      );

      if (!hasOverlappingBleacher) continue;
      if (other.event_status !== "booked") continue;

      if (currentSetupStart <= otherTeardownEnd && otherSetupStart <= currentTeardownEnd) {
        alerts.push(makeAlert("This event is overlapping with other events!"));
        break;
      }
    }

    return alerts;
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

  /** Builds a bleacher UUID → list lookup from allBleacherEvents, then overrides
   *  the current event's entry with its freshly-saved bleacher list. */
  private buildBleacherLookup(
    allBleacherEvents: Tables<"BleacherEvents">[],
    currentEventUuid: string,
    currentBleacherUuids: string[],
  ): Record<string, string[]> {
    const lookup: Record<string, string[]> = {};
    for (const be of allBleacherEvents) {
      if (!be.event_uuid || !be.bleacher_uuid) continue;
      if (!lookup[be.event_uuid]) lookup[be.event_uuid] = [];
      lookup[be.event_uuid].push(be.bleacher_uuid);
    }
    // Always use the latest bleacher assignments for the event we just saved.
    lookup[currentEventUuid] = currentBleacherUuids;
    return lookup;
  }

  /**
   * Evaluates scheduling conflicts for a DB event row (not the currently-edited
   * CurrentEventState). Uses the pre-built bleacher lookup so we get the correct
   * up-to-date assignments, including any changes made to the current event.
   */
  private evaluateForDbEvent(
    other: Tables<"Events">,
    otherBleachers: string[],
    allEvents: Tables<"Events">[],
    bleacherLookup: Record<string, string[]>,
    currentEvent: CurrentEventState,
  ): AlertPayload[] {
    // Only booked events can have a scheduling conflict.
    if (other.event_status !== "booked") return [];

    const otherStart = new Date(other.setup_start ?? other.event_start);
    const otherEnd = new Date(other.teardown_end ?? other.event_end);

    for (const candidate of allEvents) {
      if (candidate.id === other.id) continue;

      // Use fresh state for the event we just saved instead of the stale DB row.
      const candidateStart =
        candidate.id === currentEvent.eventUuid
          ? new Date(currentEvent.setupStart ?? currentEvent.eventStart)
          : new Date(candidate.setup_start ?? candidate.event_start);
      const candidateEnd =
        candidate.id === currentEvent.eventUuid
          ? new Date(currentEvent.teardownEnd ?? currentEvent.eventEnd)
          : new Date(candidate.teardown_end ?? candidate.event_end);
      const candidateBleachers =
        candidate.id === currentEvent.eventUuid
          ? currentEvent.bleacherUuids
          : (bleacherLookup[candidate.id] ?? []);

      const sharesBleeacher = candidateBleachers.some((id) => otherBleachers.includes(id));
      if (!sharesBleeacher) continue;

      const candidateIsBooked =
        candidate.id === currentEvent.eventUuid
          ? currentEvent.selectedStatus === "booked"
          : candidate.event_status === "booked";
      if (!candidateIsBooked) continue;

      if (otherStart <= candidateEnd && candidateStart <= otherEnd) {
        return [
          {
            entity_uuid: other.id,
            entity_type: "event",
            title: this.title,
            message: "This event is overlapping with other events!",
            entity_description: other.event_name || null,
          },
        ];
      }
    }
    return [];
  }

  /**
   * Syncs scheduling conflict alerts for the saved event AND for every other
   * event that shares a bleacher with it (before or after the save).
   * This ensures both sides of a conflict are always up-to-date.
   *
   * Uses two strategies to find affected events so neither alone can miss one:
   *  1. Bleacher overlap — events that share bleachers with the current event
   *     (new assignments + any still visible in allBleacherEvents).
   *  2. Existing alert sweep — events that currently carry a "Scheduling Conflict"
   *     alert in the DB.  These MUST be re-evaluated regardless of bleacher data.
   */
  async syncAll(
    entityUuid: string,
    context: SchedulingConflictContext,
    saverUserUuid: string | null,
    ownerUserUuid: string | null,
    supabase: SupabaseClient<Database>,
  ): Promise<void> {
    const { event, allEvents, allBleacherEvents } = context;

    // Sync the current event first.
    const currentAlerts = this.evaluate(context);
    await syncAlertsForEntity(
      this.title,
      entityUuid,
      "event",
      currentAlerts,
      saverUserUuid,
      ownerUserUuid,
      supabase,
    );

    // Build bleacher lookup with fresh assignments for the current event.
    const bleacherLookup = this.buildBleacherLookup(
      allBleacherEvents,
      entityUuid,
      event.bleacherUuids,
    );

    // Strategy 1: bleachers the current event has now + had before saving.
    const previousBleachers = allBleacherEvents
      .filter((be) => be.event_uuid === entityUuid && be.bleacher_uuid)
      .map((be) => be.bleacher_uuid!);
    const allRelevantBleachers = new Set([...event.bleacherUuids, ...previousBleachers]);
    const bleacherOverlapIds = new Set(
      allEvents
        .filter((other) => other.id !== entityUuid)
        .filter((other) =>
          (bleacherLookup[other.id] ?? []).some((id) => allRelevantBleachers.has(id)),
        )
        .map((other) => other.id),
    );

    // Strategy 2: events that already have a "Scheduling Conflict" alert in the DB.
    const { data: alertRows } = await supabase
      .from("Alerts")
      .select("entity_uuid")
      .eq("title", this.title)
      .eq("entity_type", "event")
      .neq("entity_uuid", entityUuid);
    const existingAlertIds = new Set(
      (alertRows ?? []).map((r) => r.entity_uuid).filter((id): id is string => !!id),
    );

    // Union of both strategies.
    const affectedEventIds = new Set([...bleacherOverlapIds, ...existingAlertIds]);
    const affectedEvents = allEvents.filter((other) => affectedEventIds.has(other.id));

    for (const other of affectedEvents) {
      const otherBleachers = bleacherLookup[other.id] ?? [];
      const otherAlerts = this.evaluateForDbEvent(
        other,
        otherBleachers,
        allEvents,
        bleacherLookup,
        event,
      );
      await syncAlertsForEntity(
        this.title,
        other.id,
        "event",
        otherAlerts,
        saverUserUuid,
        other.created_by_user_uuid ?? null,
        supabase,
      );
    }
  }
}

export const schedulingConflicts = new SchedulingConflictsDefinition();
