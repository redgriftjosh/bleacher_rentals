import { createServiceRoleClient } from "@/utils/supabase/server";
import type { StripeConnection } from "./types";

/**
 * Server-side data access for Stripe connections.
 *
 * This module holds ONLY the writes that must run on the server: the OAuth
 * callback and the health check. Both hold the Stripe secret and run inside
 * route handlers that have no browser PowerSync database, so they persist
 * through the Supabase service-role client. Those writes then sync DOWN to
 * PowerSync, where the page reads them reactively.
 *
 * Everything the admin initiates from the UI (listing, soft delete, restore)
 * lives in the PowerSync layer (stripeConnectionsDb.ts), not here.
 */

const COLUMNS =
  "id, created_at, deleted_at, stripe_account_id, details_submitted, charges_enabled, payouts_enabled, livemode, stripe_business_name";

type Row = {
  id: string;
  created_at: string | null;
  deleted_at: string | null;
  stripe_account_id: string | null;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  livemode: boolean;
  stripe_business_name: string | null;
};

function toConnection(row: Row): StripeConnection {
  return {
    id: row.id,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    stripeAccountId: row.stripe_account_id,
    detailsSubmitted: row.details_submitted,
    chargesEnabled: row.charges_enabled,
    payoutsEnabled: row.payouts_enabled,
    livemode: row.livemode,
    businessName: row.stripe_business_name,
  };
}

export async function getStripeConnectionById(id: string): Promise<StripeConnection | null> {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from("StripeConnections")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch Stripe connection:", error);
    throw new Error(`Failed to fetch Stripe connection: ${error.message}`);
  }

  return data ? toConnection(data as Row) : null;
}

/**
 * Returns the live (non-deleted) connection for a Stripe account, if one
 * exists. Used by the callback to enforce "one active connection per account"
 * -- the partial unique index enforces it at the DB level too, but checking
 * here lets us return a friendly message instead of a constraint error.
 */
export async function getActiveConnectionByAccountId(
  stripeAccountId: string,
): Promise<StripeConnection | null> {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from("StripeConnections")
    .select(COLUMNS)
    .eq("stripe_account_id", stripeAccountId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("Failed to look up Stripe connection by account:", error);
    throw new Error(`Failed to look up Stripe connection: ${error.message}`);
  }

  return data ? toConnection(data as Row) : null;
}

type ConnectedAccountFields = {
  stripeAccountId: string;
  livemode: boolean;
  businessName: string | null;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
};

/**
 * Inserts the connection row after OAuth completes.
 *
 * The id was generated when we started the OAuth flow and round-tripped
 * through Stripe as the `state` parameter, so we insert with a known id rather
 * than letting the DB default one. If the client's own view of this row ever
 * syncs up (it never creates one today, but this keeps us safe), the shared id
 * means BackendConnector upserts rather than duplicating.
 */
export async function insertConnectedAccount(
  id: string,
  fields: ConnectedAccountFields,
): Promise<void> {
  const supabase = await createServiceRoleClient();

  const { error } = await supabase.from("StripeConnections").insert({
    id,
    stripe_account_id: fields.stripeAccountId,
    livemode: fields.livemode,
    stripe_business_name: fields.businessName,
    details_submitted: fields.detailsSubmitted,
    charges_enabled: fields.chargesEnabled,
    payouts_enabled: fields.payoutsEnabled,
  });

  if (error) {
    console.error("Failed to insert Stripe connection:", error);
    throw new Error(`Failed to insert Stripe connection: ${error.message}`);
  }
}

/**
 * Writes back the account state fetched from Stripe. Shared by the callback
 * (initial load) and the health route (manual refresh).
 */
export async function updateConnectionStatus(
  id: string,
  status: {
    detailsSubmitted: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    businessName: string | null;
  },
): Promise<void> {
  const supabase = await createServiceRoleClient();

  const { error } = await supabase
    .from("StripeConnections")
    .update({
      details_submitted: status.detailsSubmitted,
      charges_enabled: status.chargesEnabled,
      payouts_enabled: status.payoutsEnabled,
      stripe_business_name: status.businessName,
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to update Stripe connection status:", error);
    throw new Error(`Failed to update Stripe connection status: ${error.message}`);
  }
}
