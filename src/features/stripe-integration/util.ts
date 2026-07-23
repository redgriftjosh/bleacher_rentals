import Stripe from "stripe";

/**
 * Platform-level Stripe client.
 *
 * Every Connect call is made with the PLATFORM secret key. To act as a
 * connected account you pass `{ stripeAccount: "acct_..." }` as the request
 * options rather than swapping keys -- see `stripeForAccount` below.
 *
 * Constructed lazily (inside a function, not at module scope) so that importing
 * this module in a context without STRIPE_SECRET_KEY does not throw at import
 * time. This matches the existing pattern in
 * src/app/api/stripe/webhook/route.ts.
 */
export function createStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key);
}

/**
 * Request options that scope a Stripe API call to a connected account.
 *
 * Usage:
 *   const stripe = createStripeClient();
 *   await stripe.customers.list({}, stripeForAccount(connection.stripe_account_id));
 */
export function stripeForAccount(stripeAccountId: string): Stripe.RequestOptions {
  return { stripeAccount: stripeAccountId };
}

/**
 * The platform's Connect application id (`ca_...`).
 *
 * Found in the Stripe Dashboard under Settings -> Connect -> OAuth settings.
 * This is what identifies *us* to Stripe during the OAuth handshake, and it is
 * distinct from the secret key. The redirect URI registered alongside it must
 * exactly match the one we send, or Stripe rejects the authorize request.
 */
export function getStripeConnectClientId(): string {
  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "STRIPE_CONNECT_CLIENT_ID is not configured. Find it in the Stripe Dashboard under Settings > Connect > OAuth settings.",
    );
  }
  return clientId;
}

/** Absolute URL Stripe redirects back to after the user authorizes. */
export function getStripeOAuthRedirectUri(): string {
  return `${getAppBaseUrl()}/api/stripe/connections/callback`;
}

/**
 * Absolute base URL for building the OAuth redirect URI.
 *
 * Stripe requires an absolute URL that exactly matches the one registered in
 * the Connect settings, and the user is redirected off-site before coming
 * back, so a relative path will not do. Prefers an explicit env var, then
 * Vercel's deployment URL, then localhost for dev.
 */
export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
