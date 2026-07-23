import { getStripeConnectionById, updateConnectionStatus } from "@/features/stripe-integration/db";
import { createStripeClient } from "@/features/stripe-integration/util";
import { requireAdmin } from "@/features/userAccess/logic/requireAdmin";
import { NextRequest, NextResponse } from "next/server";

/**
 * Refreshes one connection's status from Stripe.
 *
 * Fetches the account (`accounts.retrieve`) and writes the result back through
 * Supabase; that write syncs down to PowerSync, so the page updates itself --
 * this route returns only a small ack, it is not the source the UI renders
 * from. The status columns can only come from Stripe, which is why this stays
 * a server route.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const connectionId = req.nextUrl.searchParams.get("connectionId");
    if (!connectionId) {
      return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
    }

    const connection = await getStripeConnectionById(connectionId);
    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }
    if (!connection.stripeAccountId) {
      // Not connected yet (should not happen now that rows are only created on
      // successful OAuth, but stays correct if that ever changes).
      return NextResponse.json({ ok: true, connected: false });
    }

    const stripe = createStripeClient();

    try {
      const account = await stripe.accounts.retrieve(connection.stripeAccountId);
      await updateConnectionStatus(connectionId, {
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        businessName: account.business_profile?.name ?? account.email ?? connection.businessName,
      });
      return NextResponse.json({ ok: true, connected: true });
    } catch (stripeError: any) {
      // Deleted or disconnected account at Stripe. Report it without 500ing.
      return NextResponse.json({
        ok: false,
        error: stripeError.message ?? "Could not reach this Stripe account",
      });
    }
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Stripe health check error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
