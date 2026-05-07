import { SupabaseClient } from "@supabase/supabase-js";
import { AlertDefinition } from "../AlertDefinition";
import { AlertEntityType, AlertPayload } from "../types";
import { CurrentEventState } from "@/features/eventConfiguration/state/useCurrentEventStore";
import { Database, Tables } from "../../../../database.types";
import { eventEntityDescription } from "../util/eventEntityDescription";
import { syncAlertsForEntity, deleteAlertsForEntity } from "../util/syncAlerts";

type EventRequirementsContext = {
  event: CurrentEventState;
  bleachers: Tables<"Bleachers">[];
};

/**
 * Fires when the bleachers assigned to an event don't satisfy the event's requirements.
 *
 * Two modes:
 *  - **Lenient** (`event.lenient = true`): the event specifies a total seat count.
 *    An alert is raised if the sum of seats across all assigned bleachers doesn't
 *    exactly equal `event.seats`.
 *
 *  - **Strict** (`event.lenient = false`): the event specifies exact counts of
 *    7-row, 10-row, and 15-row bleachers. An alert is raised for each row-type
 *    whose assigned count doesn't match the required count.
 *
 * One alert is produced per mismatch (lenient = at most one; strict = up to three).
 * The alert is scoped to the event and links back to it from the alerts dropdown.
 */
class EventRequirementsDefinition extends AlertDefinition<EventRequirementsContext> {
  readonly title = "Event Requirements Not Met";

  evaluate({ event, bleachers }: EventRequirementsContext): AlertPayload[] {
    const alerts: AlertPayload[] = [];
    const assignedBleachers = bleachers.filter((b) => event.bleacherUuids.includes(b.id));

    const entityDescription = eventEntityDescription(event);

    const makeAlert = (message: string): AlertPayload => ({
      entity_uuid: event.eventUuid,
      entity_type: "event",
      title: this.title,
      message,
      entity_description: entityDescription,
    });

    if (event.lenient) {
      if (!event.seats) return alerts;
      const totalAssignedSeats = assignedBleachers.reduce((sum, b) => sum + b.bleacher_seats, 0);
      if (totalAssignedSeats !== event.seats) {
        alerts.push(
          makeAlert(`Seat mismatch: ${event.seats} required, ${totalAssignedSeats} assigned.`),
        );
      }
    } else {
      const sevenRowRequired = event.sevenRow ?? 0;
      const tenRowRequired = event.tenRow ?? 0;
      const fifteenRowRequired = event.fifteenRow ?? 0;

      const sevenRowAssigned = assignedBleachers.filter((b) => b.bleacher_rows === 7).length;
      const tenRowAssigned = assignedBleachers.filter((b) => b.bleacher_rows === 10).length;
      const fifteenRowAssigned = assignedBleachers.filter((b) => b.bleacher_rows === 15).length;

      const mismatches: string[] = [];
      if (sevenRowAssigned !== sevenRowRequired)
        mismatches.push(`7-row: ${sevenRowRequired} needed, ${sevenRowAssigned} assigned`);
      if (tenRowAssigned !== tenRowRequired)
        mismatches.push(`10-row: ${tenRowRequired} needed, ${tenRowAssigned} assigned`);
      if (fifteenRowAssigned !== fifteenRowRequired)
        mismatches.push(`15-row: ${fifteenRowRequired} needed, ${fifteenRowAssigned} assigned`);

      if (mismatches.length > 0) {
        alerts.push(makeAlert(`Bleacher mismatch — ${mismatches.join(", ")}.`));
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
}

export const eventRequirements = new EventRequirementsDefinition();
