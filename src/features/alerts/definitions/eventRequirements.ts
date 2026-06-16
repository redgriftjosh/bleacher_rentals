import { AlertDefinition, AlertPayload, InMemoryAlertContext } from "../types";
import { eventEntityDescription } from "../util/eventEntityDescription";

const TITLE = "Event Requirements Not Met";

export const eventRequirements: AlertDefinition = {
  title: TITLE,
  entityType: "event",

  async evaluate(eventUuid, supabase) {
    const { data: event } = await supabase
      .from("Events")
      .select(
        "id, event_name, total_seats, seven_row, ten_row, fifteen_row, lenient, address_uuid, Addresses(street)",
      )
      .eq("id", eventUuid)
      .single();

    if (!event) return null;

    const { data: bleacherEvents } = await supabase
      .from("BleacherEvents")
      .select("bleacher_uuid, Bleachers(id, bleacher_seats, bleacher_rows, bleacher_type_uuid)")
      .eq("event_uuid", eventUuid);

    if (!bleacherEvents) return null;

    const assignedBleachers = bleacherEvents
      .map((be) => be.Bleachers)
      .filter((b): b is NonNullable<typeof b> & object => b !== null && !Array.isArray(b)) as {
      id: string;
      bleacher_seats: number;
      bleacher_rows: number;
      bleacher_type_uuid: string | null;
    }[];

    const address = event.Addresses && !Array.isArray(event.Addresses) ? event.Addresses : null;
    const entityDescription =
      [event.event_name, address?.street].filter(Boolean).join(" — ") || null;

    let message: string | null = null;

    if (event.lenient) {
      if (!event.total_seats) return null;
      const totalAssignedSeats = assignedBleachers.reduce((sum, b) => sum + b.bleacher_seats, 0);
      if (totalAssignedSeats !== event.total_seats) {
        message = `Seat mismatch: ${event.total_seats} required, ${totalAssignedSeats} assigned.`;
      }
    } else {
      const { data: lineItems } = await supabase
        .from("EventLineItems")
        .select("bleacher_type_uuid, quantity, BleacherTypes(name)")
        .eq("event_uuid", eventUuid)
        .eq("deleted", false);

      if (lineItems && lineItems.length > 0) {
        const mismatches: string[] = [];
        for (const item of lineItems) {
          if (!item.bleacher_type_uuid || !item.quantity) continue;
          const assigned = assignedBleachers.filter(
            (b) => b.bleacher_type_uuid === item.bleacher_type_uuid,
          ).length;
          if (assigned !== item.quantity) {
            const bt = item.BleacherTypes;
            const name = bt && !Array.isArray(bt) ? bt.name : "Unknown";
            mismatches.push(`${name}: ${item.quantity} needed, ${assigned} assigned`);
          }
        }
        if (mismatches.length > 0) {
          message = `Bleacher mismatch — ${mismatches.join(", ")}.`;
        }
      } else {
        // Legacy fallback
        const sevenRowRequired = event.seven_row ?? 0;
        const tenRowRequired = event.ten_row ?? 0;
        const fifteenRowRequired = event.fifteen_row ?? 0;

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
          message = `Bleacher mismatch — ${mismatches.join(", ")}.`;
        }
      }
    }

    if (!message) return null;
    return { message, entityDescription };
  },

  evaluateInMemory({ event, allBleachers }: InMemoryAlertContext): AlertPayload[] {
    const alerts: AlertPayload[] = [];
    const assignedBleachers = allBleachers.filter((b) => event.bleacherUuids.includes(b.id));
    const entityDescription = eventEntityDescription(event);

    const makeAlert = (message: string): AlertPayload => ({
      entity_uuid: event.eventUuid,
      entity_type: "event",
      title: TITLE,
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
      if (event.bleacherRequirements && event.bleacherRequirements.length > 0) {
        const mismatches: string[] = [];
        for (const req of event.bleacherRequirements) {
          const assigned = assignedBleachers.filter(
            (b) => b.bleacher_type_uuid === req.bleacherTypeUuid,
          ).length;
          if (assigned !== req.quantity) {
            mismatches.push(`Type: ${req.quantity} needed, ${assigned} assigned`);
          }
        }
        if (mismatches.length > 0) {
          alerts.push(makeAlert(`Bleacher mismatch — ${mismatches.join(", ")}.`));
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
    }

    return alerts;
  },

  async recipients(eventUuid, supabase) {
    const { data } = await supabase
      .from("Events")
      .select("created_by_user_uuid")
      .eq("id", eventUuid)
      .single();
    return data?.created_by_user_uuid ? [data.created_by_user_uuid] : [];
  },
};
