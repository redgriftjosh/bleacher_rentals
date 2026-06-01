import Stripe from "stripe";

/**
 * Server-side Stripe instance (singleton).
 *
 * Required env var:
 *   STRIPE_SECRET_KEY – starts with sk_test_ (test) or sk_live_ (production)
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});
