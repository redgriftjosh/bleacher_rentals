import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../database.types";

export type PriceEntry = {
  priceDurationUuid: string;
  eventTypeUuid: string;
  currency: "USD" | "CAD";
  priceCents: number;
};

export async function savePricesForType(
  bleacherTypeUuid: string,
  entries: PriceEntry[],
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { data: existing, error: fetchErr } = await supabase
    .from("Prices")
    .select("id, price_duration_uuid, event_type_uuid, currency, price_cents")
    .eq("bleacher_type_uuid", bleacherTypeUuid)
    .eq("deleted", false);

  if (fetchErr) throw new Error(fetchErr.message);

  const existingMap = new Map<string, { id: string; priceCents: number }>();
  for (const row of existing ?? []) {
    const key = `${row.price_duration_uuid}:${row.event_type_uuid}:${row.currency}`;
    existingMap.set(key, { id: row.id, priceCents: row.price_cents });
  }

  const toInsert: Array<{
    bleacher_type_uuid: string;
    price_duration_uuid: string;
    event_type_uuid: string;
    currency: "USD" | "CAD";
    price_cents: number;
  }> = [];
  const toUpdate: Array<{ id: string; price_cents: number }> = [];
  const matchedKeys = new Set<string>();

  for (const entry of entries) {
    if (entry.priceCents <= 0) continue;
    const key = `${entry.priceDurationUuid}:${entry.eventTypeUuid}:${entry.currency}`;
    matchedKeys.add(key);
    const ex = existingMap.get(key);
    if (ex) {
      if (ex.priceCents !== entry.priceCents) {
        toUpdate.push({ id: ex.id, price_cents: entry.priceCents });
      }
    } else {
      toInsert.push({
        bleacher_type_uuid: bleacherTypeUuid,
        price_duration_uuid: entry.priceDurationUuid,
        event_type_uuid: entry.eventTypeUuid,
        currency: entry.currency,
        price_cents: entry.priceCents,
      });
    }
  }

  const toSoftDelete = [...existingMap.entries()]
    .filter(([key]) => !matchedKeys.has(key))
    .map(([, val]) => val.id);

  if (toInsert.length > 0) {
    const { error } = await supabase.from("Prices").insert(toInsert);
    if (error) throw new Error(error.message);
  }

  for (const upd of toUpdate) {
    const { error } = await supabase
      .from("Prices")
      .update({ price_cents: upd.price_cents })
      .eq("id", upd.id);
    if (error) throw new Error(error.message);
  }

  if (toSoftDelete.length > 0) {
    const { error } = await supabase
      .from("Prices")
      .update({ deleted: true })
      .in("id", toSoftDelete);
    if (error) throw new Error(error.message);
  }
}
