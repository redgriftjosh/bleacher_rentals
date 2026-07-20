"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, typedExecute, typedGetAll } from "@/lib/powersync/typedQuery";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../database.types";
import { AlertDefinition, AlertEntityType, AlertPayload } from "./types";

type AlertRow = {
  id: string;
  message: string | null;
  entity_description: string | null;
};

type IdRow = { id: string };

/**
 * Syncs alerts for a given entity+title against the local PowerSync DB.
 * Deletes stale alerts, updates changed descriptions, inserts new ones.
 * PowerSync replicates all changes up to Supabase automatically.
 */
export async function syncAlertsForEntity(
  title: string,
  entityUuid: string,
  entityType: AlertEntityType,
  alerts: AlertPayload[],
  recipientUuids: string[],
): Promise<void> {
  const myAlerts = alerts.filter((a) => a.title === title);

  let existing: AlertRow[];
  try {
    existing = await typedGetAll(
      db
        .selectFrom("Alerts as a")
        .select([
          "a.id as id",
          "a.message as message",
          "a.entity_description as entity_description",
        ])
        .where("a.entity_uuid", "=", entityUuid)
        .where("a.entity_type", "=", entityType)
        .where("a.title", "=", title)
        .compile(),
      expect<AlertRow>(),
    );
  } catch (err) {
    console.error(`[${title}] failed to fetch existing alerts`, err);
    return;
  }

  const existingMessages = new Set(existing.map((a) => a.message ?? ""));
  const currentMessages = new Set(myAlerts.map((a) => a.message));

  const toDelete = existing.filter((a) => !currentMessages.has(a.message ?? ""));
  const toInsert = myAlerts.filter((a) => !existingMessages.has(a.message));
  const toUpdate = myAlerts.filter((a) => {
    const match = existing.find((e) => e.message === a.message);
    return match && match.entity_description !== a.entity_description;
  });

  for (const alert of toDelete) {
    await typedExecute(db.deleteFrom("UserAlerts").where("alert_uuid", "=", alert.id).compile());
    await typedExecute(db.deleteFrom("Alerts").where("id", "=", alert.id).compile());
  }

  for (const alert of toUpdate) {
    const match = existing.find((e) => e.message === alert.message)!;
    await typedExecute(
      db
        .updateTable("Alerts")
        .set({ entity_description: alert.entity_description } as any)
        .where("id", "=", match.id)
        .compile(),
    );
  }

  const uniqueRecipients = [...new Set(recipientUuids.filter(Boolean))];
  for (const alert of toInsert) {
    const alertId = crypto.randomUUID();
    await typedExecute(
      db
        .insertInto("Alerts")
        .values({
          id: alertId,
          entity_uuid: entityUuid,
          entity_type: entityType,
          title: alert.title,
          message: alert.message,
          entity_description: alert.entity_description,
        } as any)
        .compile(),
    );
    for (const userUuid of uniqueRecipients) {
      await typedExecute(
        db
          .insertInto("UserAlerts")
          .values({
            id: crypto.randomUUID(),
            alert_uuid: alertId,
            user_uuid: userUuid,
          } as any)
          .compile(),
      );
    }
  }
}

/**
 * Deletes all alerts (and their UserAlerts) for a specific entity+title.
 */
export async function deleteAlertsForEntity(title: string, entityUuid: string): Promise<void> {
  let rows: IdRow[];
  try {
    rows = await typedGetAll(
      db
        .selectFrom("Alerts as a")
        .select(["a.id as id"])
        .where("a.entity_uuid", "=", entityUuid)
        .where("a.title", "=", title)
        .compile(),
      expect<IdRow>(),
    );
  } catch (err) {
    console.error(`[${title}] failed to fetch alerts for deletion`, err);
    return;
  }

  for (const row of rows) {
    await typedExecute(db.deleteFrom("UserAlerts").where("alert_uuid", "=", row.id).compile());
    await typedExecute(db.deleteFrom("Alerts").where("id", "=", row.id).compile());
  }
}

/**
 * Deletes every alert (and their UserAlerts) associated with an entity UUID
 * regardless of title.
 */
export async function deleteAllAlertsForEntity(entityUuid: string): Promise<void> {
  let rows: IdRow[];
  try {
    rows = await typedGetAll(
      db
        .selectFrom("Alerts as a")
        .select(["a.id as id"])
        .where("a.entity_uuid", "=", entityUuid)
        .compile(),
      expect<IdRow>(),
    );
  } catch (err) {
    console.error(`[deleteAllAlertsForEntity] failed to fetch alerts`, err);
    return;
  }

  for (const row of rows) {
    await typedExecute(db.deleteFrom("UserAlerts").where("alert_uuid", "=", row.id).compile());
    await typedExecute(db.deleteFrom("Alerts").where("id", "=", row.id).compile());
  }
}

/**
 * Evaluates a single AlertDefinition for a given entity and syncs the result
 * to the local PowerSync DB (which replicates to Supabase).
 *
 * The `supabase` client is still needed for `definition.evaluate()` and
 * `definition.recipients()` which query Supabase for evaluation logic.
 */
export async function syncAlert(
  definition: AlertDefinition,
  entityUuid: string,
  supabase?: SupabaseClient<Database>,
): Promise<void> {
  console.log(`[QUOTE_TRIAGE] syncAlert: evaluating "${definition.title}" for ${entityUuid}`);
  const result = await definition.evaluate(entityUuid, supabase);
  console.log(
    `[QUOTE_TRIAGE] syncAlert: "${definition.title}" result:`,
    result ? `message="${result.message}"` : "null (no alert)",
  );
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
  console.log(
    `[QUOTE_TRIAGE] syncAlert: "${definition.title}" alerts=${alerts.length}, recipients=${recipients.length}`,
    recipients,
  );
  await syncAlertsForEntity(
    definition.title,
    entityUuid,
    definition.entityType,
    alerts,
    recipients,
  );
}
