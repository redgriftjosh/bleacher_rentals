import { db } from "@/components/providers/SystemProvider";
import { expect, typedGetAll } from "@/lib/powersync/typedQuery";
import { loadEventForModal } from "@/features/eventConfiguration/functions/loadEventForModal";

type BleacherEventRow = {
  event_uuid: string | null;
};

export async function loadBleacherEventForModal(bleacherEventUuid: string): Promise<void> {
  const query = db
    .selectFrom("BleacherEvents")
    .select(["event_uuid"])
    .where("id", "=", bleacherEventUuid)
    .compile();

  const rows = await typedGetAll(query, expect<BleacherEventRow>());
  const eventUuid = rows[0]?.event_uuid;

  if (eventUuid) {
    await loadEventForModal(eventUuid);
  }
}
