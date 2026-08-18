import { db } from "@/components/providers/SystemProvider";
import { typedExecute, typedGetAll, expect } from "@/lib/powersync/typedQuery";
import { Database } from "../../../../database.types";

export type WorkTrackerLineItemType = Database["public"]["Enums"]["work_tracker_line_item_type"];

export const WORK_TRACKER_LINE_ITEM_TYPES: WorkTrackerLineItemType[] = [
  "hauling",
  "deadhead",
  "setup",
  "teardown",
  "maintenance",
  "per_diem",
  "custom",
];

export const WORK_TRACKER_LINE_ITEM_TYPE_LABELS: Record<WorkTrackerLineItemType, string> = {
  hauling: "Hauling",
  deadhead: "Deadhead",
  setup: "Setup",
  teardown: "Teardown",
  maintenance: "Maintenance",
  per_diem: "Per Diem",
  custom: "Custom",
};

/**
 * A line item as held in memory while the work tracker modal is open.
 * Not persisted until the work tracker itself is saved — see `syncWorkTrackerLineItems`.
 * `id` is client-generated for new rows (via crypto.randomUUID()) and reused as the
 * row's DB id on insert, same as `savedWorkTrackerUuid` in `saveWorkTracker`.
 */
export type DraftWorkTrackerLineItem = {
  id: string;
  type: WorkTrackerLineItemType;
  quantity: number;
  unitAmtCents: number;
  description: string | null;
};

type Row = {
  id: string;
  type: string | null;
  quantity: number | null;
  unit_amt_cents: number | null;
  description: string | null;
};

/**
 * One-time (non-reactive) read of a work tracker's existing line items, used to seed
 * the modal's local draft state when it opens.
 */
export async function fetchWorkTrackerLineItems(
  workTrackerUuid: string,
): Promise<DraftWorkTrackerLineItem[]> {
  const compiled = db
    .selectFrom("WorkTrackerLineItems")
    .select(["id", "type", "quantity", "unit_amt_cents", "description"])
    .where("work_tracker_uuid", "=", workTrackerUuid)
    .orderBy("created_at", "asc")
    .compile();

  const rows = await typedGetAll(compiled, expect<Row>());

  return rows.map((r) => ({
    id: r.id,
    type: (r.type ?? "custom") as WorkTrackerLineItemType,
    quantity: r.quantity ?? 0,
    unitAmtCents: r.unit_amt_cents ?? 0,
    description: r.description,
  }));
}

/**
 * Replace a work tracker's stored line items with the given draft set: delete
 * everything currently stored for it, then insert the current list. Called once,
 * as part of saving the work tracker — mirrors `syncPaymentInstallments`.
 */
export async function syncWorkTrackerLineItems(
  workTrackerUuid: string,
  items: DraftWorkTrackerLineItem[],
): Promise<void> {
  await typedExecute(
    db
      .deleteFrom("WorkTrackerLineItems")
      .where("work_tracker_uuid", "=", workTrackerUuid)
      .compile(),
  );

  for (const item of items) {
    await typedExecute(
      db
        .insertInto("WorkTrackerLineItems")
        .values({
          id: item.id,
          created_at: new Date().toISOString(),
          work_tracker_uuid: workTrackerUuid,
          type: item.type,
          quantity: item.quantity,
          unit_amt_cents: item.unitAmtCents,
          description: item.description,
        })
        .compile(),
    );
  }
}
