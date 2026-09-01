import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";

/**
 * Toggles Events.is_qbo — the manual "this one is entered in QuickBooks Online"
 * flag on the Billing tab of a quote/booking.
 *
 * Local-first: written straight to the PowerSync DB (booleans live as 0/1
 * locally) so the checkbox flips instantly and syncs through the normal upload
 * queue. The change is also logged to EventChangeLog, because a bookkeeping
 * flag is only useful if you can see who set it and when.
 */
export async function setEventIsQbo(params: {
  eventId: string;
  isQbo: boolean;
  currentUserUuid: string | null;
}): Promise<void> {
  await typedExecute(
    db
      .updateTable("Events")
      .set({ is_qbo: params.isQbo ? 1 : 0 })
      .where("id", "=", params.eventId)
      .compile(),
  );

  await typedExecute(
    db
      .insertInto("EventChangeLog")
      .values({
        id: crypto.randomUUID(),
        event_uuid: params.eventId,
        changed_by_user_uuid: params.currentUserUuid,
        field_name: "is_qbo",
        prev_value: params.isQbo ? "No" : "Yes",
        next_value: params.isQbo ? "Yes" : "No",
        action_type: "update",
        changed_at: new Date().toISOString(),
      } as any)
      .compile(),
  );
}
