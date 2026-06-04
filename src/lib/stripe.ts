import Stripe from "stripe";

/**
 * Server-side Stripe instance (lazy singleton).
 *
 * Required env var:
 *   STRIPE_SECRET_KEY – starts with sk_test_ (test) or sk_live_ (production)
 *
 * Lazy-initialized to avoid crashing at build time when the env var
 * isn't available (Next.js evaluates route modules during `next build`).
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(key, { typescript: true });
  }
  return _stripe;
}
