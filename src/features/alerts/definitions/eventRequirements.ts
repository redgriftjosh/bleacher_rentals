import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../database.types";
import { AlertDefinition, AlertPayload, InMemoryAlertContext } from "../types";
import { eventEntityDescription } from "../util/eventEntityDescription";

function checkRequirements(
  lenient: boolean,
  seats: number | null,
  sevenRow: number | null,
  tenRow: number | null,
  fifteenRow: number | null,
  assignedBleachers: { bleacher_rows: number; bleacher_seats: number }[],
): string | null {
  if (lenient) {
    if (!seats) return null;
    const totalAssigned = assignedBleachers.reduce((sum, b) => sum + b.bleacher_seats, 0);
    if (totalAssigned !== seats) {
      return `Seat mismatch: ${seats} required, ${totalAssigned} assigned.`;
    }
    return null;
  }

  const sevenRowRequired = sevenRow ?? 0;
  const tenRowRequired = tenRow ?? 0;
  const fifteenRowRequired = fifteenRow ?? 0;

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
    return `Bleacher mismatch — ${mismatches.join(", ")}.`;
  }
  return null;
}

export const eventRequirements: AlertDefinition = {
  title: "Event Requirements Not Met",
  entityType: "event",

  async evaluate(eventUuid, supabase) {
    const { data: event } = await supabase
      .from("Events")
      .select("id, event_name, lenient, total_seats, seven_row, ten_row, fifteen_row, address_uuid")
      .eq("id", eventUuid)
      .single();

    if (!event) return null;

    const { data: bleacherEvents } = await supabase
      .from("BleacherEvents")
      .select("bleacher_uuid, Bleachers!inner(bleacher_rows, bleacher_seats)")
      .eq("event_uuid", eventUuid);

    const assignedBleachers = (bleacherEvents ?? [])
      .map((be) => (be.Bleachers && !Array.isArray(be.Bleachers) ? be.Bleachers : null))
      .filter(Boolean) as { bleacher_rows: number; bleacher_seats: number }[];

    const message = checkRequirements(
      event.lenient ?? false,
      event.total_seats,
      event.seven_row,
      event.ten_row,
      event.fifteen_row,
      assignedBleachers,
    );

    if (!message) return null;

    const { data: addr } = event.address_uuid
      ? await supabase.from("Addresses").select("street").eq("id", event.address_uuid).single()
      : { data: null };
    const desc = [event.event_name, addr?.street].filter(Boolean).join(" — ") || null;

    return { message, entityDescription: desc };
  },

  evaluateInMemory({ event, allBleachers }: InMemoryAlertContext): AlertPayload[] {
    const assignedBleachers = allBleachers
      .filter((b) => event.bleacherUuids.includes(b.id))
      .map((b) => ({ bleacher_rows: b.bleacher_rows, bleacher_seats: b.bleacher_seats }));

    const message = checkRequirements(
      event.lenient,
      event.seats,
      event.sevenRow,
      event.tenRow,
      event.fifteenRow,
      assignedBleachers,
    );

    if (!message) return [];

    return [
      {
        entity_uuid: event.eventUuid,
        entity_type: "event",
        title: "Event Requirements Not Met",
        message,
        entity_description: eventEntityDescription(event),
      },
    ];
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
