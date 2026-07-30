import {
  getActiveConnectionByAccountId,
  insertConnectedAccount,
} from "@/features/stripe-integration/db";
import { createStripeClient, getAppBaseUrl } from "@/features/stripe-integration/util";
import { requireAdmin } from "@/features/userAccess/logic/requireAdmin";
import { NextRequest, NextResponse } from "next/server";

/**
 * Where Stripe sends the admin back after they pick an account.
 *
 * Exchanges the one-time `code` for the connected account id, then inserts the
 * connection row (id = the `state` we generated in /authorize). The insert is
 * server-side because this handler holds the Stripe secret and has no browser
 * PowerSync DB; the new row syncs down to the client, where the page shows it
 * reactively.
 *
 * Not in the public route list in src/proxy.ts, so Clerk still requires a
 * session; requireAdmin re-checks the role on top of that.
 */
export async function GET(req: NextRequest) {
  const baseUrl = getAppBaseUrl();

  const redirectWithError = (message: string) => {
    const errorUrl = new URL("/stripe-connections", baseUrl);
    errorUrl.searchParams.set("error", message);
    return NextResponse.redirect(errorUrl);
  };

  try {
    await requireAdmin();

    // The admin clicked "cancel" on Stripe's screen.
    const denied = req.nextUrl.searchParams.get("error");
    if (denied) {
      const description =
        req.nextUrl.searchParams.get("error_description") ?? "Authorization was cancelled";
      return redirectWithError(description);
    }

    const code = req.nextUrl.searchParams.get("code");
    const connectionId = req.nextUrl.searchParams.get("state");
    if (!code) return redirectWithError("Stripe did not return an authorization code");
    if (!connectionId) return redirectWithError("Missing connection state");

    const stripe = createStripeClient();

    const token = await stripe.oauth.token({ grant_type: "authorization_code", code });
    const stripeAccountId = token.stripe_user_id;
    if (!stripeAccountId) return redirectWithError("Stripe did not return an account id");

    // One active connection per account. After a soft delete the old row has a
    // deleted_at, so it is not "active" and reconnecting creates a fresh row.
    const existing = await getActiveConnectionByAccountId(stripeAccountId);
    if (existing) {
      return redirectWithError("This Stripe account is already connected.");
    }

    // Pull the account's current state so the row lands with real status
    // instead of defaults. Non-fatal if it fails -- the row is still created
    // and the page's health check will fill it in.
    let details = false;
    let charges = false;
    let payouts = false;
    let businessName: string | null = null;
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId);
      details = account.details_submitted;
      charges = account.charges_enabled;
      payouts = account.payouts_enabled;
      businessName = account.business_profile?.name ?? account.email ?? null;
    } catch (statusError) {
      console.error("Failed to load Stripe account status after connect:", statusError);
    }

    await insertConnectedAccount(connectionId, {
      stripeAccountId,
      // Reported by Stripe rather than inferred from our key prefix, so it is
      // accurate even if the platform key is rotated.
      livemode: token.livemode ?? false,
      businessName,
      detailsSubmitted: details,
      chargesEnabled: charges,
      payoutsEnabled: payouts,
    });

    return NextResponse.redirect(
      new URL(`/stripe-connections?connected=${encodeURIComponent(connectionId)}`, baseUrl),
    );
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Stripe callback error:", error);
    return redirectWithError(error.message ?? "Failed to connect Stripe account");
  }
}
