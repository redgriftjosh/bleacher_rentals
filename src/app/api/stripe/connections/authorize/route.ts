import {
  createStripeClient,
  getAppBaseUrl,
  getStripeConnectClientId,
  getStripeOAuthRedirectUri,
} from "@/features/stripe-integration/util";
import { requireAdmin } from "@/features/userAccess/logic/requireAdmin";
import { NextResponse } from "next/server";

/**
 * Starts Stripe Connect OAuth.
 *
 * No database row exists yet: we mint the connection id here and hand it to
 * Stripe as the `state` parameter. Stripe returns it on the callback, which is
 * where the row is actually inserted. This means an abandoned authorization
 * leaves NO placeholder row behind -- there is simply nothing to clean up.
 */
export async function GET() {
  try {
    await requireAdmin();

    // This becomes the connection's primary key once OAuth completes.
    const connectionId = crypto.randomUUID();

    const stripe = createStripeClient();

    const url = stripe.oauth.authorizeUrl({
      client_id: getStripeConnectClientId(),
      response_type: "code",
      redirect_uri: getStripeOAuthRedirectUri(),
      // read_write is required to create charges on the connected account.
      scope: "read_write",
      state: connectionId,
      // Show the SIGN IN screen, not "create an account" -- Stripe's own
      // guidance for platforms whose users already have Stripe accounts.
      stripe_landing: "login",
      // Force the account picker so a second company can be added without
      // signing out of Stripe first.
      always_prompt: true,
    });

    return NextResponse.redirect(url);
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Stripe authorize error:", error);

    const errorUrl = new URL("/stripe-connections", getAppBaseUrl());
    errorUrl.searchParams.set("error", error.message ?? "Failed to start Stripe authorization");
    return NextResponse.redirect(errorUrl);
  }
}
