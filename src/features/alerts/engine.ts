import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../database.types";
import { AlertDefinition, AlertEntityType, AlertPayload } from "./types";

export async function syncAlertsForEntity(
  title: string,
  entityUuid: string,
  entityType: AlertEntityType,
  alerts: AlertPayload[],
  recipientUuids: string[],
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

    const uniqueRecipients = [...new Set(recipientUuids.filter(Boolean))];
    const userAlertRows = insertedAlerts.flatMap((alert) =>
      uniqueRecipients.map((user_uuid) => ({ alert_uuid: alert.id, user_uuid })),
    );

    if (userAlertRows.length > 0) {
      const { error: userAlertError } = await supabase.from("UserAlerts").insert(userAlertRows);
      if (userAlertError) {
        console.error(`[${title}] failed to insert UserAlerts`, userAlertError);
      }
    }
  }
}

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

export async function deleteAllAlertsForEntity(
  entityUuid: string,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { data: alerts } = await supabase
    .from("Alerts")
    .select("id")
    .eq("entity_uuid", entityUuid);

  const ids = (alerts ?? []).map((a) => a.id);
  if (ids.length === 0) return;

  await supabase.from("UserAlerts").delete().in("alert_uuid", ids);
  await supabase.from("Alerts").delete().in("id", ids);
}

export async function syncAlert(
  definition: AlertDefinition,
  entityUuid: string,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const result = await definition.evaluate(entityUuid, supabase);
  const alerts: AlertPayload[] = result
    ? [
        {
          entity_uuid: entityUuid,
          entity_type: definition.entityType,
          title: definition.title,
          message: result.message,
          entity_description: result.entityDescription,
        },
      ]
    : [];
  const recipients = result ? await definition.recipients(entityUuid, supabase) : [];
  await syncAlertsForEntity(
    definition.title,
    entityUuid,
    definition.entityType,
    alerts,
    recipients,
    supabase,
  );
}
