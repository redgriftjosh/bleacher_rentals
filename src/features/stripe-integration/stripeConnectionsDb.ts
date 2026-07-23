import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";

/**
 * Local-first (PowerSync) data access for Stripe connections.
 *
 * These are the writes the admin performs from the UI. They go to the local
 * PowerSync DB and are uploaded to Supabase by the BackendConnector, so they
 * work offline and reflect in the reactive list immediately -- the same
 * pattern as storageLocationsDb.ts.
 *
 * There is intentionally no create or hard-delete here: connections are only
 * ever created server-side by the OAuth callback, and rows are never removed,
 * only soft-deleted so they can be restored.
 */

/**
 * Raw row shape as it comes out of the local PowerSync store. Booleans are
 * SQLite integers (0/1); callers above the hook get the mapped `StripeConnection`
 * type instead.
 */
export type StripeConnectionRow = {
  id: string;
  created_at: string | null;
  deleted_at: string | null;
  stripe_account_id: string | null;
  details_submitted: number | null;
  charges_enabled: number | null;
  payouts_enabled: number | null;
  livemode: number | null;
  stripe_business_name: string | null;
};

/**
 * Builds the reactive query for connections, filtered by deleted state.
 *
 * `deleted_at is null`  -> active connections (the normal view)
 * `deleted_at is not null` -> the recycle bin, so admins can restore.
 */
export function buildStripeConnectionsQuery(showDeleted: boolean) {
  const base = db
    .selectFrom("StripeConnections as sc")
    .select([
      "sc.id as id",
      "sc.created_at as created_at",
      "sc.deleted_at as deleted_at",
      "sc.stripe_account_id as stripe_account_id",
      "sc.details_submitted as details_submitted",
      "sc.charges_enabled as charges_enabled",
      "sc.payouts_enabled as payouts_enabled",
      "sc.livemode as livemode",
      "sc.stripe_business_name as stripe_business_name",
    ])
    .orderBy("sc.created_at", "asc");

  return (
    showDeleted
      ? base.where("sc.deleted_at", "is not", null)
      : base.where("sc.deleted_at", "is", null)
  ).compile();
}

/**
 * Soft delete: hides the connection from the active list while keeping the row
 * (and its Stripe link) so it can be restored. Deliberately does NOT revoke
 * access at Stripe -- a soft delete is recoverable, and revoking would force a
 * fresh OAuth to bring it back.
 */
export async function softDeleteStripeConnection(id: string): Promise<void> {
  await typedExecute(
    db
      .updateTable("StripeConnections")
      .set({ deleted_at: new Date().toISOString() } as any)
      .where("id", "=", id)
      .compile(),
  );
}

/** Restore a soft-deleted connection back into the active list. */
export async function restoreStripeConnection(id: string): Promise<void> {
  await typedExecute(
    db
      .updateTable("StripeConnections")
      .set({ deleted_at: null } as any)
      .where("id", "=", id)
      .compile(),
  );
}
