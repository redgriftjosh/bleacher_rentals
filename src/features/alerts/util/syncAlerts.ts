import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../database.types";
import { AlertEntityType, AlertPayload } from "../types";

/**
 * Diffs the given alerts (filtered to `title`) against what currently exists in
 * the DB for the entity, then inserts, updates, or deletes rows to make them match.
 * Creates UserAlerts rows for saverUserUuid and ownerUserUuid on any newly inserted alerts.
 *
 * Shared by all AlertDefinition implementations — import this instead of duplicating.
 */
export async function syncAlertsForEntity(
  title: string,
  entityUuid: string,
  entityType: AlertEntityType,
  alerts: AlertPayload[],
  saverUserUuid: string | null,
  ownerUserUuid: string | null,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const myAlerts = alerts.filter((a) => a.title === title);

  const { data: existingAlerts, error: fetchError } = await supabase
    .from("Alerts")
    .select("id, message, entity_description")
    .eq("entity_uuid", entityUuid)
    .eq("entity_type", entityType)
    .eq("title", title);

  if (fetchError) {
    console.error(`[${title}] failed to fetch existing alerts`, fetchError);
    return;
  }

  const existing = existingAlerts ?? [];
  const existingMessages = new Set(existing.map((a) => a.message ?? ""));
  const currentMessages = new Set(myAlerts.map((a) => a.message));

  const toDelete = existing.filter((a) => !currentMessages.has(a.message ?? ""));
  const toInsert = myAlerts.filter((a) => !existingMessages.has(a.message));
  const toUpdate = myAlerts.filter((a) => {
    const match = existing.find((e) => e.message === a.message);
    return match && match.entity_description !== a.entity_description;
  });

  if (toDelete.length > 0) {
    const ids = toDelete.map((a) => a.id);
    await supabase.from("UserAlerts").delete().in("alert_uuid", ids);
    await supabase.from("Alerts").delete().in("id", ids);
  }

  for (const alert of toUpdate) {
    const match = existing.find((e) => e.message === alert.message)!;
    const { error } = await supabase
      .from("Alerts")
      .update({ entity_description: alert.entity_description })
      .eq("id", match.id);
    if (error) {
      console.error(`[${title}] failed to update entity_description`, error);
    }
  }

  const userUuids = [...new Set([saverUserUuid, ownerUserUuid].filter(Boolean) as string[])];

  if (toInsert.length > 0) {
    const { data: insertedAlerts, error: insertError } = await supabase
      .from("Alerts")
      .insert(
        toInsert.map((alert) => ({
          entity_uuid: entityUuid,
          entity_type: entityType,
          title: alert.title,
          message: alert.message,
          entity_description: alert.entity_description,
        })),
      )
      .select("id");

    if (insertError || !insertedAlerts) {
      console.error(`[${title}] failed to insert alerts`, insertError);
      return;
    }

    const userAlertRows = insertedAlerts.flatMap((alert) =>
      userUuids.map((user_uuid) => ({ alert_uuid: alert.id, user_uuid })),
    );

    if (userAlertRows.length > 0) {
      const { error: userAlertError } = await supabase.from("UserAlerts").insert(userAlertRows);
      if (userAlertError) {
        console.error(`[${title}] failed to insert UserAlerts`, userAlertError);
      }
    }
  }

  // For alerts that already existed, ensure every relevant user has a UserAlerts row.
  // This handles cron re-runs and cases where UserAlerts were never created.
  if (userUuids.length > 0 && existing.length > 0) {
    const keptAlertIds = existing
      .filter((a) => currentMessages.has(a.message ?? ""))
      .map((a) => a.id);

    if (keptAlertIds.length > 0) {
      const { data: existingUserAlerts } = await supabase
        .from("UserAlerts")
        .select("alert_uuid, user_uuid")
        .in("alert_uuid", keptAlertIds);

      const existingPairs = new Set(
        (existingUserAlerts ?? []).map((r) => `${r.alert_uuid}:${r.user_uuid}`),
      );

      const missingRows = keptAlertIds.flatMap((alertId) =>
        userUuids
          .filter((user_uuid) => !existingPairs.has(`${alertId}:${user_uuid}`))
          .map((user_uuid) => ({ alert_uuid: alertId, user_uuid })),
      );

      if (missingRows.length > 0) {
        const { error: backfillError } = await supabase.from("UserAlerts").insert(missingRows);
        if (backfillError) {
          console.error(`[${title}] failed to backfill UserAlerts`, backfillError);
        }
      }
    }
  }
}

/**
 * Deletes all alerts (and their UserAlerts) scoped to `title` for the given entity.
 * Call when the entity itself is deleted.
 *
 * Shared by all AlertDefinition implementations — import this instead of duplicating.
 */
export async function deleteAlertsForEntity(
  title: string,
  entityUuid: string,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { data: alerts, error: fetchError } = await supabase
    .from("Alerts")
    .select("id")
    .eq("entity_uuid", entityUuid)
    .eq("title", title);

  if (fetchError) {
    console.error(`[${title}] failed to fetch alerts for deletion`, fetchError);
    return;
  }

  const ids = (alerts ?? []).map((a) => a.id);
  if (ids.length === 0) return;

  await supabase.from("UserAlerts").delete().in("alert_uuid", ids);
  await supabase.from("Alerts").delete().in("id", ids);
}
