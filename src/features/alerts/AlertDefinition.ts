import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../database.types";
import { AlertEntityType, AlertPayload } from "./types";

/**
 * Contract for all alert definitions.
 *
 * - `title`: unique string that scopes this definition's rows in the Alerts table.
 * - `evaluate()`: pure function — given context, returns the alerts that should exist.
 * - `sync()`: persist the current alert state to the DB for an entity.
 * - `delete()`: remove all of this definition's alerts for a deleted entity.
 *
 * Implementations own their own sync logic. Shared persistence helpers live in
 * `src/features/alerts/util/syncAlerts.ts`.
 */
export abstract class AlertDefinition<TContext> {
  abstract readonly title: string;

  abstract evaluate(context: TContext): AlertPayload[];

  abstract sync(
    entityUuid: string,
    entityType: AlertEntityType,
    alerts: AlertPayload[],
    saverUserUuid: string | null,
    ownerUserUuid: string | null,
    supabase: SupabaseClient<Database>,
  ): Promise<void>;

  abstract delete(entityUuid: string, supabase: SupabaseClient<Database>): Promise<void>;
}
