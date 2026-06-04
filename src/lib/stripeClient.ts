import { loadStripe, type Stripe } from "@stripe/stripe-js";

/**
 * Client-side Stripe.js loader (singleton promise).
 *
 * Required env var:
 *   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY – starts with pk_test_ or pk_live_
 */
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
}
