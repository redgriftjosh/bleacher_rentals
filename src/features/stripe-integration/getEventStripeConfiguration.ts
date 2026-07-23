import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../database.types";

/**
 * Resolves which connected Stripe account an event's payments should route to.
 *
 * Chain: Event -> SalesOffices (sales_office_uuid) -> StripeConnections
 * (stripe_connection_uuid). The sales office is the "franchise location" a quote
 * comes from, and each office owns one Stripe account, so a payment for an event
 * is charged on that office's connected account rather than the platform account.
 *
 * Returns a discriminated result so the caller can map each failure to the right
 * HTTP status and show a specific message. Every "not ready" case is 422: the
 * request is well-formed, the office just isn't fully configured yet.
 */

export type EventStripeConfig = {
  /** Connected account id (acct_...) to create the Checkout session on. */
  stripeAccountId: string;
  /** The StripeConnections row id, for logging / webhook correlation. */
  connectionId: string;
};

export type EventStripeConfigResult =
  | { ok: true; config: EventStripeConfig }
  | { ok: false; status: number; error: string };

export async function getEventStripeConfiguration(
  supabase: SupabaseClient<Database>,
  eventId: string,
): Promise<EventStripeConfigResult> {
  const { data: event } = await supabase
    .from("Events")
    .select("sales_office_uuid")
    .eq("id", eventId)
    .single();

  if (!event) {
    return { ok: false, status: 404, error: "Event not found." };
  }
  if (!event.sales_office_uuid) {
    return {
      ok: false,
      status: 422,
      error: "This event has no sales office, so no Stripe account is set up for it.",
    };
  }

  const { data: office } = await supabase
    .from("SalesOffices")
    .select("stripe_connection_uuid")
    .eq("id", event.sales_office_uuid)
    .single();

  if (!office) {
    return { ok: false, status: 422, error: "The event's sales office could not be found." };
  }
  if (!office.stripe_connection_uuid) {
    return {
      ok: false,
      status: 422,
      error: "The sales office for this event has no Stripe account connected.",
    };
  }

  const { data: connection } = await supabase
    .from("StripeConnections")
    .select("id, stripe_account_id, deleted_at, charges_enabled")
    .eq("id", office.stripe_connection_uuid)
    .single();

  if (!connection) {
    return {
      ok: false,
      status: 422,
      error: "The Stripe connection for this office no longer exists.",
    };
  }
  if (connection.deleted_at) {
    return {
      ok: false,
      status: 422,
      error: "The Stripe connection for this office has been removed.",
    };
  }
  if (!connection.stripe_account_id || !connection.charges_enabled) {
    return {
      ok: false,
      status: 422,
      error: "The Stripe account for this office isn't ready to accept payments yet.",
    };
  }

  return {
    ok: true,
    config: { stripeAccountId: connection.stripe_account_id, connectionId: connection.id },
  };
}
